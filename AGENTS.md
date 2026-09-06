# choice（异步行动选项）— 项目说明

SillyTavern 第三方扩展（基于 `tavern_extension_template` 二次开发）。核心功能：单独调用 DeepSeek API 异步生成"行动选项"——**当前场景任一在场角色的行动方案**，供玩家点选后填入/发送。TypeScript + Vue 3 + Pinia + Zod + Vite 构建，产物为单文件 `dist/index.js`（**故意跟踪进 git**，TT 安装/更新扩展装的就是它），经 fork 仓 `maochouchou4-create/choice` 的 dev 分支发布。

## 与我协作时的约定

- 回复用中文。
- 代码注释：简体中文、简洁、解释"为什么"而非"做什么"——尤其是覆盖规则、抽取算法、组装序列这类容易被后来者简化/写错的逻辑，注释要点出"为什么不能这样简化"。
- 任何来自 `@sillytavern/...` 的导入，函数签名/导出名不允许凭记忆假设，必须去 `../TauriTavern`（用户实际使用的酒馆克隆，**dev 分支**，网页根在 `src/`）核实，结论写进注释。
- **验收基线（每次改动全跑）**：`pnpm build` + `pnpm exec vue-tsc -p tsconfig.typecheck.json`（只看 `src/` 行，须 0 错）+ `pnpm exec eslint .`（0 错误 0 警告）+ `pnpm test`（vitest，23 例）。产物验证：`grep -c "from'../../../../../script.js'" dist/index.js` 须 ≥1（vite 路径常量 5 级，装进酒馆能否加载的唯一判据）。
- 功能行为验证走用户实测 + TT 前端日志桥（TT 设置开 "Capture full console logs" 后插件 console 进当天日志带 `3p:choice` 前缀），不做浏览器自动化（TT 是 WebView2 桌面应用，a11y/坐标驱动均不可靠）。

## 关键架构约束

- **技术栈边界**：严格 TS + Vue 3 SFC + Pinia + Zod，不手写 jQuery/裸 DOM（`index.ts`/`panel-mount.ts` 的 `$('<div>')` 挂载点除外）。样式为原生 CSS custom property（`src/theme.css` + `src/global.css` 定义全部 `--choice-*` 变量）；不引入 Tailwind/UnoCSS（`@tailwindcss/postcss` 等 devDep 为未接线残留，勿引入 Tailwind）。
- **设置一律走 Pinia store**：组件内不允许直接读写 `extension_settings`/`chat_metadata`/`character.data.extensions`，必须经过 `useXxxStore()`。
- **`@sillytavern` 导入隔离**：这类导入（摸真实酒馆源码，非 npm 包）只允许出现在 `src/core/` 下，不允许散落进 Vue 组件。
- **代码单源三件套（无 UI 无存档，Agent 直改→build→推 fork→TT 更新即生效）**：
  - 提示词＝`src/core/default-prompt.ts`（一整块正文，【小节】组织）；
  - 条目池＝`src/core/default-pool.ts`（11 组 94 条通用行动原型，含 NSFW 组不保底）；
  - API＝`src/core/api-client.ts`（DeepSeek 专用全常量）。
  用户声明**永不通过插件界面改内容，插件只留开关**；勿复活任何编辑界面/配置体系/存档迁移。
- **消息组装走角色结构（generator.buildMessages 线性直写）**：system 规则正文 → [prefill] assistant 确认 → system `<reference>`（user persona/世界书/角色卡三件套）→ system `<history>` 包裹的交替历史（末条 assistant 包 `<current_scene>`）→ user 本轮任务。**铁律：消息序列末条不得以未闭合标签结尾**（思考模型会把续写判为思维链、正文为空，2026-09-05 实案）。
- **行动主语＝当前场景任一在场角色（2026-09-05 拍板）**：选项的行动者按戏剧张力选择，每条内容以行动者名字开头；人设筛按行动者各自过。特殊条目例外见提示词【特殊条目】（转场推进无行动者、他人视角为镜头型）。
- **楼层持久化挂在消息对象上**：生成结果存进 `message.extra.choice[String(swipeId)]`（`setting_field='choice'`，**不是** 早期文档写的 `asyncActionOptions`），按楼层+swipe 双维隔离，切楼层/切 swipe 选项不串；同楼层多次生成走 `generations[]` + `currentIndex` 翻页，不跨楼层保留。

## 目录（按实际文件结构）

