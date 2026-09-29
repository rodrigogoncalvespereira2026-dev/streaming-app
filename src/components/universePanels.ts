import {
  GLOSSARY,
  MASTERS,
  STRINGS,
  TIMELINE,
  VILLAINS,
  firstLetter,
  glossaryIndex,
} from '../data/universe';
import type { Master, TimelineArc, Villain } from '../data/universe';
import { esc } from './EpisodeCard';
import { fold } from '../utils/search';

const S = STRINGS.universe;

/** Distinct colour per arc, derived from the arc name so it stays stable. */
const ARC_COLORS = [
  '#e63946',
  '#f2b93a',
  '#2fae60',
  '#1d7fe0',
  '#8a4fd1',
  '#e0663d',
  '#2fc6d9',
  '#c93f9a',
];

function arcColor(arc: string): string {
  let h = 0;
  for (let i = 0; i < arc.length; i += 1) h = (h * 31 + arc.charCodeAt(i)) >>> 0;
  return ARC_COLORS[h % ARC_COLORS.length] ?? '#e63946';
}

/** CSS-only helmet. The visor is drawn by ::after, the chin by ::before. */
function helmetHTML(master: Master, size: 'sm' | 'lg' = 'sm'): string {
  const sizeAttr = size === 'lg' ? ' data-size="lg"' : '';
  return `<span class="helmet"${sizeAttr} style="--c:${esc(master.color)}" aria-hidden="true"></span>`;
}

function epLink(num: number): string {
  return `<button type="button" class="ep-link" data-open-ep="${num}">${esc(S.episode)} ${num}</button>`;
}

