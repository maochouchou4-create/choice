import { substituteParams, this_chid } from '@sillytavern/script';
import { getStCharacter } from '@/core/st-character';
import toastr from 'toastr';
import { getWorldInfoPrompt, loadWorldInfo, selected_world_info } from '@sillytavern/scripts/world-info';
import { renderWorldInfoContent } from '@/core/ejs-bridge';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { power_user } from '@sillytavern/scripts/power-user';
import { parseOptions, resolveCount } from '@/core/options-parse';
import { resolvePool } from '@/core/pool-resolver';
import { callDeepSeekWithRetry, type ChatMsg } from '@/core/api-client';
import { DEFAULT_MASTER_POOL } from '@/core/default-pool';
import { useChatSettingsStore } from '@/store/chat-settings';
import { useGlobalSettingsStore } from '@/store/global-settings';
import type { ChoiceGeneration } from '@/core/options-store';
import type { WorldInfoGlobalSettings } from '@/type/settings';
import { SYSTEM_RULES, USER_TASK } from '@/core/default-prompt';

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
    .replaceAll('{{pinned}}', c.pinned)
    .replaceAll('{{pool_selected}}', c.poolSelected)
    .replaceAll('{{min_chars}}', String(c.minChars))
    .replaceAll('{{max_chars}}', String(c.maxChars))
    .replaceAll('{{option_person}}', c.optionPerson);

/** 消息组装（线性直写）：
 *  system 规则正文 → system <reference> 人设资料 → system <history> 包裹的交互历史
 *  （历史本体降为 system，不引导续写）→ user 本轮任务。
 *  ⚠ 消息序列末尾不得以未闭合标签结尾：思考模型（DeepSeek V4）会把它判为思维链续写、正文为空 */
