import './styles/main.css';

import { DEFAULT_VIDEO, episodes, trailers } from './data/catalog';
import type { Episode } from './data/catalog';
import { episodeCardHTML, esc } from './components/EpisodeCard';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { VideoPlayer } from './components/VideoPlayer';
import {
  applyTheme,
  continueWatching,
  favorites,
  isFavorite,
  isWatched,
  progress,
  progressFor,
  query,
  recordProgress,
  season,
  statusFilter,
  theme,
  toggleFavorite,
  toggleWatched,
  watched,
} from './store';
import { filterEpisodes } from './utils/search';
import { downloadVideo, onOfflineEvent, registerOffline, watchConnection } from './utils/offline';
import { UniversePanels } from './components/universePanels';

const PER_SEASON = 25;
const TOTAL = episodes.length;
const SEASONS = Math.ceil(TOTAL / PER_SEASON);
const RANGER_COLORS = [
  '#e63946', '#1d7fe0', '#f2b93a', '#2fae60',
  '#8a4fd1', '#e0663d', '#2fc6d9', '#c93f9a',
];

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error('Elemento em falta: #' + id);
  return el as T;
};

const toast = new Toast($('toast'));
const announce = (msg: string): void => {
  $('srAnnounce').textContent = msg;
};
/* ---------------- Theme ---------------- */

function syncThemeIcon(): void {
  const resolved =
    theme.get() === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme.get();
  $('themeIcon').innerHTML = resolved === 'light' ? '&#9789;' : '&#9788;';
}

applyTheme(theme.get());
syncThemeIcon();
theme.subscribe(() => {
  applyTheme(theme.get());
  syncThemeIcon();
});
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', syncThemeIcon);

$('themeBtn').addEventListener('click', () => {
  const resolved =
    theme.get() === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme.get();
  theme.set(resolved === 'dark' ? 'light' : 'dark');
  announce('Tema ' + theme.get());
});

/* ---------------- Tabs ---------------- */

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab'));

function selectTab(tab: HTMLElement): void {
  tabs.forEach((t) => {
    const on = t === tab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.dataset.panel ?? '');
    if (panel) {
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    }
  });
  // Never leave audio running in a hidden panel.
  document.querySelectorAll<HTMLVideoElement>('.panel:not(.active) video').forEach((v) => v.pause());
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    e.preventDefault();
    const next =
      key === 'Home'
        ? tabs[0]
        : key === 'End'
          ? tabs[tabs.length - 1]
          : tabs[(i + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    if (next) {
      next.focus();
      selectTab(next);
    }
  });
});

/* ---------------- Season + filters ---------------- */

const seasonSelect = $<HTMLSelectElement>('seasonSelect');
seasonSelect.innerHTML = Array.from({ length: SEASONS }, (_, i) => {
  const s = i + 1;
  const start = (s - 1) * PER_SEASON + 1;
  const end = Math.min(s * PER_SEASON, TOTAL);
  return '<option value="' + s + '">Temp. ' + s + ' (' + start + '-' + end + ')</option>';
}).join('');
seasonSelect.addEventListener('change', () => {
  season.set(Number(seasonSelect.value));
  query.set('');
  $<HTMLInputElement>('searchInput').value = '';
});

const searchInput = $<HTMLInputElement>('searchInput');
let debounce = 0;
searchInput.addEventListener('input', () => {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => query.set(searchInput.value), 120);
});

document.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-pressed', String(c === chip));
    });
    statusFilter.set((chip.dataset.status as 'all') ?? 'all');
  });
});

/* ---------------- Player ---------------- */

let player: VideoPlayer | null = null;
let currentId = 0;

function ensurePlayer(host: HTMLElement, num: number): VideoPlayer {
  player?.destroy();
  host.innerHTML = '';
  const p = new VideoPlayer(host, {
    startAt: progressFor(num)?.seconds ?? 0,
    onProgress: (id, seconds, duration) => {
      const n = Number(id);
      if (Number.isFinite(n)) recordProgress(n, seconds, duration);
      renderContinue();
    },
    onEnded: (id) => {
      const n = Number(id);
      if (Number.isFinite(n) && !isWatched(n)) {
        toggleWatched(n);
        announce('Epis\u00f3dio ' + n + ' marcado como visto');
      }
      renderEpisodes();
    },
  });
  currentId = num;
  return p;
}

function playEpisode(ep: Episode, host: HTMLElement, autoplay: boolean): void {
  const src = ep.video ?? DEFAULT_VIDEO;
  const p = ensurePlayer(host, ep.num);
  p.load(src, { title: 'Epis\u00f3dio ' + ep.num + ': ' + ep.title, id: String(ep.num) }, autoplay);
}

