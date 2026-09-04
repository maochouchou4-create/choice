/** 选项输出解析与数量解析：纯函数，无酒馆全局依赖，可在 vitest 中直接测试。
 *  从 generator.ts 拆出（generator 的 import 链全是酒馆运行时，模块加载即触发副作用）。 */

export const resolveCount = (cm: string): number => {
  // 仅支持固定数量；历史上的区间写法（如 3-6）取前值兜底，不再随机
  const n = parseInt(cm.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** 思维链标签块剥离正则：parseOptions 共用。
 *  新增模型思维标签（如 <reasoning_content>/<antThinking>）时只改这一处即可同步，
 *  避免只补一处而另一处静默漏处理。String.replace 对 /g 正则不保留 lastIndex 状态，跨调用共享安全。 */
export const STRIP_REASONING_TAGS_RE =
  /<(?:think(?:ing)?|reasoning|thought)>[\s\S]*?<\/(?:think(?:ing)?|reasoning|thought)>/gi;

export function parseOptions(text: string, count: number): string[] {
  // 找到最后一个思维链闭合标签，丢弃它之前的所有内容
  // 原因：AI 可能在思维链中以文本形式提到 <options>（如"格式：<options> 标签内..."），
  // 直接在原始文本中 matchAll <options> 会误匹配到这些文本引用，导致提取错误
  const closeTagRe = /<\/(?:think(?:ing)?|reasoning|thought)>/gi;
  const closeMatches = [...text.matchAll(closeTagRe)];
  let c: string;

  if (closeMatches.length > 0) {
    const lastClose = closeMatches[closeMatches.length - 1];
    c = text.slice(lastClose.index! + lastClose[0].length).trim();
  } else {
    // 没有思维链闭合标签，剥离配对的思维链标签后使用全文
    c = text.replace(STRIP_REASONING_TAGS_RE, '').trim();
  }

  // 从剩余文本中提取 <options> 块
  const m = c.match(/<options>([\s\S]*?)<\/options>/i);
  if (m) {
    c = m[1].trim();
  } else {
    const openTagIdx = c.search(/<options>/i);
    if (openTagIdx !== -1) {
      c = c.slice(openTagIdx + '<options>'.length).trim();
    }
  }

  // 剥离 markdown 代码块（LLM 可能输出 ```json...```）
  c = c
    .replace(/^```[a-zA-Z]*\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // 尝试 JSON 解析（纯回退路径，prompt 不要求 AI 输出 JSON）
  if (c.startsWith('['))
    try {
      // 处理 JSON 尾随逗号（LLM 常见错误）
      const fc = c.replace(/,(\s*[\]}])/g, '$1');
      const p = JSON.parse(fc);
      if (Array.isArray(p)) {
        const i = p
          .map(x => {
            if (typeof x === 'string') return x.trim();
            return (
              x?.text?.trim() ??
              x?.option?.trim() ??
              // ?? 右侧用 undefined 而非 ''，确保 '' 假值时链继续回退
              (x?.t && x?.c ? `${x.t}: ${x.c}` : undefined) ??
              (x?.type && x?.content ? `${x.type}: ${x.content}` : undefined)
            );
          })
          .filter(Boolean);
        if (i.length) return i.slice(0, count);
      }
    } catch (err) {
      /* not JSON */
    }

  // 【】或 [] 格式：标题用【】或 [] 包裹，后续文本为内容，跨行自动合并
  const bracketTitleRe = /[[【]([^\]】]+?)[\]】]\s*/g;
  const bracketMatches = [...c.matchAll(bracketTitleRe)];
  if (bracketMatches.length > 0) {
    const result: string[] = [];
    for (let i = 0; i < bracketMatches.length; i++) {
      const start = bracketMatches[i].index!;
      const end = i + 1 < bracketMatches.length ? bracketMatches[i + 1].index! : c.length;
      const option = c.slice(start, end).replace(/\r?\n/g, '').trim();
      if (option) result.push(option);
    }
    return result.slice(0, count);
  }

  // 回退：旧格式 "标题: 内容"，按行解析
  // 先按换行分割，再在每行内按 "标题: 内容" 模式拆分，处理模型将多个选项写在同一行的情况
  const lines = c
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^<\/?\w+>$/i.test(l));
  // 标题格式：2-5 个汉字后跟 ": " 或 "： "（\s* 兼容零空格/双空格/制表符等容错）
  const titleRe = /([\u4e00-\u9fff]{2,5})[:：]\s*/g;
  const result: string[] = [];
  for (const line of lines) {
    // 用 matchAll 获取所有标题匹配位置，按相邻匹配区间切片
    // 替换原有的 lastIdx 算法，解决第一个标题在 index 0 时后续选项丢失的 bug
    const matches = [...line.matchAll(titleRe)];
    if (matches.length === 0) {
      result.push(line);
      continue;
    }
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : line.length;
      result.push(line.slice(start, end).trim());
    }
  }
  return result.slice(0, count);
}
