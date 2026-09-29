import { beforeEach, describe, expect, it } from 'vitest';
import {
  Signal,
  continueWatching,
  favorites,
  isFavorite,
  isWatched,
  progress,
  progressFor,
  recordProgress,
  toggleFavorite,
  toggleWatched,
  watched,
} from '../src/store';

beforeEach(() => {
  watched.set({});
  favorites.set([]);
  progress.set({});
  localStorage.clear();
});

describe('Signal', () => {
  it('notifies subscribers on change', () => {
    const s = new Signal(1);
    let calls = 0;
    s.subscribe(() => {
      calls += 1;
    });
    s.set(2);
    expect(calls).toBe(1);
    expect(s.get()).toBe(2);
  });

  it('skips notification for equal values', () => {
    const s = new Signal('a');
    let calls = 0;
    s.subscribe(() => {
      calls += 1;
    });
    s.set('a');
    expect(calls).toBe(0);
  });

  it('unsubscribes', () => {
    const s = new Signal(0);
    let calls = 0;
    const off = s.subscribe(() => {
      calls += 1;
    });
    off();
    s.set(5);
    expect(calls).toBe(0);
  });

  it('passes the new value to subscribers', () => {
    const s = new Signal(0);
    let seen = -1;
    s.subscribe((v) => {
      seen = v;
    });
    s.set(42);
    expect(seen).toBe(42);
  });
});

describe('watched episodes', () => {
  it('toggles on and off', () => {
    toggleWatched(4);
    expect(isWatched(4)).toBe(true);
    toggleWatched(4);
    expect(isWatched(4)).toBe(false);
  });

  it('persists to localStorage', () => {
    toggleWatched(7);
    expect(JSON.parse(localStorage.getItem('pf_watched') ?? '{}')).toEqual({ 7: true });
  });
});

describe('favorites', () => {
  it('toggles and persists', () => {
    toggleFavorite(9);
    expect(isFavorite(9)).toBe(true);
    expect(JSON.parse(localStorage.getItem('pf_favorites') ?? '[]')).toEqual([9]);
    toggleFavorite(9);
    expect(isFavorite(9)).toBe(false);
  });
});

describe('progress', () => {
  it('records and reads progress', () => {
    recordProgress(2, 30, 120);
    expect(progressFor(2)?.seconds).toBe(30);
  });

  it('ignores invalid durations', () => {
    recordProgress(3, 10, 0);
    expect(progressFor(3)).toBeUndefined();
  });

  it('lists up to three resumable episodes, newest first', () => {
    recordProgress(1, 10, 100);
    recordProgress(2, 20, 100);
    recordProgress(3, 30, 100);
    recordProgress(4, 40, 100);
    const list = continueWatching();
    expect(list.length).toBe(3);
    expect(list[0]).toBe(4);
  });

  it('excludes nearly finished and barely started episodes', () => {
    recordProgress(5, 99, 100);
    recordProgress(6, 1, 100);
    expect(continueWatching()).toEqual([]);
  });
});
