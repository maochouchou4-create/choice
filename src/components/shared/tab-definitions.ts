export type TabId = 'generation' | 'worldinfo' | 'filter' | 'appearance';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: string;
}

export interface GuideContent {
  icon: string;
  title: string;
  html: string;
}

export const INLINE_TABS: TabDefinition[] = [
  { id: 'generation', label: '生成', icon: 'fa-solid fa-bolt' },
  { id: 'worldinfo', label: '世界书', icon: 'fa-solid fa-book' },
  { id: 'filter', label: '过滤', icon: 'fa-solid fa-filter' },
  { id: 'appearance', label: '外观', icon: 'fa-solid fa-palette' },
];

export const FLOATING_TABS: TabDefinition[] = [
  { id: 'generation', label: '生成', icon: 'fa-solid fa-bolt' },
  { id: 'worldinfo', label: '世界书', icon: 'fa-solid fa-book' },
  { id: 'filter', label: '过滤', icon: 'fa-solid fa-filter' },
  { id: 'appearance', label: '外观', icon: 'fa-solid fa-palette' },
];

export const GUIDE_CONTENTS: Record<TabId, GuideContent> = {
  generation: {
    icon: 'fa-solid fa-bolt',
    title: '生成行为',
    html: `<p><strong>自动生成</strong>：开启后，每次 AI 回复完成时自动触发选项生成，无需手动点击"生成"按钮。此设置为聊天级，仅对当前对话生效。</p>
<p><strong>行为模式</strong>：控制点击选项后的动作——发送（直接发送消息）、覆盖（填入输入框替换现有内容）、尾附（追加到输入框末尾）。</p>
<p><strong>候选超发</strong>：候选条目按选项数量的倍数抽取，由 AI 从中终选最贴合当前场景的——倍数越高越不容易"抽不到合适条目"，代价是消耗更多 token。</p>
<p><strong>上下文范围</strong>：控制发送给 AI 的聊天记录——"轮数模式"取最后 N 轮（含隐藏消息），"仅可见消息"不限轮数、排除隐藏消息。</p>
<p><strong>预填充</strong>：在消息末尾预写 AI 开头以引导输出格式，不支持的模型可关闭。</p>
<p><strong>提示</strong>：在选项面板的头部，也可以直接切换发送/覆盖/尾附模式，两处设置保持同步。</p>`,
  },
  worldinfo: {
    icon: 'fa-solid fa-book',
    title: '世界书',
    html: `<p><strong>用途</strong>：控制世界书（World Info）条目是否注入到选项生成提示词中。启用后，AI 生成选项时能感知世界观设定。</p>
<p><strong>默认行为</strong>：自动包含角色世界书和全局世界书。取消勾选某本书，该书的所有条目都不参与生成；展开某本书后，可以单独排除特定条目。</p>
<p><strong>条目状态</strong>：🔵 蓝灯 = 常驻条目（始终注入），🟢 绿灯 = 关键词触发（匹配时注入），灰色/禁用 = 跳过。禁用条目会自动排除，无需手动操作。</p>
<p><strong>操作</strong>：点击书名可展开查看条目列表，取消勾选可排除书或条目。通过"刷新列表"可同步最新世界书变更。</p>`,
  },
  filter: {
    icon: 'fa-solid fa-filter',
    title: '聊天记录过滤',
    html: `<p><strong>三大区域</strong>：全局正则区（始终生效）、预设正则区（随ST预设切换）、角色卡正则区（随角色卡切换）。</p>
<p><strong>正则库</strong>：类似条目库，存放可复用的正则表达式。支持标签匹配和正则匹配两种类型。</p>
<p><strong>操作流程</strong>：在对应区域创建分组 → 点击「从正则库添加」选择正则 → 或直接添加内联规则 → 启用分组即可。</p>
<p><strong>调暗效果</strong>：预设区和角色卡区中，不属于当前预设/角色的分组会以半透明显示，不会对当前聊天生效。</p>`,
  },
  appearance: {
    icon: 'fa-solid fa-palette',
    title: '外观',
    html: `<p><strong>悬浮窗</strong>：在屏幕右下角显示一个快捷按钮，点击打开设置面板，拖动可改变位置。关闭后从设置面板入口进入。</p>
<p><strong>主题</strong>：暗色/亮色切换，影响设置面板、选项面板等所有扩展 UI。</p>
<p><strong>字体大小</strong>：小/中/大三档，影响选项按钮和面板内的文字大小。</p>
<p><strong>恢复出厂设置</strong>：删除插件全部设置（条目池、API、过滤等）并回到初始状态，不可撤销。</p>`,
  },
};
