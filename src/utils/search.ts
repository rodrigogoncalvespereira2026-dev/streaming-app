import type { Episode } from '../data/catalog';
import { favorites, isWatched } from '../store';
import type { StatusFilter } from '../store';

export interface SearchOptions {
  season: number;
  query: string;
  status: StatusFilter;
  perSeason: number;
  total: number;
}

/** Levenshtein distance with a length guard for cheap fuzzy matching. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0] as number;
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j] as number;
      const left = prev[j - 1] as number;
      prev[j] = Math.min(left + 1, temp + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length] as number;
}

/**
 * Lowercase and strip diacritics so "comeco" matches "Começo".
 * The range must extend past U+036F: ç decomposes to c + U+0327.
 */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0]/g, '');
}

export function score(ep: Episode, term: string): number {
  if (String(ep.num) === term) return 1000;
  const title = fold(ep.title);
  if (title.startsWith(term)) return 500;
  if (title.includes(term)) return 400;
  if (fold(ep.synopsis ?? '').includes(term)) return 250;
  // One typo per four characters, so "presnte" still matches "presente".
  const tolerance = Math.max(1, Math.round(term.length / 4));
  const best = title.split(/\s+/).reduce((acc, w) => Math.min(acc, editDistance(w, term)), 99);
  return best <= tolerance ? 100 - best : -1;
}

export function filterEpisodes(episodes: Episode[], opts: SearchOptions): Episode[] {
  const { season: s, query: q, status, perSeason, total } = opts;
  const start = (s - 1) * perSeason + 1;
  const end = Math.min(s * perSeason, total);
  let list = episodes.filter((ep) => ep.num >= start && ep.num <= end);

  if (status === 'watched') list = list.filter((ep) => isWatched(ep.num));
  else if (status === 'unwatched') list = list.filter((ep) => !isWatched(ep.num));
  else if (status === 'favorites') list = list.filter((ep) => favorites.get().includes(ep.num));

  const term = fold(q.trim());
  if (!term) return list;

  return list
    .map((ep) => ({ ep, s: score(ep, term) }))
    .filter((r) => r.s >= 0)
    .sort((a, b) => b.s - a.s || a.ep.num - b.ep.num)
    .map((r) => r.ep);
}
