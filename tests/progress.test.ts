import { describe, expect, it } from 'vitest';
import { nextToWatch, overallProgress, seasonProgress, seasonRange } from '../src/store';

const PER_SEASON = 25;
const TOTAL = 131;

/** Builds a `isWatched`-style predicate from a list of episode numbers. */
function seenSet(nums: number[]): (n: number) => boolean {
  const set = new Set(nums);
  return (n: number) => set.has(n);
}

describe('seasonRange', () => {
  it('computes the episode span of a season', () => {
    expect(seasonRange(1, PER_SEASON, TOTAL)).toEqual([1, 25]);
    expect(seasonRange(2, PER_SEASON, TOTAL)).toEqual([26, 50]);
  });

  it('clamps the last, partial season', () => {
    // 131 episodes over 25 per season means season 6 holds 126-131.
    expect(seasonRange(6, PER_SEASON, TOTAL)).toEqual([126, 131]);
  });
});

describe('seasonProgress', () => {
  it('counts watched episodes in the season', () => {
    const p = seasonProgress(1, PER_SEASON, TOTAL, seenSet([1, 2, 3]));
    expect(p).toEqual({ season: 1, total: 25, seen: 3, percent: 12 });
  });

  it('ignores watched episodes from other seasons', () => {
    const p = seasonProgress(1, PER_SEASON, TOTAL, seenSet([1, 30, 40]));
    expect(p.seen).toBe(1);
  });

  it('returns zero when nothing is watched', () => {
    expect(seasonProgress(1, PER_SEASON, TOTAL, seenSet([])).seen).toBe(0);
  });

  it('reaches 100 percent when the season is complete', () => {
    const all = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(seasonProgress(1, PER_SEASON, TOTAL, seenSet(all)).percent).toBe(100);
  });

  it('handles the short last season', () => {
    const p = seasonProgress(6, PER_SEASON, TOTAL, seenSet([126, 127]));
    expect(p.total).toBe(6);
    expect(p.percent).toBe(33);
  });
});

describe('overallProgress', () => {
  it('reports the global count and a floored percentage', () => {
    const p = overallProgress(TOTAL, seenSet([1, 2, 3]));
    expect(p.seen).toBe(3);
    expect(p.percent).toBe(2);
  });

  it('rounds down rather than to nearest', () => {
    // 5 of 131 is 3.81%, floored to 3.
    expect(overallProgress(TOTAL, seenSet([1, 2, 3, 4, 5])).percent).toBe(3);
  });

  it('is 0 percent with nothing watched and 100 when complete', () => {
    expect(overallProgress(TOTAL, seenSet([])).percent).toBe(0);
    const all = Array.from({ length: TOTAL }, (_, i) => i + 1);
    expect(overallProgress(TOTAL, seenSet(all)).percent).toBe(100);
  });

  it('avoids division by zero for an empty catalog', () => {
    expect(overallProgress(0, seenSet([])).percent).toBe(0);
  });
});

describe('nextToWatch', () => {
  it('returns the first unwatched episode of the season', () => {
    expect(nextToWatch(1, PER_SEASON, TOTAL, seenSet([]))).toBe(1);
    expect(nextToWatch(1, PER_SEASON, TOTAL, seenSet([1, 2]))).toBe(3);
  });

  it('prefers an episode already in progress', () => {
    const next = nextToWatch(1, PER_SEASON, TOTAL, seenSet([1, 2]), (n) => n === 4);
    expect(next).toBe(4);
  });

  it('returns null when the whole season is watched', () => {
    const all = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(nextToWatch(1, PER_SEASON, TOTAL, seenSet(all))).toBeNull();
  });

  it('scopes the search to the requested season', () => {
    // Season 2 starts at 26; a complete season 1 must not leak into it.
    const s1 = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(nextToWatch(2, PER_SEASON, TOTAL, seenSet(s1))).toBe(26);
  });
});
