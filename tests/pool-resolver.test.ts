import { describe, expect, it } from 'vitest';
import { resolvePool } from '@/core/pool-resolver';
import type { PoolEntry } from '@/type/settings';

const make = (id: string, category: string, pinned = false): PoolEntry => ({
  id,
  type: '行动',
  content: `内容 ${id}`,
  rule: '',
  pinned,
  category,
});

/** 造 n 组、每组每组 g 条的池子 */
const makeGroups = (groups: number, perGroup: number): PoolEntry[] =>
  Array.from({ length: groups }, (_, g) =>
    Array.from({ length: perGroup }, (_, i) => make(`g${g}-${i}`, `组${g}`)),
  ).flat();

describe('resolvePool 分层抽取', () => {
  it('pinned 条目无论名额多少全部保留且不占随机名额', () => {
    const entries = [...makeGroups(3, 5), make('p-0', '组X', true)];
    const r = resolvePool({ entries, count: 5 });
    expect(r.pinned).toHaveLength(1);
    expect(r.selected.filter(e => e.pinned)).toHaveLength(1);
    expect(r.drawn).toHaveLength(4); // 随机名额 = 5 - pinned 1
    expect(r.underflow).toBe(false);
  });

  it('名额充足时每组保底 1 条', () => {
    const entries = makeGroups(4, 5); // 20 条，4 组
    const r = resolvePool({ entries, count: 10 });
    expect(r.drawn).toHaveLength(10);
    const counts = new Map<string, number>();
    for (const e of r.drawn) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    expect(counts.size).toBe(4);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(1);
  });

  it('名额不足组数时降级为随机选组、每组至多 1 条', () => {
    const entries = makeGroups(5, 4); // 5 组
    const r = resolvePool({ entries, count: 3 });
    expect(r.drawn).toHaveLength(3);
    expect(new Set(r.drawn.map(e => e.category)).size).toBe(3);
  });

  it('抽取无放回：不重复', () => {
    const entries = makeGroups(4, 5);
    const r = resolvePool({ entries, count: 12 });
    const ids = r.drawn.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('count 超过池子总量：有多少抽多少并标记 underflow', () => {
    const entries = [...makeGroups(3, 4), make('p-0', '组X', true)];
    const r = resolvePool({ entries, count: 50 });
    expect(r.selected).toHaveLength(13);
    expect(r.underflow).toBe(true);
  });

  it('count 为 0：随机候选不抽，pinned 仍全发', () => {
    const entries = [make('p-0', '组X', true), ...makeGroups(3, 4)];
    const r = resolvePool({ entries, count: 0 });
    expect(r.drawn).toHaveLength(0);
    expect(r.pinned).toHaveLength(1);
    expect(r.selected).toHaveLength(1);
  });

  it('空池返回全空结果', () => {
    const r = resolvePool({ entries: [], count: 4 });
    expect(r.pinned).toHaveLength(0);
    expect(r.drawn).toHaveLength(0);
    expect(r.selected).toHaveLength(0);
    expect(r.underflow).toBe(true);
  });

  it('单组池子退化为纯随机：不重复、数量正确', () => {
    const entries = makeGroups(1, 10);
    const r = resolvePool({ entries, count: 6 });
    expect(r.drawn).toHaveLength(6);
    expect(new Set(r.drawn.map(e => e.id)).size).toBe(6);
  });

  it('不修改输入数组', () => {
    const entries = makeGroups(3, 5);
    const before = entries.map(e => e.id);
    resolvePool({ entries, count: 7 });
    expect(entries.map(e => e.id)).toEqual(before);
  });
});
