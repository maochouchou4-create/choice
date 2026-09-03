import type { PoolEntry } from '@/type/settings';

export type ResolvePoolInput = {
  effectivePool: PoolEntry[];
  count: number;
  shuffleFinal: boolean;
  pinnedOverflow: 'send_all' | 'trim';
};

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

const safeWeight = (entry: PoolEntry): number => {
  const w = entry.weight;
  return typeof w === 'number' && Number.isFinite(w) && w >= 0 ? w : 1;
};

const weightedPick = (entries: PoolEntry[], amount: number): PoolEntry[] => {
  return shuffled(entries)
    .map(entry => ({ entry, key: Math.pow(Math.random(), 1 / Math.max(safeWeight(entry), 0.0001)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, amount)
    .map(item => item.entry);
};

export function resolvePool(input: ResolvePoolInput): ResolvePoolResult {
  const pinned = input.effectivePool.filter(entry => entry.pinned);
  const pool = input.effectivePool.filter(entry => !entry.pinned);

  let pinnedUsed = pinned;
  let remaining = 0;
  if (pinnedUsed.length > input.count) {
    if (input.pinnedOverflow === 'trim') {
      // 随机截断：先打乱再取前 count 条，避免总是截掉末尾的条目
      pinnedUsed = shuffled(pinnedUsed).slice(0, input.count);
      remaining = 0;
    } else {
      remaining = 0;
    }
  } else {
    remaining = Math.max(input.count - pinnedUsed.length, 0);
  }

  // 分组轮抽已删（用户拍板：会抽到不适合的分组）——统一走全局加权抽取，
  // 场景适配交给候选超发 + 生成 AI 终选
  const drawn = weightedPick(pool, remaining);

  let selected = [...pinnedUsed, ...drawn];
  if (input.shuffleFinal) {
    selected = shuffled(selected);
  }

  return {
    // 打乱最终结果时也打乱 pinned 和 drawn，确保发给 AI 的提示词顺序随机
    pinned: input.shuffleFinal ? shuffled(pinnedUsed) : pinnedUsed,
    drawn: input.shuffleFinal ? shuffled(drawn) : drawn,
    selected,
    underflow: selected.length < input.count,
  };
}
