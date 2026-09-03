import type { PoolEntry } from '@/type/settings';

export type ResolvePoolResult = {
  pinned: PoolEntry[];
  drawn: PoolEntry[];
  selected: PoolEntry[];
  underflow: boolean;
};

const shuffled = <T>(list: T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** 条目抽取：均匀随机无放回抽样。
 *  历史上的 weight 加权、分组轮抽、打乱/溢出开关均已删（用户声明永不通过 UI 改条目参数，
 *  全部退化为固定行为）：固定条目全部保留不截断；不足目标数时有多少抽多少；结果整体打乱
 *  （避免固定条目总在开头造成 AI 顺序偏好）。场景适配由候选超发 + 生成 AI 终选负责。 */
export function resolvePool(input: { entries: PoolEntry[]; count: number }): ResolvePoolResult {
  const pinned = input.entries.filter(entry => entry.pinned);
  const rest = input.entries.filter(entry => !entry.pinned);
  const remaining = Math.max(input.count - pinned.length, 0);
  const drawn = shuffled(rest).slice(0, remaining);
  const selected = shuffled([...pinned, ...drawn]);
  return {
    // 打乱最终结果时也打乱 pinned 和 drawn，确保发给 AI 的提示词顺序随机
    pinned: shuffled(pinned),
    drawn,
    selected,
    underflow: selected.length < input.count,
  };
}