export const buildMessages = async (
  ctx: Ctx,
  wi: WorldInfoGlobalSettings,
  contextRounds: number,
): Promise<ChatMsg[]> => {
  const gs = useGlobalSettingsStore();
  const pr = gs.settings.prompt_rules;
  const augmentedCtx: Ctx = {
    ...ctx,
    minChars: pr.option_min_chars,
    maxChars: pr.option_max_chars,
    optionPerson: pr.option_person || '第三人称',
  };
  const fill = (tpl: string) => substituteParams(sub(tpl, augmentedCtx));
  const msgs: ChatMsg[] = [];

  // 1. system：规则正文一整块
  msgs.push({ role: 'system', content: fill(SYSTEM_RULES) });

  // 2. system：<reference> 人设参考资料（user persona / 世界书 / 角色卡三件套）
  const refParts: string[] = [];
  const personaDesc = power_user?.persona_description;
  if (personaDesc) {
    refParts.push(
      `<user_persona>\n以下是用户本人（用户=主角=user）的人物设定：\n${substituteParams(personaDesc)}\n</user_persona>`,
    );
  }
  const wiBuckets = wi.enabled ? await buildWI() : null;
  if (wiBuckets) {
    const before = [wiBuckets.before, wiBuckets.anBefore, wiBuckets.em].filter(Boolean).join('\n\n');
    if (before) refParts.push(before);
  }
  const ch = getStCharacter(this_chid);
  for (const part of [ch?.data?.description, ch?.data?.personality, ch?.data?.scenario]) {
    if (part) refParts.push(substituteParams(part));
  }
  if (wiBuckets) {
    const after = [wiBuckets.after, wiBuckets.anAfter, wiBuckets.atDepth].filter(Boolean).join('\n\n');
    if (after) refParts.push(after);
  }
  if (refParts.length) {
    msgs.push({
      role: 'system',
      content: '<!-- 角色扮演参考资料 -->\n<reference>\n' + refParts.join('\n\n') + '\n</reference>',
    });
  }

  // 3. system：<history> 包裹的交互历史（历史本体降为 system，不引导模型续写对话）
  const history = buildChatHistory(contextRounds);
  if (history.length) {
    msgs.push({
      role: 'system',
      content: '<!-- 角色扮演交互历史，最新一条为 <current_scene> 标记的当前场景 -->\n<history>',
    });
    for (const m of history) msgs.push({ ...m, role: 'system' });
    msgs.push({ role: 'system', content: '</history>' });
  }

  // 4. user：本轮任务（消息序列的最后一条，不得以未闭合标签结尾）
  msgs.push({ role: 'user', content: fill(USER_TASK) });

  // 合并相邻同 role 消息（<reference>/<history> 内部的相邻 system）
  const merged: ChatMsg[] = [];
  for (const msg of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = last.content + '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // 调试证据链（经 TT 前端日志桥可查）：请求消息结构 + 模型看到的正文全文。
  // 没有这两样，"选项空洞/对不上正文"类问题无法定位（TT 的 llm-api 落盘仅保留最近几次）
  const sceneMsg = merged.find(m => m.content.includes('<current_scene>'));
  const sceneText = sceneMsg
    ? sceneMsg.content.slice(sceneMsg.content.indexOf('<current_scene>'), sceneMsg.content.indexOf('</current_scene>') + 16)
    : '（警告：历史为空，模型没有收到任何正文！）';
  console.info(
    '[Choice] 请求组装:',
    merged.map(m => `${m.role}(${m.content.length}字)`).join(' + '),
    '\n[Choice] 模型看到的正文 <current_scene>:\n' + sceneText,
  );
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

    const buckets: WIBuckets = {
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
    // EJS 渲染（世界书 tab 可关）：先展 {{宏}}；装了「提示词模板」插件再执行条目里的
    // <% %> JS——choice 的独立次级调用不触发模板插件的事件链，不渲染则动态条目
    // （按好感度切换人设等）拿到的是模板原文
    if (useGlobalSettingsStore().settings.world_info.render_world_info_ejs) {
      for (const key of Object.keys(buckets) as (keyof WIBuckets)[]) {
        if (buckets[key]) buckets[key] = await renderWorldInfoContent(buckets[key]);
      }
    }
    return buckets;
  } catch (err) {
    console.error('[Choice] buildWI failed', err);
    return empty;
  }
};

type Restore = { restore: () => void } | null;

/** 条目级世界书排除：世界书 tab 勾选的 excluded_entries（'书名::uid'）只在 UI 记账，
 *  ST 的关键词触发机制并不认识它——不临时 disable 的话被勾条目照样注入（静默失效）。
 *  生成前把对应条目临时置 disable，生成后原样恢复；只处理当前会注入的书
 *  （applyWIExcl 之后的 selected_world_info ∪ 角色绑定书），整本已排除的书不用动。 */
const applyWIEntryExcl = async (excludedKeys: string[]): Promise<Restore> => {
  if (!excludedKeys.length) return null;
  const byBook = new Map<string, Set<string>>();
  for (const key of excludedKeys) {
    const sep = key.indexOf('::');
    if (sep <= 0) continue;
    const bookName = key.slice(0, sep);
    const set = byBook.get(bookName) ?? new Set<string>();
    set.add(key.slice(sep + 2));
    byBook.set(bookName, set);
  }
  const charWorld = getStCharacter(this_chid)?.data?.extensions?.world as string | undefined;
  const touched: { entry: any; original: boolean }[] = [];
  for (const [bookName, uids] of byBook) {
    const active = selected_world_info?.includes(bookName) || charWorld === bookName;
    if (!active) continue;
    try {
      const data = (await loadWorldInfo(bookName)) as { entries?: Record<string, any> } | undefined;
      for (const entry of Object.values(data?.entries ?? {})) {
        if (uids.has(String(entry?.uid)) && !entry.disable) {
          touched.push({ entry, original: entry.disable });
          entry.disable = true;
        }
      }
    } catch (err) {
      console.warn('[Choice] 条目排除处理失败:', bookName, err);
    }
  }
  if (!touched.length) return null;
  return {
    restore: () => {
      for (const t of touched) t.entry.disable = t.original;
    },
  };
};

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
  const restoreEntries = gwi.enabled ? await applyWIEntryExcl(cwi.excluded_entries) : null;
  try {
    // 数量钳制：数量框被清空时 resolveCount 返回 0，直接放行会生成 0 条空转一次 API
    const count = Math.max(1, resolveCount(gs.settings.global_count_mode));
    // 候选超发：抽签数量 = 目标数量 × 倍数，由生成 AI 从候选中终选，
    // 避免"抽到不合场景的条目、AI 只能跳过、本轮缺条"
    const multiplier = Math.min(10, Math.max(1, Math.round(gs.settings.candidate_multiplier || 3)));
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
      minChars: 30,
      maxChars: 80,
      optionPerson: '第三人称',
    };
    const rules = gs.settings.prompt_rules;

    const messages = await buildMessages(c, gwi, rules.context_rounds);

    if (!gs.settings.deepseek_key) {
      toastr.error(t`DeepSeek key 未配置，无法生成`);
      return null;
    }

    genController = new AbortController();
    const signal = genController.signal;

    const raw = await callDeepSeekWithRetry(messages, signal);
    if (cancelled) return null;
    // 调试证据链：模型完整原始输出（无论解析成败都留档）
    console.info('[Choice] 模型完整原始输出:\n' + raw);
    const options = parseOptions(raw, count).map(t => ({ text: t, sourceEntryId: null }));
    console.info(`[Choice] 解析出 ${options.length}/${count} 条选项`);
    if (!options.length) {
      // 排错主通道：原始输出打进 console，经 TT 前端日志桥（3p:choice 前缀）可查
      console.warn('[Choice] 解析失败，模型原始输出:', raw);
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
    if (restoreEntries) restoreEntries.restore();
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
