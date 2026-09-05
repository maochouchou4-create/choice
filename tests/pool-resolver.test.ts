import { describe, expect, it } from 'vitest';
import { resolvePool } from '@/core/pool-resolver';
import type { PoolEntry } from '@/type/settings';

const make = (id: string, pinned = false): PoolEntry => ({
  id,
  type: '行动',
  content: `内容 ${id}`,
  rule: '',
  pinned,
  category: '',
});

const range = (n: number, prefix = 'e'): PoolEntry[] =>
  Array.from({ length: n }, (_, i) => make(`${prefix}${i}`));

describe('resolvePool', () => {
  it('pinned 条目无论 count 多少全部保留', () => {
    const entries = [...range(3, 'p').map(e => ({ ...e, pinned: true })), ...range(10)];
    const r = resolvePool({ entries, count: 2 });
    expect(r.pinned).toHaveLength(3);
    expect(r.selected.filter(e => e.pinned)).toHaveLength(3);
    expect(r.underflow).toBe(false);
  });

  it('普通条目无放回抽取：数量正确且不重复', () => {
    const entries = range(20);
    const r = resolvePool({ entries, count: 5 });
    expect(r.drawn).toHaveLength(5);
    const ids = r.drawn.map(e => e.id);
    expect(new Set(ids).size).toBe(5);
    expect(r.pinned).toHaveLength(0);
  });

  it('selected 为 pinned 全集 + 补足到 count 的普通条目', () => {
    const entries = [...range(2, 'p').map(e => ({ ...e, pinned: true })), ...range(8)];
    const r = resolvePool({ entries, count: 4 });
    expect(r.selected).toHaveLength(4);
    expect(r.selected.filter(e => e.pinned)).toHaveLength(2);
    expect(r.drawn).toHaveLength(2);
    expect(new Set(r.selected.map(e => e.id)).size).toBe(4);
    expect(r.underflow).toBe(false);
  });

  it('count 超过池子总量：有多少抽多少并标记 underflow', () => {
    const entries = [...range(1, 'p').map(e => ({ ...e, pinned: true })), ...range(4)];
    const r = resolvePool({ entries, count: 10 });
    expect(r.selected).toHaveLength(5);
    expect(r.underflow).toBe(true);
  });

  it('count 为 0：普通条目不抽，pinned 仍全发', () => {
    const entries = [...range(2, 'p').map(e => ({ ...e, pinned: true })), ...range(6)];
    const r = resolvePool({ entries, count: 0 });
    expect(r.drawn).toHaveLength(0);
    expect(r.pinned).toHaveLength(2);
    expect(r.selected).toHaveLength(2);
  });

  it('空池返回全空结果', () => {
    const r = resolvePool({ entries: [], count: 4 });
    expect(r.pinned).toHaveLength(0);
    expect(r.drawn).toHaveLength(0);
    expect(r.selected).toHaveLength(0);
    expect(r.underflow).toBe(true);
  });

  it('不修改输入数组', () => {
    const entries = range(10);
    const before = entries.map(e => e.id);
    resolvePool({ entries, count: 5 });
    expect(entries.map(e => e.id)).toEqual(before);
  });
});