export class UniversePanels {
  /**
   * One delegated listener per host for every "go to episode" control,
   * instead of rebinding after each render.
   */
  static wire(host: HTMLElement, open: (num: number) => void): void {
    host.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-open-ep]');
      if (!btn) return;
      const num = Number(btn.dataset.openEp);
      if (Number.isFinite(num)) open(num);
    });
  }

  renderMasters(host: HTMLElement, noteHost: HTMLElement): void {
    noteHost.textContent = `${MASTERS.length} Rangers. Capacetes desenhados em CSS puro, sem imagens.`;
    host.innerHTML = MASTERS.map((m) => {
      const bodyId = `master-body-${m.id}`;
      const debut = m.debut === null ? S.noDebut : `${S.episode} ${m.debut} · ${S.debut}`;
      const alias = m.catalogName ? `${m.zord.dino} · ${m.catalogName}` : m.zord.dino;
      return `<article class="master" data-master="${esc(m.id)}">
        <button type="button" class="master-head" aria-expanded="false" aria-controls="${esc(bodyId)}">
          ${helmetHTML(m)}
          <span><span class="master-name">${esc(m.name)}</span><br><span class="master-alias">${esc(alias)}</span></span>
        </button>
        <div class="master-body" id="${esc(bodyId)}" hidden>
          <dl>
            <dt>${esc(S.helmet)}</dt><dd>${esc(m.helmet)}</dd>
            <dt>${esc(S.zord)}</dt><dd>${esc(m.zord.name)}</dd>
            <dt>${esc(S.weapon)}</dt><dd>${esc(m.weapon)}</dd>
            <dt>${esc(S.debut)}</dt><dd>${esc(debut)}</dd>
          </dl>
          <p style="margin:0;color:var(--muted)">${esc(m.personality)}</p>
        </div>
      </article>`;
    }).join('');

    host.addEventListener('click', (e) => {
      const head = (e.target as HTMLElement).closest<HTMLElement>('.master-head');
      if (!head) return;
      const id = head.getAttribute('aria-controls') ?? '';
      const body = host.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!body) return;
      const open = body.hidden;
      body.hidden = !open;
      head.setAttribute('aria-expanded', String(open));
    });
  }

  renderVillains(host: HTMLElement, noteHost: HTMLElement): void {
    noteHost.textContent = S.threatEstimate;
    host.innerHTML = VILLAINS.map((v: Villain) => {
      const segs = Array.from(
        { length: 5 },
        (_, i) => `<span class="threat-seg${i < v.threat ? ' on' : ''}"></span>`,
      ).join('');
      const first = v.firstAppearance === null ? S.unknown : epLink(v.firstAppearance);
      const defeated = v.defeatedIn === null ? S.notDefeated : epLink(v.defeatedIn);
      return `<article class="villain" data-villain="${esc(v.id)}">
        <h3>${esc(v.name)}</h3>
        <p class="title">${esc(v.title)}</p>
        <p class="threat-label">${esc(S.threat)}: ${v.threat}/5</p>
        <div class="threat-bar" role="img" aria-label="${esc(`${S.threat}: ${v.threat} em 5`)}">${segs}</div>
        <p>${esc(v.description)}</p>
        <p><strong>${esc(S.signatureMove)}:</strong> ${esc(v.signatureMove)}</p>
        <p><strong>${esc(S.firstAppearance)}:</strong> ${first} · <strong>${esc(S.defeatedIn)}:</strong> ${defeated}</p>
      </article>`;
    }).join('');
  }

  renderGlossary(
    listHost: HTMLElement,
    indexHost: HTMLElement,
    countHost: HTMLElement,
    input: HTMLInputElement,
  ): void {
    const draw = (): void => {
      const q = fold(input.value.trim());
      const rows = q
        ? GLOSSARY.filter(
            (g) =>
              fold(g.term).includes(q) ||
              fold(g.short).includes(q) ||
              fold(g.long).includes(q),
          )
        : GLOSSARY;
      countHost.textContent = `${rows.length} ${rows.length === 1 ? 'entrada' : 'entradas'}`;
      listHost.innerHTML =
        rows.length === 0
          ? `<p class="panel-note">${esc(S.noResults)}</p>`
          : rows
              .map(
                (g) => `<article class="glossary-item" id="gl-${esc(firstLetter(g.term))}-${esc(g.term)}">
                  <h3>${esc(g.term)}<span class="cat">${esc(g.category)}</span></h3>
                  <p style="margin:0 0 var(--sp-1);color:var(--text)">${esc(g.short)}</p>
                  <p style="margin:0;color:var(--muted)">${esc(g.long)}</p>
                </article>`,
              )
              .join('');
    };

    indexHost.innerHTML = glossaryIndex()
      .map(
        (l) =>
          `<button type="button" data-letter="${esc(l)}" aria-label="${esc(`Ir para a letra ${l}`)}">${esc(l)}</button>`,
      )
      .join('');
    indexHost.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-letter]');
      if (!btn) return;
      const letter = btn.dataset.letter ?? '';
      const target = listHost.querySelector<HTMLElement>(`[id^="gl-${CSS.escape(letter)}-"]`);
      target?.scrollIntoView({ block: 'start' });
    });

    input.addEventListener('input', draw);
    draw();
  }

  renderTimeline(listHost: HTMLElement, select: HTMLSelectElement): void {
    const draw = (): void => {
      const chosen = select.value;
      const arcs = chosen === 'all' ? TIMELINE : TIMELINE.filter((a) => a.arc === chosen);
      listHost.innerHTML = arcs
        .map(
          (a: TimelineArc) => `<li style="--arc-color:${arcColor(a.arc)}">
            <span class="arc-range">${esc(S.episode)} ${a.epRange[0]}-${a.epRange[1]}</span>
            <h3>${esc(a.title)}${a.fromCatalog ? '' : '<span class="arc-flag">derivado dos títulos</span>'}</h3>
            <p>${esc(a.summary)}</p>
            <div class="key-eps"><span class="sr-only">${esc(S.keyEpisodes)}</span>${a.keyEpisodes
              .map(
                (n) =>
                  `<button type="button" data-open-ep="${n}">${esc(S.episode)} ${n}</button>`,
              )
              .join('')}</div>
          </li>`,
        )
        .join('');
    };

    select.innerHTML = `<option value="all">${esc(S.allArcs)}</option>${TIMELINE.map(
      (a) => `<option value="${esc(a.arc)}">${esc(a.title)}</option>`,
    ).join('')}`;
    select.addEventListener('change', draw);
    draw();
  }
}
