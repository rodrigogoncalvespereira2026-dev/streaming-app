import { beforeEach, describe, expect, it } from 'vitest';
import { editDistance, filterEpisodes, fold, score } from '../src/utils/search';
import { favorites, watched } from '../src/store';
import type { Episode } from '../src/data/catalog';

// Accented literals are written as escapes so the file is encoding-independent.
const COMECO = 'O Come\u00e7o';

const sample: Episode[] = [
  { num: 1, title: 'Presente, Passado e Futuro', synopsis: 'A Rede Morphin cria estatuas.' },
  { num: 2, title: COMECO, synopsis: 'Flashback antes da batalha.' },
  { num: 3, title: 'O Retorno', synopsis: 'Dez anos depois.' },
  { num: 26, title: 'Temporada Nova', synopsis: 'Continua.' },
];

beforeEach(() => {
  watched.set({});
  favorites.set([]);
});

describe('fold', () => {
  it('strips accents including cedilla', () => {
    expect(fold(COMECO)).toBe('o comeco');
    expect(fold('Coracao')).toBe('coracao');
  });
});

describe('editDistance', () => {
  it('is zero for identical strings', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
  });
  it('counts single edits', () => {
    expect(editDistance('abc', 'abd')).toBe(1);
  });
  it('rejects very different lengths cheaply', () => {
    expect(editDistance('a', 'abcdefgh')).toBe(99);
  });
});

describe('score', () => {
  it('ranks an exact episode number above a title hit', () => {
    const ep = sample[1] as Episode;
    expect(score(ep, '2')).toBeGreaterThan(score(ep, 'presente'));
  });
  it('matches an accent-insensitive title', () => {
    expect(score(sample[1] as Episode, 'comeco')).toBeGreaterThan(0);
  });
  it('tolerates small typos', () => {
    expect(score(sample[0] as Episode, 'presnte')).toBeGreaterThan(0);
  });
  it('rejects unrelated terms', () => {
    expect(score(sample[0] as Episode, 'zzzzz')).toBe(-1);
  });
});

describe('filterEpisodes', () => {
  const base = { season: 1, query: '', status: 'all' as const, perSeason: 25, total: 131 };

  it('limits to the selected season range', () => {
    expect(filterEpisodes(sample, base).map((e) => e.num)).toEqual([1, 2, 3]);
  });

  it('switches season windows', () => {
    expect(filterEpisodes(sample, { ...base, season: 2 }).map((e) => e.num)).toEqual([26]);
  });

  it('filters by watched status', () => {
    watched.set({ 2: true });
    expect(filterEpisodes(sample, { ...base, status: 'watched' }).map((e) => e.num)).toEqual([2]);
    expect(filterEpisodes(sample, { ...base, status: 'unwatched' }).map((e) => e.num)).toEqual([1, 3]);
  });

  it('filters by favorites', () => {
    favorites.set([3]);
    expect(filterEpisodes(sample, { ...base, status: 'favorites' }).map((e) => e.num)).toEqual([3]);
  });

  it('searches and sorts by relevance', () => {
    expect(filterEpisodes(sample, { ...base, query: 'retorno' })[0]?.num).toBe(3);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterEpisodes(sample, { ...base, query: 'qqqqqqqq' })).toEqual([]);
  });
});
