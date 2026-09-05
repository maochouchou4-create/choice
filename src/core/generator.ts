import { substituteParams, this_chid } from '@sillytavern/script';
import { getStCharacter } from '@/core/st-character';
import toastr from 'toastr';
import { getWorldInfoPrompt, selected_world_info } from '@sillytavern/scripts/world-info';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { power_user } from '@sillytavern/scripts/power-user';
import { parseOptions, resolveCount } from '@/core/options-parse';
import { resolvePool } from '@/core/pool-resolver';
import { callDeepSeekWithRetry, type ChatMsg } from '@/core/api-client';
import { DEFAULT_MASTER_POOL } from '@/core/default-pool';
import { useChatSettingsStore } from '@/store/chat-settings';
import { useGlobalSettingsStore } from '@/store/global-settings';
import type { ChoiceGeneration } from '@/core/options-store';
import type { PromptModule, WorldInfoGlobalSettings } from '@/type/settings';
import { DEFAULT_MODULES } from '@/type/settings';

export type GenerateTarget = { messageId: number; swipeId: number };

export const generatorState = reactive({ loading: false, generationId: null as string | null });

let cancelled = false;
let genController: AbortController | null = null;

export type Ctx = {
  count: number;
  pinnedCount: number;
  /** 本轮实际发送的候选条目数（超发后的值，≥ 挑选数） */
  candidateCount: number;
  /** AI 需从候选中终选的条数（= count - pinnedCount） */
  pickCount: number;
  pinned: string;
  poolSelected: string;
  input: string;
  minChars: number;
  maxChars: number;
  optionPerson: string;
};
const sub = (t: string, c: Ctx) =>
  t
    .replaceAll('{{count}}', String(c.count))
    .replaceAll('{{pinned_count}}', String(c.pinnedCount))
    .replaceAll('{{candidate_count}}', String(c.candidateCount))
    .replaceAll('{{pick_count}}', String(c.pickCount))
    .replaceAll('{{count_minus_1}}', String(Math.max(0, c.count - 1)))
    .replaceAll('{{pinned}}', c.pinned)
    .replaceAll('{{pool_selected}}', c.poolSelected)
    .replaceAll('{{input}}', c.input)
    .replaceAll('{{min_chars}}', String(c.minChars))
    .replaceAll('{{max_chars}}', String(c.maxChars))
    .replaceAll('{{option_person}}', c.optionPerson);