/* ---------------- Episode list ---------------- */

const epList = $('epList');
const openEpisodes = new Set<number>();

function cardHTML(ep: Episode): string {
  const pr = progressFor(ep.num);
  return (
    '<article class="ep" data-ep="' +
    esc(ep.num) +
    '"' +
    (isWatched(ep.num) ? ' data-watched="true"' : '') +
    '>' +
    '<div class="ep-head">' +
    // A real button avoids nesting one interactive control inside another.
    '<button type="button" class="ep-toggle" data-action="toggle" ' +
    'aria-expanded="false" aria-controls="ep-body-' +
    esc(ep.num) +
    '">' +
    '<span class="ep-thumb" style="--ep-color:' +
    RANGER_COLORS[ep.num % RANGER_COLORS.length] +
    '" aria-hidden="true"><span class="skeleton skeleton-thumb"></span></span>' +
    '<span class="ep-info"><span class="name">' +
    esc(ep.title) +
    '</span><span class="sub">Epis\u00f3dio ' +
    esc(ep.num) +
    (isWatched(ep.num) ? ' \u00b7 visto' : '') +
    '</span></span>' +
    '<span class="chevron" aria-hidden="true">&#9662;</span>' +
    '</button>' +
    '<button type="button" class="fav-btn" data-action="favorite" data-num="' +
    esc(ep.num) +
    '" aria-pressed="' +
    String(isFavorite(ep.num)) +
    '" aria-label="' +
    esc(isFavorite(ep.num) ? 'Remover dos favoritos' : 'Adicionar aos favoritos') +
    '">' +
    '&#9829;' +
    '</button>' +
    '</div>' +
    '<div class="ep-body" id="ep-body-' +
    esc(ep.num) +
    '" role="region" hidden><div class="ep-body-inner">' +
    episodeCardHTML(ep, {
      favorite: isFavorite(ep.num),
      watched: isWatched(ep.num),
      seconds: pr?.seconds,
      duration: pr?.duration,
      showFavorite: false,
      variant: 'body',
    }) +
    '<div class="ep-video" id="ep-video-' +
    esc(ep.num) +
    '"></div>' +
    '<div class="ep-actions">' +
    '<button type="button" class="pill' +
    (isWatched(ep.num) ? ' watched' : '') +
    '" data-action="watched" data-num="' +
    esc(ep.num) +
    '">' +
    esc(isWatched(ep.num) ? 'Marcar como nao visto' : 'Marcar visto') +
    '</button>' +
    '<button type="button" class="pill" data-action="copy" data-num="' +
    esc(ep.num) +
    '">Copiar sinopse</button>' +
    '<button type="button" class="pill" data-action="download" data-num="' +
    esc(ep.num) +
    '">Transferir offline</button>' +
    '<button type="button" class="pill" data-action="share" data-num="' +
    esc(ep.num) +
    '">Partilhar</button>' +
    '</div></div></div></article>'
  );
}

function renderEpisodes(): void {
  const list = filterEpisodes(episodes, {
    season: season.get(),
    query: query.get(),
    status: statusFilter.get(),
    perSeason: PER_SEASON,
    total: TOTAL,
  });

  $('resultCount').textContent =
    list.length + (list.length === 1 ? ' resultado' : ' resultados') +
    (query.get() ? ' para "' + query.get() + '"' : '');

  epList.innerHTML = list.map(cardHTML).join('');
  $('emptyEps').hidden = list.length > 0;

  // Re-open whatever the user had expanded before the re-render.
  list.forEach((ep) => {
    if (openEpisodes.has(ep.num)) expand(ep.num, false);
  });
}

function expand(num: number, scroll: boolean): void {
  const card = epList.querySelector<HTMLElement>('article[data-ep="' + num + '"]');
  if (!card) return;
  const head = card.querySelector<HTMLElement>('.ep-toggle');
  const body = card.querySelector<HTMLElement>('.ep-body');
  if (!head || !body) return;
  const open = body.hidden;
  body.hidden = !open;
  head.setAttribute('aria-expanded', String(open));
  card.classList.toggle('open', open);
  if (open) {
    openEpisodes.add(num);
    const host = card.querySelector<HTMLElement>('.ep-video');
    const ep = episodes.find((e) => e.num === num);
    if (host && ep && !host.dataset.loaded) {
      host.dataset.loaded = '1';
      playEpisode(ep, host, false);
    }
    if (scroll) head.scrollIntoView({ block: 'nearest' });
  } else {
    openEpisodes.delete(num);
  }
}

