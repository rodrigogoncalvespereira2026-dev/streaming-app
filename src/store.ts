export type Listener<T> = (value: T) => void;

/** Minimal reactive primitive: a value plus subscriber fan-out. */
export class Signal<T> {
  private subs = new Set<Listener<T>>();
  constructor(private value: T) {}
  get(): T {
    return this.value;
  }
  set(next: T): void {
    if (Object.is(next, this.value)) return;
    this.value = next;
    this.subs.forEach((fn) => fn(this.value));
  }
  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }
  subscribe(fn: Listener<T>): () => void {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }
}

export interface ProgressEntry {
  seconds: number;
  duration: number;
  updatedAt: number;
  /** Monotonic counter so same-millisecond updates still order deterministically. */
  seq: number;
}

export type StatusFilter = 'all' | 'watched' | 'unwatched' | 'favorites';
export type ThemeChoice = 'dark' | 'light' | 'system';

const KEYS = {
  watched: 'pf_watched',
  favorites: 'pf_favorites',
  progress: 'pf_progress',
  settings: 'pf_settings',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota exceeded: state stays in memory only */
  }
}

export const watched = new Signal<Record<number, boolean>>(
  read<Record<string, boolean>>(KEYS.watched, {}),
);
export const favorites = new Signal<number[]>(read<number[]>(KEYS.favorites, []));
export const progress = new Signal<Record<number, ProgressEntry>>(
  read<Record<string, ProgressEntry>>(KEYS.progress, {}),
);
export const season = new Signal<number>(1);
export const query = new Signal<string>('');
export const statusFilter = new Signal<StatusFilter>('all');
export const theme = new Signal<ThemeChoice>(
  read<{ theme?: ThemeChoice }>(KEYS.settings, {}).theme ?? 'system',
);

let seqCounter = 0;

watched.subscribe((v) => write(KEYS.watched, v));
favorites.subscribe((v) => write(KEYS.favorites, v));
progress.subscribe((v) => write(KEYS.progress, v));
theme.subscribe((v) => write(KEYS.settings, { theme: v }));

export function toggleWatched(num: number): void {
  watched.update((cur) => {
    const next = { ...cur };
    if (next[num]) delete next[num];
    else next[num] = true;
    return next;
  });
}

export function isWatched(num: number): boolean {
  return Boolean(watched.get()[num]);
}

export function toggleFavorite(num: number): void {
  favorites.update((cur) => (cur.includes(num) ? cur.filter((n) => n !== num) : [...cur, num]));
}

export function isFavorite(num: number): boolean {
  return favorites.get().includes(num);
}

export function recordProgress(num: number, seconds: number, duration: number): void {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return;
  seqCounter += 1;
  const entry: ProgressEntry = { seconds, duration, updatedAt: Date.now(), seq: seqCounter };
  progress.update((cur) => ({ ...cur, [num]: entry }));
}

export function progressFor(num: number): ProgressEntry | undefined {
  return progress.get()[num];
}

/** Up to `count` episodes with real partial progress, most recently played first. */
export function continueWatching(count = 3): number[] {
  const entries = Object.entries(progress.get()) as [string, ProgressEntry][];
  return entries
    .filter(([, p]) => p.seconds >= 5 && p.seconds / p.duration < 0.95)
    // seq is absent on entries written by earlier builds, hence the ?? 0.
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt || (b[1].seq ?? 0) - (a[1].seq ?? 0))
    .slice(0, count)
    .map(([n]) => Number(n));
}

/** Applies the theme choice to <html> so CSS tokens resolve. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}