export const buildMessages = async (
  modules: PromptModule[],
  ctx: Ctx,
  wi: WorldInfoGlobalSettings,
  contextRounds: number,
): Promise<ChatMsg[]> => {
  const gs = useGlobalSettingsStore();
  const prefillEnabled = gs.settings.prompt_rules.prefill_enabled;
  const pr = gs.settings.prompt_rules;
  const augmentedCtx: Ctx = {
    ...ctx,
    minChars: pr.option_min_chars,
    maxChars: pr.option_max_chars,
    optionPerson: pr.option_person || '第三人称',
  };
  const msgs: ChatMsg[] = [];
  const wiBuckets = wi.enabled ? await buildWI() : null;

  const sorted = [...modules].sort((a, b) => a.order - b.order);

  for (const mod of sorted) {
    if (!mod.enabled) continue;
    if (!prefillEnabled && mod.role === 'assistant') continue;

    switch (mod.id) {
      case 'system_prompt': {
        const content = substituteParams(sub(mod.content, augmentedCtx));
        if (content) msgs.push({ role: mod.role, content });
        break;
      }
      case 'world_info_before': {
        if (wiBuckets) {
          const merged = [wiBuckets.before, wiBuckets.anBefore, wiBuckets.em].filter(Boolean).join('\n\n');
          if (merged) msgs.push({ role: 'system', content: merged });
        }
        break;
      }
      case 'persona_description': {
        const personaDesc = power_user?.persona_description;
        if (personaDesc) {
          msgs.push({
            role: 'system',
            content: `<user_persona>\n以下是用户本人（用户=主角=user）的人物设定：\n${substituteParams(personaDesc)}\n</user_persona>`,
          });
        }
        break;
      }
      case 'char_description': {
        const ch = getStCharacter(this_chid);
        const desc = ch?.data?.description;
        if (desc) msgs.push({ role: 'system', content: substituteParams(desc) });
        break;
      }
      case 'char_personality': {
        const ch = getStCharacter(this_chid);
        const personality = ch?.data?.personality;
        if (personality) msgs.push({ role: 'system', content: substituteParams(personality) });
        break;
      }
      case 'char_scenario': {
        const ch = getStCharacter(this_chid);
        const scenario = ch?.data?.scenario;
        if (scenario) msgs.push({ role: 'system', content: substituteParams(scenario) });
        break;
      }
      case 'world_info_after': {
        if (wiBuckets) {
          const merged = [wiBuckets.after, wiBuckets.anAfter, wiBuckets.atDepth].filter(Boolean).join('\n\n');
          if (merged) msgs.push({ role: 'system', content: merged });
        }
        break;
      }
      case 'chat_history': {
        const history = buildChatHistory(contextRounds);
        for (const m of history) {
          msgs.push(prefillEnabled ? m : { ...m, role: 'system' });
        }
        break;
      }
      case 'user_instruction': {
        const content = sub(mod.content, augmentedCtx);
        if (content) msgs.push({ role: mod.role, content });
        break;
      }
      case 'thinking_prompt': {
        const content = substituteParams(sub(mod.content, augmentedCtx));
        if (content) msgs.push({ role: mod.role, content });
        break;
      }
      case 'assistant_ack':
      case 'assistant_thinking': {
        const content = mod.content;
        if (content) msgs.push({ role: mod.role, content });
        break;
      }
      default: {
        const content = substituteParams(sub(mod.content, augmentedCtx));
        if (content) msgs.push({ role: mod.role, content });
        break;
      }
    }
  }

  // 合并相邻同 role 消息，避免连续多个 system/user/assistant
  const merged: ChatMsg[] = [];
  for (const msg of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = last.content + '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }
  return merged;
};

const buildChatHistory = (contextRounds: number): ChatMsg[] => {
  const ctx = window.SillyTavern?.getContext?.();
  const chatArr: any[] = ctx?.chat ?? [];
  const gs = useGlobalSettingsStore();
  const mode = gs.settings.prompt_rules.context_mode;
  // rounds：取最后 N 轮，含隐藏消息；visible_only：仅未隐藏消息，不限轮数
  let msgs = mode === 'visible_only' ? chatArr.filter(m => !m.is_hidden) : [...chatArr];
  if (mode === 'rounds' && contextRounds > 0) msgs = msgs.slice(-contextRounds * 2);
  const rules = gs.sortedEnabledFilterRules;
  const h: ChatMsg[] = [];
  let lastAssistantIdx = -1;
  for (const m of msgs) {
    if (m.is_system) continue;
    let content = m.mes ?? '';
    if (!content) continue;
    for (const rule of rules) {
      try {
        if (rule.type === 'tag') {
          if (!rule.start && !rule.end) continue;
          const startPat = rule.start ? escapeRegExp(rule.start) : '';
          const endPat = rule.end ? escapeRegExp(rule.end) : '';
          // 仅标签头：从起始标签匹配到字符串末尾；仅标签尾：从开头匹配到结束标签；两者都有：匹配标签对
          const body = rule.start ? (rule.end ? '[\\s\\S]*?' : '[\\s\\S]*') : '[\\s\\S]*?';
          const re = new RegExp(startPat + body + endPat, 'g');
          content = content.replace(re, '');
        } else {
          if (!rule.pattern) continue;
          // replace 为空串时即"整段删除"；导入 ST 正则时承载其 replaceString（如 $1 保留内容去标签壳）
          content = content.replace(new RegExp(rule.pattern, 'gs'), rule.replace ?? '');
        }
      } catch {
        console.warn('[choice] 无效过滤规则:', rule);
      }
    }
    if (!content.trim()) continue;
    const role = m.role === 'user' || m.is_user ? 'user' : 'assistant';
    h.push({ role, content });
    if (role === 'assistant') lastAssistantIdx = h.length - 1;
  }
  // 将最后一条 assistant 消息用 <current_scene> 包裹，让 AI 明确识别"当前场景"边界，
  // 避免在长对话中注意力被稀释到更早的剧情。回退到 h 最后一条（无 assistant 时）。
  if (h.length > 0) {
    const wrapIdx = lastAssistantIdx >= 0 ? lastAssistantIdx : h.length - 1;
    h[wrapIdx].content = `<current_scene>\n${h[wrapIdx].content}\n</current_scene>`;
  }
  return h;
};

// 将标签头/尾按字面量转义，避免 <思考>、[小剧场] 等含正则特殊字符的标签被误解析
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type WIBuckets = {
  before: string;
  after: string;
  anBefore: string;
  anAfter: string;
  em: string;
  atDepth: string;
};

const buildWI = async (): Promise<WIBuckets> => {
  const empty: WIBuckets = { before: '', after: '', anBefore: '', anAfter: '', em: '', atDepth: '' };
  try {
    const ctx = window.SillyTavern?.getContext?.();
    const chatArr: any[] = ctx?.chat ?? [];
    // getWorldInfoPrompt 要求 chat 为倒序（最新消息在前），与 ST 主生成 script.js
    // 中 .reverse() 保持一致。不倒序会导致 WorldInfoBuffer 把最旧消息当作最新层扫描，
    // 绿灯关键词匹配的是旧上下文而非当前层。
    const chatStrings = chatArr.map((m: any) => m?.mes ?? '').reverse();
    const ch = getStCharacter(this_chid);

    // 世界书预算 = world_info_budget(%) × maxContext。ST 主生成用 ctx.maxContext(如 8192) 算预算，
    // 但行动选项是独立 API 调用，沿用 8192 会让角色世界书的大条目先耗尽预算，
    // 导致额外启用的世界书 constant 条目在预算检查阶段被丢弃（"budget of N reached"）。
    // 这里放宽到较大上下文估算值，使预算不再成为额外世界书条目的瓶颈。
    const maxCtx = 128000;

    const result = await getWorldInfoPrompt(chatStrings, maxCtx, false, {
      trigger: 'normal',
      personaDescription: power_user?.persona_description ?? '',
      characterDescription: ch?.data?.description ?? '',
      characterPersonality: ch?.data?.personality ?? '',
      characterDepthPrompt: ch?.data?.extensions?.depth_prompt?.prompt ?? '',
      scenario: ch?.data?.scenario ?? '',
      creatorNotes: ch?.data?.creator_notes ?? '',
    });

    return {
      before: result.worldInfoBefore ?? '',
      after: result.worldInfoAfter ?? '',
      anBefore: (result.anBefore ?? []).join('\n'),
      anAfter: (result.anAfter ?? []).join('\n'),
      em: (result.worldInfoExamples ?? [])
        .map((e: any) => e?.content ?? '')
        .filter(Boolean)
        .join('\n'),
      atDepth: (result.worldInfoDepth ?? [])
        .flatMap((d: any) => d?.entries ?? [])
        .filter(Boolean)
        .join('\n'),
    };
  } catch (err) {
    console.error('[Choice] buildWI failed', err);
    return empty;
  }
};

type Restore = { restore: () => void } | null;
export const applyWIExcl = (excl: string[], enabled: string[]): Restore => {
  const saved = [...(selected_world_info ?? [])];
  const hasExcl = excl.length > 0;
  const hasEnabled = enabled.length > 0;
  if (!hasExcl && !hasEnabled) return null;

  selected_world_info.length = 0;
  const newList = hasExcl ? saved.filter(n => !excl.includes(n)) : [...saved];
  if (hasEnabled) {
    for (const name of enabled) {
      // excluded_books 优先于 enabled_books：被排除的书即使仍在 enabled 列表里也不注入
      if (!newList.includes(name) && !excl.includes(name)) newList.push(name);
    }
  }
  selected_world_info.push(...newList);
  const ch = getStCharacter(this_chid);
  const cw = ch?.data?.extensions?.world;
  const cwEx = cw ? excl.includes(cw) : false;
  if (cwEx && ch?.data?.extensions) ch.data.extensions.world = '';
  return {
    restore: () => {
      selected_world_info.length = 0;
      selected_world_info.push(...saved);
      if (cwEx && ch?.data?.extensions) ch.data.extensions.world = cw;
    },
  };
};

/** 思维链标签剥离后的输出交给 options-parse 解析；本模块只负责提示词组装与 API 调用编排 */

export async function generateOptions(_target: GenerateTarget): Promise<ChoiceGeneration | null> {
  if (generatorState.loading) {
    toastr.info(t`选项生成中,请稍候`);
    return null;
  }
  const gs = useGlobalSettingsStore(),
    cs = useChatSettingsStore();
  const gid = uuidv4();
  generatorState.loading = true;
  generatorState.generationId = gid;
  const gwi = gs.settings.world_info;
  const cwi = cs.settings.world_info;
  const allExcl = [...new Set([...gwi.global_excluded_books, ...cwi.excluded_books])];
  const restore = gwi.enabled ? applyWIExcl(allExcl, cwi.enabled_books) : null;
  try {
    const count = resolveCount(gs.settings.global_count_mode);
    // 候选超发：抽签数量 = 目标数量 × 倍数，由生成 AI 从候选中终选，
    // 避免"抽到不合场景的条目、AI 只能跳过、本轮缺条"
    const multiplier = Math.min(3, Math.max(1, Math.round(gs.settings.candidate_multiplier || 2)));
    const pool = resolvePool({
      entries: DEFAULT_MASTER_POOL,
      count: count * multiplier,
    });
    const pinnedCount = pool.pinned.length;
    const pickCount = Math.max(0, count - pinnedCount);
    const poolSelectedText = pool.drawn
      .map(e => {
        let line = e.type;
        if (e.content.trim()) line += ': ' + e.content.trim();
        if (e.rule.trim()) line += ` [规则: ${e.rule.trim()}]`;
        return line;
      })
      .join('\n');
    const c: Ctx = {
      count,
      pinnedCount,
      candidateCount: pool.drawn.length,
      pickCount,
      pinned: pool.pinned
        .map(e => {
          let line = e.type;
          if (e.content.trim()) line += ': ' + e.content.trim();
          if (e.rule.trim()) line += ` [规则: ${e.rule.trim()}]`;
          return line;
        })
        .join('\n'),
      poolSelected: poolSelectedText || '无',
      input: '',
      minChars: 30,
      maxChars: 80,
      optionPerson: '第三人称',
    };
    const rules = gs.settings.prompt_rules;

    // 提示词模块唯一来源是 default-prompt-modules.json（代码级，无存档无 UI 编辑）
    const enabledModules = [...DEFAULT_MODULES].sort((a, b) => a.order - b.order);
    const messages = await buildMessages(enabledModules, c, gwi, rules.context_rounds);

    if (!gs.settings.deepseek_key) {
      toastr.error(t`DeepSeek key 未配置，无法生成`);
      return null;
    }

    genController = new AbortController();
    const signal = genController.signal;

    const raw = await callDeepSeekWithRetry(messages, signal);
    if (cancelled) return null;
    const options = parseOptions(raw, count).map(t => ({ text: t, sourceEntryId: null }));
    if (!options.length) {
      toastr.error(t`未能解析出任何选项,请检查模型输出`);
      return null;
    }
    const generation = { id: gid, timestamp: Date.now(), count, options };
    return generation;
  } catch (e) {
    if (cancelled) return null;
    console.error('Choice generation failed', e);
    toastr.error(t`选项生成失败:${e instanceof Error ? e.message : String(e)}`);
    return null;
  } finally {
    if (restore) restore.restore();
    cancelled = false;
    genController = null;
    generatorState.loading = false;
    generatorState.generationId = null;
  }
}

export function cancelGeneration() {
  cancelled = true;
  genController?.abort();
  genController = null;
  generatorState.loading = false;
  generatorState.generationId = null;
}