epList.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const actionBtn = target.closest<HTMLElement>('[data-action]');
  const card = target.closest<HTMLElement>('article[data-ep]');
  const num = Number(card?.dataset.ep ?? NaN);

  if (actionBtn) {
    e.stopPropagation();
    const action = actionBtn.dataset.action;
    const ep = episodes.find((x) => x.num === num);
    if (action === 'favorite') {
      toggleFavorite(num);
      announce(isFavorite(num) ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    } else if (action === 'watched' && ep) {
      toggleWatched(num);
      announce(isWatched(num) ? 'Marcado como visto' : 'Marcado como nao visto');
    } else if (action === 'copy' && ep?.synopsis) {
      void navigator.clipboard?.writeText(ep.synopsis);
      toast.show('Sinopse copiada');
    } else if (action === 'download' && ep) {
      const url = ep.video ?? DEFAULT_VIDEO;
      downloadVideo(url)
        .then(() => toast.show('Epis\u00f3dio ' + num + ' em fila para offline'))
        .catch(() => toast.show('Offline indispon\u00edvel neste browser'));
    } else if (action === 'share' && ep) {
      void shareEpisode(ep);
    }
    if (action !== 'toggle') {
      renderEpisodes();
      renderContinue();
    }
  }

  const toggle = target.closest<HTMLElement>('.ep-toggle');
  if (toggle && card && Number.isFinite(num)) expand(num, false);
});

epList.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
  const toggle = (e.target as HTMLElement).closest<HTMLElement>('.ep-toggle');
  if (!toggle) return;
  e.preventDefault();
  const heads = Array.from(epList.querySelectorAll<HTMLElement>('.ep-toggle'));
  const i = heads.indexOf(toggle);
  const next =
    key === 'Home'
      ? heads[0]
      : key === 'End'
        ? heads[heads.length - 1]
        : heads[(i + (key === 'ArrowDown' ? 1 : heads.length - 1)) % heads.length];
  next?.focus();
});

async function shareEpisode(ep: Episode): Promise<void> {
  const url = location.origin + location.pathname + '#ep-' + ep.num;
  const data = { title: 'Primal Force - Epis\u00f3dio ' + ep.num, text: ep.title, url };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch {
      /* user dismissed the sheet */
    }
  }
  try {
    await navigator.clipboard?.writeText(url);
    toast.show('Liga\u00e7\u00e3o copiada');
  } catch {
    toast.show('Partilha n\u00e3o suportada');
  }
}

/* ---------------- Continue watching ---------------- */

function renderContinue(): void {
  const row = $('continueRow');
  const nums = continueWatching();
  if (nums.length === 0) {
    row.hidden = true;
    return;
  }
  row.hidden = false;
  $('continueList').innerHTML = nums
    .map((n) => {
      const ep = episodes.find((x) => x.num === n);
      const pr = progressFor(n);
      const pct = pr ? Math.round((pr.seconds / pr.duration) * 100) : 0;
      return (
        '<button type="button" class="continue-card" data-num="' +
        esc(n) +
        '">' +
        '<span class="t">' +
        esc('Epis\u00f3dio ' + n + (ep ? ': ' + ep.title : '')) +
        '</span>' +
        '<span class="progress" role="progressbar" aria-label="Progresso" aria-valuenow="' +
        pct +
        '" aria-valuemin="0" aria-valuemax="100" style="--progress:' +
        pct +
        '%"><span class="bar"></span></span>' +
        '</button>'
      );
    })
    .join('');
}

$('continueList').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('.continue-card');
  if (!btn) return;
  const num = Number(btn.dataset.num);
  const ep = episodes.find((x) => x.num === num);
  if (!ep) return;
  if (Number(seasonSelect.value) !== Math.ceil(num / PER_SEASON)) {
    seasonSelect.value = String(Math.ceil(num / PER_SEASON));
    season.set(Number(seasonSelect.value));
  }
  renderEpisodes();
  openEpisodes.add(num);
  expand(num, true);
});

/* ---------------- Trailers ---------------- */

let activeTrailer = 0;

function renderTrailers(autoplay = false): void {
  const list = $('trailerList');
  if (trailers.length === 0) {
    $('trailerMain').hidden = true;
    list.hidden = true;
    return;
  }
  const cur = trailers[activeTrailer] ?? trailers[0];
  if (!cur) return;
  $('trailerMain').hidden = false;
  list.hidden = false;
  $('trailerMain').innerHTML =
    '<div class="trailer-main"><div class="frame" id="trailerFrame"></div>' +
    '<div class="info"><div class="badge">' +
    esc(activeTrailer === 0 ? 'TRAILER PRINCIPAL' : 'TEASER ' + (activeTrailer + 1) + ' DE ' + trailers.length) +
    '</div><div class="tag">' +
    esc(cur.title ?? '') +
    '</div><p>' +
    esc(cur.description ?? '') +
    '</p></div></div>';

  const frame = $('trailerFrame');
  const tp = new VideoPlayer(frame, { onEnded: () => toast.show('Trailer terminado') });
  tp.load(cur.video ?? DEFAULT_VIDEO, { title: cur.title ?? 'Trailer' }, autoplay);
  trailerPlayer?.destroy();
  trailerPlayer = tp;

  list.innerHTML = trailers
    .map((tr, i) =>
      '<button type="button" class="trailer-card' +
      (i === activeTrailer ? ' active' : '') +
      '" data-i="' +
      i +
      '" aria-pressed="' +
      String(i === activeTrailer) +
      '"><span class="t">' +
      esc(tr.title ?? 'V\u00eddeo ' + (i + 1)) +
      '</span></button>',
    )
    .join('');
}

