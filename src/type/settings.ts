import defaultModulesJson from '../../default-prompt-modules.json';
// 显式导入 z：auto-imports.d.ts 生成的全局 const z（typeof import('zod').z）在类型位置
// 无法当命名空间用（z.infer 报 TS2503，且该文件被 gitignore 随时重生成），不能用
import { z } from 'zod';

export const setting_field = 'choice';

export const PoolEntry = z
  .object({
    id: z.string(),
    type: z.string(),
    content: z.string().default(''),
    rule: z.string().default(''),
    pinned: z.boolean().default(false),
    weight: z.number().min(0).default(1),
    category: z.string().default(''),
    condition: z.string().default(''),
  })
  // zod4 的 prefault 参数类型是输入类型：PoolEntry 的 id/type 无 default（必填），
  // 空对象不满足签名；占位值仅在输入为 undefined 的极端路径触发，正常条目不受影响
  .prefault(() => ({ id: '', type: '' }));
export type PoolEntry = z.infer<typeof PoolEntry>;

export const GenerationSettings = z
  .object({
    count_mode: z.string().default('4'),
    categories_enabled: z.boolean().default(true),
    shuffle_final: z.boolean().default(true),
    pinned_overflow: z.enum(['send_all', 'trim']).default('send_all'),
    // 候选超发倍数：抽签数 = 目标条数 × 倍数，超发候选由生成 AI 终选，过滤不合场景的条目
    candidate_multiplier: z.number().int().min(1).max(3).default(2),
  })
  .prefault({});
export type GenerationSettings = z.infer<typeof GenerationSettings>;

/** AI 条目生成聊天会话：多轮对话记录，聊天内模式存角色卡，全局模式存扩展设置 */
export const PoolGenMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type PoolGenMessage = z.infer<typeof PoolGenMessage>;

export const PoolGenSession = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messages: z.array(PoolGenMessage).default([]),
});
export type PoolGenSession = z.infer<typeof PoolGenSession>;

export const PoolConfigEntry = z
  .object({
    entry_id: z.string(),
    pinned: z.boolean().default(false),
    weight: z.number().min(0).default(1),
    condition: z.string().default(''),
  })
  .prefault(() => ({ entry_id: '' }));
export type PoolConfigEntry = z.infer<typeof PoolConfigEntry>;

export const PoolConfig = z
  .object({
    id: z.string(),
    name: z.string(),
    entries: z.array(PoolConfigEntry),
    is_default: z.boolean().default(false),
    generation: GenerationSettings.prefault({}),
  })
  .prefault(() => ({ id: '', name: '', entries: [] }));
export type PoolConfig = z.infer<typeof PoolConfig>;

export const PromptModule = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().default(''),
  marker: z.boolean(),
  system: z.boolean(),
  enabled: z.boolean().default(true),
  order: z.number().min(0),
});
export type PromptModule = z.infer<typeof PromptModule>;

// JSON 导入的 role 推断为 string，与 PromptModule 的字面量联合不兼容；内容受构建期 JSON 约束，
// 此处断言安全（若 JSON 里 role 拼错，运行时由 zod 解析/生成流程兜底）
export const DEFAULT_MODULES = defaultModulesJson.modules as unknown as PromptModule[];

// 聊天记录过滤规则：标签匹配（字面量头/尾）或正则匹配，二者可混用
export const ChatFilterRule = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tag'),
    start: z.string().default(''),
    end: z.string().default(''),
  }),
  z.object({
    type: z.literal('regex'),
    pattern: z.string().default(''),
    // 匹配段替换为此字符串（JS replace 语法，支持 $1 等分组引用）；空串 = 整段删除。
    // 不放 tag 变体：标签规则语义固定为"剥掉标签对"，不存在保留内容的需求
    replace: z.string().default(''),
  }),
]);
export type ChatFilterRule = z.infer<typeof ChatFilterRule>;

export const RegexLibraryEntry = z.object({
  id: z.string(),
  name: z.string().default(''),
  type: z.enum(['tag', 'regex']),
  pattern: z.string().default(''),
  // 仅 regex 类型生效：匹配段替换为此字符串（兼容 ST replaceString 的 $1 语法），空串 = 整段删除
  replace: z.string().default(''),
  start: z.string().default(''),
  end: z.string().default(''),
  category: z.string().default(''),
});
export type RegexLibraryEntry = z.infer<typeof RegexLibraryEntry>;

export const FilterGroupEntry = z.object({
  library_entry_id: z.string().nullable().default(null),
  inline_rule: ChatFilterRule.nullable().default(null),
});
export type FilterGroupEntry = z.infer<typeof FilterGroupEntry>;

export const FilterGroup = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  entries: z.array(FilterGroupEntry).default([]),
  preset_name: z.string().nullable().default(null),
  // 归一化为字符串：酒馆 1.18 的 this_chid 实测是字符串（如 "2"），旧版本/旧存档可能是数字，
  // === 比较会因类型不一致失配；声明为 number 则 addFilterGroup 写入字符串时 Zod 重载报错
  character_id: z.preprocess(v => (v == null ? null : String(v)), z.string().nullable().default(null)),
});
export type FilterGroup = z.infer<typeof FilterGroup>;

