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

/** 条目抽取：分层随机抽样。
 *  历史上的 weight 加权、分组轮抽、[条件] 挂载均已删（条目＝通用行动原型，
 *  人设由生成 AI 改写时上色）。分层规则＝每个 category（行动层面）先保底抽 1 条，
 *  保证一次候选覆盖全部层面；名额不足组数时随机选组、每组 1 条；
 *  剩余名额从余下条目中全池随机补足。结果整体打乱（避免固定条目总在开头
 *  造成 AI 顺序偏好）。underflow＝池子总量不足目标数。 */
export function resolvePool(input: { entries: PoolEntry[]; count: number }): ResolvePoolResult {
  const pinned = input.entries.filter(entry => entry.pinned);
  const rest = input.entries.filter(entry => !entry.pinned);
  const quota = Math.max(input.count - pinned.length, 0);

  // 分组打乱：组内顺序随机（每组抽 1 即随机取首条），组间顺序随机（名额不足时等价于随机选组）
  const byCategory = new Map<string, PoolEntry[]>();
  for (const entry of rest) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }
  const layerOrder = shuffled([...byCategory.values()].map(group => shuffled(group)));

  // 第一轮：每组保底 1 条，直到名额用尽
  const drawn: PoolEntry[] = [];
  const picked = new Set<PoolEntry>();
  for (const group of layerOrder) {
    if (drawn.length >= quota) break;
    const first = group[0];
    drawn.push(first);
    picked.add(first);
  }

  // 第二轮：剩余名额从余下条目全池随机补足
  if (drawn.length < quota) {
    const leftover = shuffled(rest.filter(entry => !picked.has(entry)));
    drawn.push(...leftover.slice(0, quota - drawn.length));
  }

  const finalDrawn = shuffled(drawn);
  const selected = shuffled([...pinned, ...finalDrawn]);
  return {
    pinned: shuffled(pinned),
    drawn: finalDrawn,
    selected,
    underflow: selected.length < input.count,
  };
}