let trailerPlayer: VideoPlayer | null = null;

/* ---------------- Universo: Rangers, Vilaes, Glossario, Linha do Tempo ---------------- */

/**
 * Abre um episodio a partir de outro separador: muda para Episodios, salta para
 * a temporada certa, abre o acordeao e faz scroll ate ele.
 */
function gotoEpisode(num: number): void {
  const ep = episodes.find((e) => e.num === num);
  if (!ep) {
    toast.show('Episodio ' + num + ' nao existe no catalogo');
    return;
  }
  const targetSeason = Math.ceil(num / PER_SEASON);
  if (Number(seasonSelect.value) !== targetSeason) {
    seasonSelect.value = String(targetSeason);
    season.set(targetSeason);
  }
  statusFilter.set('all');
  query.set('');
  searchInput.value = '';
  document.querySelectorAll<HTMLElement>('.chip').forEach((c) => {
    const on = c.dataset.status === 'all';
    c.classList.toggle('active', on);
    c.setAttribute('aria-pressed', String(on));
  });
  selectTab($('tabEp'));
  renderEpisodes();
  openEpisodes.add(num);
  expand(num, true);
  announce('Episodio ' + num + ' aberto');
}

const panels = new UniversePanels();

function renderUniversePanels(): void {
  panels.renderMasters($('masterList'), $('rgNote'));
  panels.renderVillains($('villainList'), $('vlNote'));
  panels.renderGlossary(
    $('glossaryList'),
    $('glossaryIndex'),
    $('glossaryCount'),
    $<HTMLInputElement>('glossaryInput'),
  );
  panels.renderTimeline($('timelineList'), $<HTMLSelectElement>('arcSelect'));
  UniversePanels.wire($('villainList'), gotoEpisode);
  UniversePanels.wire($('timelineList'), gotoEpisode);
}

$('trailerList').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('.trailer-card');
  if (!btn) return;
  activeTrailer = Number(btn.dataset.i ?? 0);
  renderTrailers(true);
});

/* ---------------- Settings ---------------- */

const dialog = $<HTMLElement>('settingsDialog');
const modal = new Modal(dialog);
$('settingsBtn').addEventListener('click', () => modal.open());

let deferredPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as Event & { prompt: () => Promise<void> };
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', () => {
  if (!deferredPrompt) {
    toast.show('Usa Partilhar > Adicionar ao Ecra Inicial');
    return;
  }
  void deferredPrompt.prompt();
  deferredPrompt = null;
  $('installBtn').hidden = true;
});
if (!('onbeforeinstallprompt' in window)) $('installBtn').hidden = false;

$('clearDataBtn').addEventListener('click', () => {
  ['pf_watched', 'pf_favorites', 'pf_progress'].forEach((k) => localStorage.removeItem(k));
  watched.set({});
  favorites.set([]);
  progress.set({});
  toast.show('Dados locais apagados');
});

/* ---------------- Wiring ---------------- */

season.subscribe(() => renderEpisodes());
query.subscribe(() => renderEpisodes());
statusFilter.subscribe(() => renderEpisodes());
favorites.subscribe(() => renderEpisodes());
watched.subscribe(() => renderEpisodes());

renderEpisodes();
renderContinue();
renderTrailers();
renderUniversePanels();

// Tells the no-build guard in index.html that the bundle booted, so the
// "Render is serving the repo root" overlay never shows on a working deploy.
(window as unknown as { __PF_READY: boolean }).__PF_READY = true;

onOfflineEvent((detail) => {
  if (detail.status === 'done') toast.show('Download offline concluido');
});
registerOffline();
watchConnection();

// Keyboard: play/pause and fullscreen act on whichever player is on screen.
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
  if (e.key === 'k' || e.key === 'K' || e.code === 'Space') {
    const v = document.querySelector<HTMLVideoElement>('.panel.active video');
    if (v) {
      e.preventDefault();
      if (v.paused) void v.play();
      else v.pause();
    }
  }
});

export { currentId };