export const FilterSettings = z.object({
  regex_library: z.array(RegexLibraryEntry).default([]),
  groups: z.array(FilterGroup).default([]),
  library_groups: z.array(z.string()).default([]),
});
export type FilterSettings = z.infer<typeof FilterSettings>;

/** 提示词模块的代码级参数：模块正文唯一来源是 default-prompt-modules.json（无 UI 编辑），
 *  这里只存运行时可调的组装开关与选项约束。字段名 prompt_rules 沿用历史存档键，
 *  改名会无谓丢掉用户已调好的值。 */
export const PromptRules = z
  .object({
    context_rounds: z.number().min(0).default(10),
    /** 上下文模式：rounds = 取最后 N 轮（含隐藏消息）；visible_only = 仅未隐藏消息（不限轮数） */
    context_mode: z.enum(['rounds', 'visible_only']).default('visible_only'),
    /** 关闭后不发送 assistant 预填充消息，兼容不支持 prefill 的模型 */
    prefill_enabled: z.boolean().default(true),
    /** 选项人称（简单值），显示在生成页面 */
    option_person: z.string().default('第三人称'),
    /** 选项字数下限 */
    option_min_chars: z.number().min(10).max(500).default(30),
    /** 选项字数上限 */
    option_max_chars: z.number().min(10).max(500).default(80),
  })
  .prefault({});
export type PromptRules = z.infer<typeof PromptRules>;

export const SecondaryApi = z
  .object({
    id: z.string(),
    name: z.string(),
    apiurl: z.string(),
    key: z.string(),
    model: z.string(),
    temperature: z.number().min(0).max(2).default(1),
    max_tokens: z.number().min(1).default(4096),
    timeout: z.number().min(0).default(180),
    stream: z.boolean().default(false),
    exclude_params: z.string().default(''),
  })
  .prefault(() => ({ id: '', name: '', apiurl: '', key: '', model: '' }));
export type SecondaryApi = z.infer<typeof SecondaryApi>;

export const SCHEMA_VERSION = 19;

export const WorldInfoGlobalSettings = z
  .object({
    enabled: z.boolean().default(true),
    global_excluded_books: z.array(z.string()).prefault([]),
    /** @deprecated 已改用 ST 原生 getWorldInfoPrompt，不再区分 redlight 模式 */
    redlight_mode: z.boolean().default(true),
    /** @deprecated 已改用 ST 原生 getWorldInfoPrompt，不再支持 EJS 模板 */
    ejs_compat: z.boolean().default(false),
  })
  .prefault({});
export type WorldInfoGlobalSettings = z.infer<typeof WorldInfoGlobalSettings>;

export const WorldInfoChatSettings = z
  .object({
    excluded_books: z.array(z.string()).prefault([]),
    excluded_entries: z.array(z.string()).prefault([]),
    enabled_books: z.array(z.string()).prefault([]),
  })
  .prefault({});
export type WorldInfoChatSettings = z.infer<typeof WorldInfoChatSettings>;

export const UISettings = z
  .object({
    floating_enabled: z.boolean().default(true),
    /** @deprecated 已迁移到 theme_mode，保留用于向后兼容迁移 */
    theme: z.enum(['dark', 'light']).optional(),
    /** 主题模式：auto = 自动检测 ST 亮/暗，st = 完全跟随 ST 配色，dark/light = 手动覆盖 */
    theme_mode: z.enum(['auto', 'st', 'dark', 'light']).default('auto'),
    font_size: z.enum(['small', 'medium', 'large']).default('medium'),
    /** 行内设置面板内容区高度（px），拖拽手柄可调整 */
    panel_height: z.number().min(300).max(800).default(500),
  })
  .prefault({});
export type UISettings = z.infer<typeof UISettings>;

export const GlobalSettings = z
  .object({
    schema_version: z.number().default(0),
    master_pool: z.array(PoolEntry).prefault([]),
    configs: z.array(PoolConfig).prefault([]),
    group_order: z.array(z.string()).prefault([]),
    prompt_rules: PromptRules.prefault({}),
    // FilterSettings 全字段带 default，{} 作为输入 parse 即得全默认对象；
    // 不能用 .default({})：zod4 的 default 参数是输出类型，要求逐字段写全
    filter_settings: FilterSettings.prefault({}),
    apis: z.array(SecondaryApi).prefault([]),
    active_api_id: z.string().default(''),
    world_info: WorldInfoGlobalSettings.prefault({}),
    ui: UISettings.prefault({}),
    retry_count: z.number().min(0).max(10).default(0),
    global_count_mode: z.string().default('4'),
    pool_gen_sessions: z.array(PoolGenSession).prefault([]),
    auto_generate: z.boolean().default(true),
    behavior: z.enum(['send', 'fill', 'append']).default('send'),
    empty_groups: z.array(z.string()).default([]),
  })
  .prefault({});
export type GlobalSettings = z.infer<typeof GlobalSettings>;

export const CharacterSettings = z
  .object({
    config_id: z.string().nullable().default(null),
    pool_gen_sessions: z.array(PoolGenSession).prefault([]),
  })
  .prefault({});
export type CharacterSettings = z.infer<typeof CharacterSettings>;

export const ChatSettings = z
  .object({
    config_id: z.string().nullable().default(null),
    world_info: WorldInfoChatSettings.prefault({}),
  })
  .prefault({});
export type ChatSettings = z.infer<typeof ChatSettings>;
