import { describe, expect, it } from 'vitest';
import { parseOptions, resolveCount, STRIP_REASONING_TAGS_RE } from '@/core/options-parse';

describe('resolveCount', () => {
  it('解析固定数量（含首尾空白）', () => {
    expect(resolveCount('4')).toBe(4);
    expect(resolveCount(' 3 ')).toBe(3);
  });

  it('历史区间写法取前值兜底', () => {
    expect(resolveCount('3-6')).toBe(3);
  });

  it('非法输入返回 0', () => {
    expect(resolveCount('abc')).toBe(0);
    expect(resolveCount('')).toBe(0);
    expect(resolveCount('0')).toBe(0);
    expect(resolveCount('-2')).toBe(0);
  });
});

describe('STRIP_REASONING_TAGS_RE', () => {
  it('剥离配对的思维链标签（含变体）', () => {
    expect('前<think>a</think>中<thinking>b</thinking>后'.replace(STRIP_REASONING_TAGS_RE, '')).toBe('前中后');
  });
});

describe('parseOptions', () => {
  it('提取 <options> 块内的行', () => {
    const text = '废话\n<options>\n[调查] 搜索书桌\n[离开] 去客厅\n</options>\n收尾';
    expect(parseOptions(text, 5)).toEqual(['[调查] 搜索书桌', '[离开] 去客厅']);
  });

  it('思维链中提到 <options> 不干扰提取：取最后一个闭合标签之后的内容', () => {
    const text =
      '<think>我应该按 <options> 标签的格式输出。</think>\n<options>\n[行动] 推门\n</options>';
    expect(parseOptions(text, 5)).toEqual(['[行动] 推门']);
  });

  it('无闭合的思维链标签：全文中直接定位 <options> 块', () => {
    const text = '<think>内心独白没有闭合标签\n<options>\n[等待] 不动\n</options>';
    expect(parseOptions(text, 5)).toEqual(['[等待] 不动']);
  });

  it('剥离 markdown 代码块围栏', () => {
    const text = '```json\n[{"text":"[选项A] 内容A"},{"text":"[选项B] 内容B"}]\n```';
    expect(parseOptions(text, 5)).toEqual(['[选项A] 内容A', '[选项B] 内容B']);
  });

  it('JSON 回退：对象数组取 text 字段并容忍尾随逗号', () => {
    const text = '[{"text":"甲"},{"text":"乙"},]';
    expect(parseOptions(text, 5)).toEqual(['甲', '乙']);
  });

  it('JSON 回退：type/content 与 t/c 形状拼为 "类型: 内容"', () => {
    expect(parseOptions('[{"type":"调查","content":"翻抽屉"}]', 5)).toEqual(['调查: 翻抽屉']);
    expect(parseOptions('[{"t":"走","c":"出门"}]', 5)).toEqual(['走: 出门']);
  });

  it('【标题】格式：跨行内容合并为一项', () => {
    const text = '【潜入】翻墙进去\n顺手关灯\n【离开】转身就走';
    expect(parseOptions(text, 5)).toEqual(['【潜入】翻墙进去顺手关灯', '【离开】转身就走']);
  });

  it('同行堆叠括号并入同条，不切碎（上游 75395e4 同款）', () => {
    const text = '<options>\n[回溯闪回]【三年前·初二暑假】一切如旧\n[离开] 推门而出\n</options>';
    expect(parseOptions(text, 5)).toEqual(['[回溯闪回]【三年前·初二暑假】一切如旧', '[离开] 推门而出']);
  });

  it('同行多括号全部并入首条（含紧贴堆叠）', () => {
    expect(parseOptions('[一] 甲 [二] 乙 [三] 丙', 5)).toEqual(['[一] 甲 [二] 乙 [三] 丙']);
    expect(parseOptions('[回溯闪回]【三年前】一切如旧', 5)).toEqual(['[回溯闪回]【三年前】一切如旧']);
  });

  it('旧格式 "标题: 内容" 支持同行多选项', () => {
    const text = '调查: 翻文件 观察: 记下编号';
    expect(parseOptions(text, 5)).toEqual(['调查: 翻文件', '观察: 记下编号']);
  });

  it('count 截断结果数量', () => {
    const text = '<options>\n[一] 甲\n[二] 乙\n[三] 丙\n</options>';
    expect(parseOptions(text, 2)).toHaveLength(2);
  });

  it('空输入与无结构文本', () => {
    expect(parseOptions('', 5)).toEqual([]);
    expect(parseOptions('纯文本没有格式', 5)).toEqual(['纯文本没有格式']);
  });
});