- `src/core/` — `generator.ts`（提示词组装+生成编排+条目素材行渲染）、`options-parse.ts`（parseOptions/resolveCount/STRIP_REASONING_TAGS_RE，纯函数可测）、`pool-resolver.ts`（分层抽样纯函数）、`options-store.ts`（`message.extra` 存取，含 swipe 维度、翻页）、`default-pool.ts`、`default-prompt.ts`、`api-client.ts`（地址/模型/effort=low/max_tokens 16k/超时 180s/重试 2 次全常量；`reasoning_effort` 必须经 `custom_include_body` 通道发真值——TT 后端对 openai 源白名单丢弃、对 deepseek 源把 low 折叠成 high，源码核实见文件头注释；**空正文自动重试**：模型 stop 但 content 空＝思维链吞正文，`EmptyContentError` 可重试；key 读 `extension_settings.choice.deepseek_key`，本地留存不进 git）、`panel-mount.ts`（面板挂载+世界书排除的临时摘除/恢复）、`st-character.ts`/`st-regex-source.ts`（酒馆角色卡/正则读取隔离层）、`theme-detector.ts`、`floating-state.ts`（悬浮球共享状态）。
- `src/store/` — `global-settings.ts`（对应 `extension_settings.choice`，含旧 apis[] 的 key 抢救迁移）、`chat-settings.ts`（对应 `chat_metadata`，仅世界书排除项）、`panel-state.ts`（面板展开/当前楼层/swipe 追踪）。
- `src/components/` — 选项面板 `ActionOptionsPanel.vue`；悬浮形态 `FloatingBubble.vue`（交互入口唯一：单击开设置+拖拽贴边）+ `FloatingRoot.vue` + `FloatingSettings.vue`；设置 tab 组件 `GenerationSettings.vue`/`WorldInfoEditor.vue`/`FilterEditor.vue`（内嵌 `FilterGroupPanel.vue`）/`AppearanceSettings.vue`（含恢复出厂）；对话框 `RegexLibraryDialog.vue`/`StRegexImportDialog.vue`/`ConfirmDialog.vue`；`GuidePopover.vue`；`shared/tab-definitions.ts`（tab 清单+指南 HTML）。
- `tests/` — vitest：`pool-resolver.test.ts`（分层抽取 9 例）、`options-parse.test.ts`（解析 14 例）。`tsconfig.json` include 已覆盖 tests。

## 条目池模型 & 抽取算法

- 条目字段（`PoolEntry`）：`id`（语义化命名如 `daily-01`）、`type`（标题）、`content`（行动意图）、`rule`（写作硬约束，渲染为 `[规则: y]`）、`pinned`（固定生成）、`category`（组归属）。**无 weight 无 condition**（均已删，勿复活）。
- 池子＝11 组 94 条（1 条 pinned 转场推进不占随机名额；NSFW 组 10 条**不参与每组保底**，仅随机补充位出现——见 `UNGUARANTEED_CATEGORIES`）。设计哲学：条目＝**通用行动原型，不预设人设**；人设是"颜料"由生成 AI 改写时上色；措辞中性禁城府味。
- 抽取（pool-resolver.ts）＝**分层随机**：按 category 分组打乱 → 每组保底抽 1（unguaranteed 类别跳过）→ 剩余名额全池随机补足；名额 < 组数时随机选组每组 1 条；pinned 全发不占名额；结果整体打乱。
- 候选超发：抽签数 = 目标条数 × `candidate_multiplier`（生成 tab 自由数字 1-10，默认 3）。数量策略＝**恰好 N 条、宁缺毋滥**（用户拍板：凑数的次优选项看了也烦；候选够不够靠倍数旋钮，不靠 AI 放宽标准）。数字输入框有 blur 钳制 + schema `.catch` 双保险（脏值曾致插件初始化崩溃）。

## 已删除勿复活清单

数量区间、条目导入导出、输入润色、提示词编辑界面+多配置、柏宝书桥接、调试 tab、分组抽取+weight+条目池配置体系/编辑对话框、API tab+多 API、魔法棒菜单、悬浮球长按菜单、`[条件]` 挂载机制、shared/ 基础组件（ChoiceCard/ChoiceDialog/ChoiceField/ChoiceSection/useCompactLayout）、`SettingsPanel.vue`、`FloatingContextMenu.vue`、`wand-menu.ts`、`default-prompt-modules.json`。老存档兼容不做（用户明确不玩旧卡）。

## 排错速查

- **"生成成功但解析不出选项"**：查 TT `logs/llm-api-*.response.json`。`finish_reason=length`＝max_tokens 被思维链耗尽（已修：16k）；`stop` 但 content 空＝思维链吞正文怪癖（已修：EmptyContentError 自动重试 ×2）。请求/响应每次调用都落盘，`llm-api-index.json` 是索引。
- **选项人设失守**：user 人设若放在世界书**绿灯条目**里，关键词（user 名字）在聊天文本出现率低会经常不触发——让用户把人设条目改蓝灯常驻。
- **DeepSeek 供应商后台无消耗**：查当天 TT 日志 `upstream stream read failed ... body_interrupted`＝网络层断流（Clash 全局模式嫌疑，切规则模式）。

## 详细设计文档

`docs/` 目录已不存在；早期规格（async-action-options-spec 等）已过时勿参考。当前实现以代码+本文件为准。
