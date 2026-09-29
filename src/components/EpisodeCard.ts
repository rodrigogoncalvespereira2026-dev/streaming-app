import type { Episode } from '../data/catalog';

/** Escapes a value for safe interpolation into HTML text/attributes. */
export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render state for a single episode card. All fields optional. */
export interface EpisodeCardState {
  favorite?: boolean;
  watched?: boolean;
  /** Resume position in seconds; omitted/0 hides the bar. */
  seconds?: number;
  /** Media duration in seconds; needed to compute a percentage. */
  duration?: number;
  /** Thumbnail URL. */
  thumb?: string;
  /** Accessible label for the favorite toggle. */
  favoriteLabel?: string;
  /**
   * Set false when a surrounding component renders the favorite control itself
   * (the accordion header does), so a card never exposes two identical buttons.
   */
  showFavorite?: boolean;
  /**
   * "card" emits a standalone <article>; "body" omits the wrapper so the caller
   * can supply its own container. Use "body" when nesting inside another
   * <article> to avoid invalid nested articles.
   */
  variant?: 'card' | 'body';
}

/** Minutes -> "42 min", skipping empty/invalid values. */
function runtime(min: number): string | null {
  if (!Number.isFinite(min) || min <= 0) return null;
  return `${Math.round(min)} min`;
}

const HEART =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.4 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z"/></svg>';

const PLAY =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
  '<path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

/**
 * Builds the semantic markup for one episode card.
 * Pure string function — no DOM access beyond the escaping helper.
 */
export function episodeCardHTML(ep: Episode, state: EpisodeCardState = {}): string {
  const num = Number(ep.num) || 0;
  const isFav = Boolean(state.favorite);
  const isWatched = Boolean(state.watched);
  const duration = Number(state.duration) || 0;
  const seconds = Number(state.seconds) || 0;
  const pct = duration > 0 ? Math.max(0, Math.min(100, (seconds / duration) * 100)) : 0;
  const hasProgress = duration > 0 && seconds > 0 && pct < 99.5;
  const showFavorite = state.showFavorite !== false;
  const standalone = (state.variant ?? 'card') === 'card';

  const title = `Episódio ${num}: ${ep.title}`;

  const thumb = state.thumb
    ? `<img src="${esc(state.thumb)}" alt="" loading="lazy" decoding="async" width="320" height="180">`
    : '<span class="skeleton skeleton-thumb" aria-hidden="true"></span>';

  const parts: string[] = [];

  if (standalone) {
    parts.push(
      `<article class="ep" data-ep="${esc(num)}"${isWatched ? ' data-watched="true"' : ''}>`,
    );
  }

  // Thumbnail + favorite toggle + progress
  parts.push(
    `<div class="ep-thumb">` +
      thumb +
      (showFavorite
        ? `<button type="button" class="fav-btn" data-action="favorite" data-num="${esc(num)}" ` +
          `aria-pressed="${isFav}" aria-label="${esc(state.favoriteLabel ?? (isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'))}">` +
          HEART +
          `</button>`
        : '') +
      `<span class="play" aria-hidden="true">${PLAY}</span>` +
      (hasProgress
        ? `<div class="progress" role="progressbar" aria-label="Progresso do episódio" ` +
          `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" ` +
          `style="--progress:${pct.toFixed(1)}%"><span class="bar"></span></div>`
        : '') +
      `</div>`,
  );

  // Header info
  parts.push(
    `<div class="ep-info">` +
      `<h3 class="name">${esc(title)}</h3>` +
      `<p class="sub">Episódio ${esc(num)}</p>` +
      `</div>`,
  );

  // Metadata — only rendered when present
  const meta: string[] = [];
  if (ep.airDate) meta.push(`<span class="tag">${esc(ep.airDate)}</span>`);
  const rt = ep.runtime ? runtime(ep.runtime) : null;
  if (rt) meta.push(`<span class="tag">${esc(rt)}</span>`);
  if (ep.rating) meta.push(`<span class="tag">${esc(ep.rating)}</span>`);
  if (ep.tags && ep.tags.length > 0) {
    meta.push(
      `<span class="tags">${ep.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>`,
    );
  }
  if (meta.length > 0) {
    parts.push(`<div class="tags" aria-label="Detalhes do episódio">${meta.join('')}</div>`);
  }

  if (ep.synopsis) {
    parts.push(`<p class="desc">${esc(ep.synopsis)}</p>`);
  }

  if (standalone) parts.push('</article>');

  return parts.join('');
}

export default episodeCardHTML;

