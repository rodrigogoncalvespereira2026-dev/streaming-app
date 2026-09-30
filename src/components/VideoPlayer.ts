/** Options accepted by the VideoPlayer constructor. */
export interface VideoPlayerOptions {
  /** Resume position in seconds applied once metadata is available. */
  startAt?: number;
  /** Called (throttled) with the playback position, for resume persistence. */
  onProgress?: (id: string, seconds: number, duration: number) => void;
  /** Called when playback reaches the end. */
  onEnded?: (id: string) => void;
  /** Called on media errors. */
  onError?: (message: string) => void;
  /** Poster image URL. */
  poster?: string;
  /** Ms of inactivity before the control bar autohides. Default 2800. */
  autohideDelay?: number;
}

export interface VideoMeta {
  title: string;
  id?: string;
}

const RATES: number[] = [1, 1.25, 1.5, 2];

function svg(path: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

const ICON = {
  play: svg('M8 5v14l11-7z'),
  pause: svg('M6 5h4v14H6zm8 0h4v14h-4z'),
  back10: svg('M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z'),
  fwd10: svg('M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z'),
  vol: svg('M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z'),
  mute: svg('M4 9v6h4l5 4V5L8 9H4zm15 1.4L17.6 9l-2 2-2-2L12 10.4l2 2-2 2 1.4 1.4 2-2 2 2L19 12.4z'),
  pip: svg('M3 5h18v14H3zm2 2v8h9v3h5V7z'),
  full: svg('M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z'),
  exitFull: svg('M9 4h2v5H6V7h3zm6 0h2v3h3v2h-5zm-6 7h5v5h-2v-3H6v-2zm8 0h2v2h-3v3h-2v-5z'),
};

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const AUTOHIDE_MS = 2800;

/**
 * Custom video player. The native `controls` attribute is never set; all
 * interaction is implemented here. Every optional browser API (PiP, fullscreen,
 * Media Session) is feature-detected and silently skipped when unavailable.
 */
export class VideoPlayer {
  private readonly root: HTMLElement;
  private readonly opts: VideoPlayerOptions;
  private readonly reduced: boolean;

  private readonly video: HTMLVideoElement;
  private readonly shell: HTMLElement;
  private readonly live: HTMLElement;
  private readonly seek: HTMLElement;
  private readonly seekFill: HTMLElement;
  private readonly seekKnob: HTMLElement;
  private readonly vol: HTMLElement;
  private readonly volFill: HTMLElement;
  private readonly volKnob: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly bigPlay: HTMLButtonElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly pipBtn: HTMLButtonElement;
  private readonly fsBtn: HTMLButtonElement;
  private readonly rateBtn: HTMLButtonElement;
  private readonly rateMenu: HTMLElement;

  private meta: { title: string; id: string };
  private rateIndex = 0;
  private lastVolume = 1;
  private idleTimer: number | undefined;
  private progressTimer: number | undefined;
  private scrubbing = false;
  private pendingSeek: number | null = null;
  private destroyed = false;
  private startAtApplied = false;
  private resumeSeconds = 0;

  private readonly onDocKey = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly onActivity = () => this.wake();

  constructor(root: HTMLElement, opts: VideoPlayerOptions = {}) {
    this.root = root;
    this.opts = opts;
    this.reduced = prefersReducedMotion();
    this.meta = { title: '', id: 'video' };

    this.shell = el('div', { class: 'player' });
    this.video = el('video', { playsinline: '', preload: 'metadata', tabindex: '-1' });
    this.video.removeAttribute('controls');
    this.shell.appendChild(this.video);

    this.bigPlay = el('button', { type: 'button', class: 'big-play', 'aria-label': 'Reproduzir' }, ICON.play);
    this.shell.append(this.bigPlay, el('span', { class: 'spinner', 'aria-hidden': 'true' }));

    const controls = el('div', { class: 'controls' });

    // Seek slider (role=slider, keyboard operable)
    this.seek = el('div', {
      class: 'seek',
      role: 'slider',
      tabindex: '0',
      'aria-label': 'Progresso do vídeo',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0',
      'aria-valuetext': '0:00 de 0:00',
    });
    const seekTrack = el('span', { class: 'track' });
    this.seekFill = el('span', { class: 'fill' });
    this.seekKnob = el('span', { class: 'knob' });
    seekTrack.append(this.seekFill, this.seekKnob);
    this.seek.appendChild(seekTrack);

    this.timeEl = el('span', { class: 'time', 'aria-hidden': 'true' });
    this.timeEl.textContent = '0:00 / 0:00';

    const row1 = el('div', { class: 'controls-row' });
    row1.append(this.seek, this.timeEl);

    // Row 2: transport
    this.playBtn = el('button', { type: 'button', class: 'ctl', 'aria-label': 'Reproduzir' }, ICON.play);
    const back = el('button', { type: 'button', class: 'ctl back', 'aria-label': 'Recuar 10 segundos' }, ICON.back10);
    const fwd = el('button', { type: 'button', class: 'ctl fwd', 'aria-label': 'Avançar 10 segundos' }, ICON.fwd10);
    this.muteBtn = el('button', { type: 'button', class: 'ctl', 'aria-label': 'Silenciar', 'aria-pressed': 'false' }, ICON.vol);

    this.vol = el('div', {
      class: 'slider',
      role: 'slider',
      tabindex: '0',
      'aria-label': 'Volume',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '100',
      'aria-valuetext': '100%',
    });
    const volTrack = el('span', { class: 'track' });
    this.volFill = el('span', { class: 'fill' });
    this.volKnob = el('span', { class: 'knob' });
    volTrack.append(this.volFill, this.volKnob);
    this.vol.appendChild(volTrack);
    this.setVolUI(1);

    this.rateBtn = el('button', {
      type: 'button',
      class: 'ctl wide',
      'aria-label': 'Velocidade de reprodução',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
    }, '1x');
    this.rateMenu = el('div', { class: 'rate-menu', role: 'menu', 'aria-label': 'Velocidade de reprodução' });
    this.rateMenu.hidden = true;
    RATES.forEach((r) => {
      const b = el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(r === 1) }, `${r}x`);
      b.addEventListener('click', () => {
        this.setRate(r);
        this.closeRateMenu();
      });
      this.rateMenu.appendChild(b);
    });

    this.pipBtn = el('button', { type: 'button', class: 'ctl', 'aria-label': 'Picture-in-Picture' }, ICON.pip);
    this.fsBtn = el('button', { type: 'button', class: 'ctl', 'aria-label': 'Ecrã inteiro' }, ICON.full);

    const row2 = el('div', { class: 'controls-row' });
    row2.append(this.playBtn, back, fwd, this.muteBtn, this.vol, el('span', { class: 'controls-spacer' }), this.rateBtn, this.pipBtn, this.fsBtn);

    controls.append(row1, row2);
    this.shell.append(controls, this.rateMenu);

    this.live = el('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.shell.appendChild(this.live);
    this.root.appendChild(this.shell);

    this.bind();
  }

  // ---------- element wiring ----------

  private bind(): void {
    const v = this.video;
    const back = this.shell.querySelector<HTMLButtonElement>('.ctl.back');
    const fwd = this.shell.querySelector<HTMLButtonElement>('.ctl.fwd');
    back?.addEventListener('click', () => this.nudge(-10));
    fwd?.addEventListener('click', () => this.nudge(10));

    this.bigPlay.addEventListener('click', () => this.togglePlay());
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.rateBtn.addEventListener('click', () => this.toggleRateMenu());
    this.pipBtn.addEventListener('click', () => void this.togglePip());
    this.fsBtn.addEventListener('click', () => void this.toggleFullscreen());

    // Click the video surface to toggle playback (ignore the control bar).
    this.shell.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('.controls, .rate-menu, .big-play')) return;
      this.togglePlay();
    });

    this.bindSlider(this.seek, {
      onStart: () => {
        this.scrubbing = true;
        this.wake();
      },
      onInput: (r) => this.previewSeek(r),
      onEnd: (r) => {
        this.scrubbing = false;
        this.commitSeek(r);
      },
      onKey: (e) => this.seekKey(e),
    });

    this.bindSlider(this.vol, {
      onInput: (r) => this.setVolume(r),
      onKey: (e) => this.volumeKey(e),
    });

    v.addEventListener('play', () => this.onPlay());
    v.addEventListener('pause', () => this.onPause());
    v.addEventListener('ended', () => this.onEnded());
    v.addEventListener('timeupdate', () => this.onTime());
    v.addEventListener('durationchange', () => this.renderProgress());
    v.addEventListener('loadedmetadata', () => this.applyResume());
    v.addEventListener('volumechange', () => this.onVolumeChange());
    v.addEventListener('waiting', () => this.shell.classList.add('is-buffering'));
    v.addEventListener('canplay', () => this.shell.classList.remove('is-buffering'));
    v.addEventListener('error', () => this.onMediaError());
    v.addEventListener('click', (e) => e.stopPropagation());
    v.addEventListener('dblclick', () => void this.toggleFullscreen());

    document.addEventListener('keydown', this.onDocKey);
    ['pointermove', 'pointerdown', 'focusin'].forEach((evt) =>
      this.shell.addEventListener(evt, this.onActivity),
    );
    // Leaving the surface must not bring the controls back; the idle timer armed
    // by the last activity hides them on its own.
    v.addEventListener('pointerleave', () => this.wake());
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());

    this.progressTimer = window.setInterval(() => this.emitProgress(), 5000);
    this.renderProgress();
  }

  /** Pointer + keyboard binding shared by the seek and volume sliders. */
  private bindSlider(
    node: HTMLElement,
    handlers: {
      onStart?: () => void;
      onInput: (ratio: number) => void;
      onEnd?: (ratio: number) => void;
      onKey: (e: KeyboardEvent) => void;
    },
  ): void {
    const ratioFrom = (clientX: number): number => {
      const r = node.getBoundingClientRect();
      if (r.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    };

    node.addEventListener('pointerdown', (e) => {
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
      handlers.onStart?.();
      handlers.onInput(ratioFrom(e.clientX));
      e.preventDefault();
    });
    node.addEventListener('pointermove', (e) => {
      if (!this.hasCapture(node, e.pointerId)) return;
      handlers.onInput(ratioFrom(e.clientX));
    });
    const finish = (e: PointerEvent) => {
      if (!this.hasCapture(node, e.pointerId)) return;
      try {
        node.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      handlers.onEnd?.(ratioFrom(e.clientX));
    };
    node.addEventListener('pointerup', finish);
    node.addEventListener('pointercancel', finish);
    node.addEventListener('keydown', handlers.onKey);
    node.addEventListener('focus', () => this.wake());
  }

  private hasCapture(node: HTMLElement, id: number): boolean {
    try {
      return node.hasPointerCapture(id);
    } catch {
      return false;
    }
  }

  // ---------- seek ----------

  private duration(): number {
    const d = this.video.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
  }

  private previewSeek(ratio: number): void {
    const d = this.duration();
    if (d <= 0) return;
    this.pendingSeek = ratio * d;
    this.renderProgress(this.pendingSeek);
  }

  private commitSeek(ratio: number): void {
    const d = this.duration();
    if (d <= 0) {
      this.pendingSeek = null;
      return;
    }
    const t = Math.max(0, Math.min(d, ratio * d));
    this.pendingSeek = null;
    this.seekTo(t);
    this.announce(`${fmt(t)} de ${fmt(d)}`);
  }

  private seekTo(t: number): void {
    try {
      this.video.currentTime = Math.max(0, t);
    } catch {
      /* seeking before metadata is not possible */
    }
    this.renderProgress();
  }

  private nudge(delta: number): void {
    const d = this.duration();
    const target = Math.max(0, d > 0 ? Math.min(d, this.video.currentTime + delta) : this.video.currentTime + delta);
    this.seekTo(target);
    this.announce(`${delta > 0 ? '+' : ''}${delta} segundos · ${fmt(target)}`);
    this.wake();
  }

  private seekKey(e: KeyboardEvent): void {
    const d = this.duration();
    const cur = this.pendingSeek ?? this.video.currentTime;
    const step = e.shiftKey ? 30 : 5;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = cur + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = cur - step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = d;
        break;
      case 'PageUp':
        next = cur + 60;
        break;
      case 'PageDown':
        next = cur - 60;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.seekTo(Math.max(0, d > 0 ? Math.min(d, next) : next));
    this.wake();
  }

  // ---------- volume ----------

  private setVolume(ratio: number, apply = true): void {
    const v = Math.max(0, Math.min(1, ratio));
    if (apply) {
      this.video.volume = v;
      if (v > 0) this.video.muted = false;
    }
    this.setVolUI(v);
  }

  private setVolUI(v: number): void {
    const pct = `${Math.round(v * 100)}%`;
    this.volFill.style.setProperty('--value', pct);
    this.volKnob.style.setProperty('--value', pct);
    this.vol.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    this.vol.setAttribute('aria-valuetext', `${Math.round(v * 100)}%`);
    const silent = this.video.muted || v === 0;
    this.muteBtn.innerHTML = silent ? ICON.mute : ICON.vol;
    this.muteBtn.setAttribute('aria-pressed', String(Boolean(this.video.muted)));
    this.muteBtn.setAttribute('aria-label', silent ? 'Ativar som' : 'Silenciar');
  }

  private onVolumeChange(): void {
    if (!this.video.muted && this.video.volume > 0) this.lastVolume = this.video.volume;
    this.setVolUI(this.video.muted ? 0 : this.video.volume);
  }

  private toggleMute(): void {
    this.video.muted = !this.video.muted;
    this.setVolUI(this.video.muted ? 0 : this.lastVolume);
    this.announce(this.video.muted ? 'Som desligado' : 'Som ligado');
    this.wake();
  }

  private volumeKey(e: KeyboardEvent): void {
    const cur = this.video.muted ? 0 : this.video.volume;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = cur + 0.1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = cur - 0.1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.setVolume(next);
    this.announce(`Volume ${Math.round(this.video.volume * 100)}%`);
    this.wake();
  }

  // ---------- playback ----------

  private togglePlay(): void {
    if (this.destroyed) return;
    if (this.video.paused || this.video.ended) {
      void this.video.play().catch(() => {
        this.announce('Não foi possível iniciar a reprodução');
      });
    } else {
      this.video.pause();
    }
    this.wake();
  }

  private onPlay(): void {
    this.shell.classList.add('is-playing');
    this.shell.classList.remove('is-idle');
    this.playBtn.innerHTML = ICON.pause;
    this.playBtn.setAttribute('aria-label', 'Pausar');
    this.bigPlay.setAttribute('aria-label', 'Pausar');
    this.updateMediaSessionPlayback('playing');
    this.wake();
  }

  private onPause(): void {
    this.shell.classList.remove('is-playing');
    this.shell.classList.remove('is-idle');
    this.playBtn.innerHTML = ICON.play;
    this.playBtn.setAttribute('aria-label', 'Reproduzir');
    this.bigPlay.setAttribute('aria-label', 'Reproduzir');
    this.updateMediaSessionPlayback('paused');
    this.emitProgress();
    this.wake();
  }

  private onEnded(): void {
    this.shell.classList.remove('is-playing');
    this.playBtn.innerHTML = ICON.play;
    this.emitProgress();
    this.updateMediaSessionPlayback('none');
    this.announce('Vídeo terminado');
    this.opts.onEnded?.(this.meta.id);
  }

  private onTime(): void {
    if (!this.scrubbing) this.renderProgress();
  }

  private onMediaError(): void {
    const code = this.video.error?.code;
    const msg = code === 4 ? 'Formato não suportado' : 'Erro ao reproduzir o vídeo';
    this.shell.classList.remove('is-buffering');
    this.announce(msg);
    this.opts.onError?.(msg);
  }

  private applyResume(): void {
    if (this.startAtApplied) return;
    this.startAtApplied = true;
    const target = this.opts.startAt ?? this.resumeSeconds;
    if (target > 0 && Number.isFinite(target)) {
      const d = this.duration();
      if (d <= 0 || target < d - 1) this.seekTo(target);
    }
    this.renderProgress();
  }

  // ---------- playback rate ----------

  private setRate(rate: number): void {
    this.rateIndex = Math.max(0, RATES.indexOf(rate));
    this.video.playbackRate = rate;
    this.rateBtn.textContent = `${rate}x`;
    this.rateMenu.querySelectorAll('button').forEach((b, i) => {
      b.setAttribute('aria-checked', String(RATES[i] === rate));
    });
    this.announce(`Velocidade ${rate}x`);
  }

  private cycleRate(): void {
    this.setRate(RATES[(this.rateIndex + 1) % RATES.length]!);
  }

  private toggleRateMenu(): void {
    if (this.rateMenu.hidden) this.openRateMenu();
    else this.closeRateMenu();
    this.wake();
  }

  private openRateMenu(): void {
    this.rateMenu.hidden = false;
    this.rateBtn.setAttribute('aria-expanded', 'true');
    this.shell.classList.remove('is-idle');
    this.rateMenu.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private closeRateMenu(): void {
    if (this.rateMenu.hidden) return;
    this.rateMenu.hidden = true;
    this.rateBtn.setAttribute('aria-expanded', 'false');
    this.rateBtn.focus();
  }

  // ---------- picture-in-picture ----------

  private async togglePip(): Promise<void> {
    try {
      const v = this.video as HTMLVideoElement & {
        requestPictureInPicture?: () => Promise<PictureInPictureWindow>;
      };
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.announce('Picture-in-Picture desativado');
      } else if (typeof v.requestPictureInPicture === 'function') {
        await v.requestPictureInPicture();
        this.announce('Picture-in-Picture ativado');
      } else {
        this.announce('Picture-in-Picture não suportado');
      }
    } catch {
      this.announce('Picture-in-Picture indisponível');
    }
    this.wake();
  }

  // ---------- fullscreen ----------

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const req = this.shell.requestFullscreen ?? this.root.requestFullscreen;
        if (typeof req === 'function') await req.call(this.shell);
        else this.announce('Ecrã inteiro não suportado');
      }
    } catch {
      this.announce('Ecrã inteiro indisponível');
    }
    this.wake();
  }

  private onFullscreenChange(): void {
    const on = Boolean(document.fullscreenElement);
    this.fsBtn.innerHTML = on ? ICON.exitFull : ICON.full;
    this.fsBtn.setAttribute('aria-label', on ? 'Sair do ecrã inteiro' : 'Ecrã inteiro');
    this.wake();
  }

  // ---------- keyboard ----------

  private handleKeydown(e: KeyboardEvent): void {
    if (this.destroyed) return;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;

    // Ignore typing contexts.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;

    const inside = t !== null && this.shell.contains(t);

    if (!this.rateMenu.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeRateMenu();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Escape' && inside) {
      this.closeRateMenu();
      return;
    }

    const key = e.key.toLowerCase();

    if (key >= '0' && key <= '9' && inside) {
      e.preventDefault();
      const d = this.duration();
      if (d > 0) {
        const pct = Number(key) * 10;
        this.seekTo((pct / 100) * d);
        this.announce(`${pct}% · ${fmt((pct / 100) * d)}`);
      }
      this.wake();
      return;
    }

    switch (key) {
      case ' ':
      case 'k':
        if (!inside) return;
        e.preventDefault();
        this.togglePlay();
        break;
      case 'j':
        if (!inside) return;
        e.preventDefault();
        this.nudge(-10);
        break;
      case 'l':
        if (!inside) return;
        e.preventDefault();
        this.nudge(10);
        break;
      case 'arrowright':
        if (!inside) return;
        e.preventDefault();
        this.nudge(5);
        break;
      case 'arrowleft':
        if (!inside) return;
        e.preventDefault();
        this.nudge(-5);
        break;
      case 'arrowup':
        if (!inside) return;
        e.preventDefault();
        this.setVolume(this.video.muted ? 0 : this.video.volume + 0.1);
        this.announce(`Volume ${Math.round(this.video.volume * 100)}%`);
        this.wake();
        break;
      case 'arrowdown':
        if (!inside) return;
        e.preventDefault();
        this.setVolume(this.video.muted ? 0 : this.video.volume - 0.1);
        this.announce(`Volume ${Math.round(this.video.volume * 100)}%`);
        this.wake();
        break;
      case 'm':
        if (!inside) return;
        e.preventDefault();
        this.toggleMute();
        break;
      case 'f':
        if (!inside) return;
        e.preventDefault();
        void this.toggleFullscreen();
        break;
      case 'p':
        if (!inside) return;
        e.preventDefault();
        void this.togglePip();
        break;
      case '>':
      case '.':
        if (!inside) return;
        e.preventDefault();
        this.cycleRate();
        break;
      case '<':
      case ',':
        if (!inside) return;
        e.preventDefault();
        this.setRate(RATES[(this.rateIndex - 1 + RATES.length) % RATES.length]!);
        break;
      default:
        return;
    }
  }

  // ---------- autohide ----------

  private wake(): void {
    if (this.destroyed) return;
    this.shell.classList.remove('is-idle');
    if (this.idleTimer !== undefined) window.clearTimeout(this.idleTimer);
    if (this.reduced) {
      // Reduced motion: the bar is toggled without any timed animation.
      this.idleTimer = window.setTimeout(() => {
        if (!this.video.paused && this.rateMenu.hidden && !this.scrubbing) {
          this.shell.classList.add('is-idle');
        }
      }, (this.opts.autohideDelay ?? AUTOHIDE_MS) * 2);
      return;
    }
    this.idleTimer = window.setTimeout(() => {
      if (!this.video.paused && this.rateMenu.hidden && !this.scrubbing) {
        this.shell.classList.add('is-idle');
      }
    }, this.opts.autohideDelay ?? AUTOHIDE_MS);
  }

  // ---------- rendering ----------

  private renderProgress(atTime?: number): void {
    const d = this.duration();
    const cur = atTime ?? this.video.currentTime ?? 0;
    const ratio = d > 0 ? Math.max(0, Math.min(1, cur / d)) : 0;
    const pct = `${(ratio * 100).toFixed(2)}%`;

    this.seekFill.style.setProperty('--value', pct);
    this.seekKnob.style.setProperty('--value', pct);
    this.seek.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    this.seek.setAttribute('aria-valuetext', d > 0 ? `${fmt(cur)} de ${fmt(d)}` : fmt(cur));
    this.timeEl.textContent = d > 0 ? `${fmt(cur)} / ${fmt(d)}` : `${fmt(cur)} / --:--`;
  }

  private announce(msg: string): void {
    this.live.textContent = '';
    window.setTimeout(() => {
      this.live.textContent = msg;
    }, 50);
  }

  private emitProgress(): void {
    if (this.destroyed) return;
    const d = this.duration();
    if (d <= 0) return;
    this.opts.onProgress?.(this.meta.id, this.video.currentTime ?? 0, d);
  }

  // ---------- media session ----------

  private updateMediaSessionPlayback(state: MediaSessionPlaybackState): void {
    try {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = state;
    } catch {
      /* not supported */
    }
  }

  private setMediaSessionMetadata(): void {
    try {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
      if (typeof MediaMetadata === 'undefined') return;
      const ms = navigator.mediaSession;
      ms.metadata = new MediaMetadata({
        title: this.meta.title,
        artist: 'Power Rangers',
        album: 'Primal Force',
      });
      const act = (
        name: MediaSessionAction,
        handler: (details?: MediaSessionActionDetails) => void,
      ) => {
        try {
          ms.setActionHandler(name, handler);
        } catch {
          /* action unsupported */
        }
      };
      act('play', () => this.togglePlay());
      act('pause', () => this.togglePlay());
      act('seekbackward', () => this.nudge(-10));
      act('seekforward', () => this.nudge(10));
      act('seekto', (details) => {
        const t = details?.seekTime;
        if (typeof t === 'number') this.seekTo(t);
      });
      act('stop', () => {
        this.video.pause();
        this.seekTo(0);
      });
    } catch {
      /* media session not available */
    }
  }

  // ---------- public API ----------

  /**
   * Loads a new source. `autoplay` is best-effort (browsers may reject it).
   * `meta.id` identifies the media for progress persistence and Media Session.
   */
  load(src: string, meta: VideoMeta, autoplay = false): void {
    if (this.destroyed || !src) return;

    this.meta = { title: meta.title ?? '', id: meta.id ?? src };
    this.startAtApplied = false;
    this.pendingSeek = null;
    this.shell.classList.remove('is-playing', 'is-buffering');
    this.playBtn.innerHTML = ICON.play;
    this.renderProgress(0);

    if (this.opts.poster) this.video.poster = this.opts.poster;

    try {
      this.video.setAttribute('aria-label', this.meta.title);
      this.video.src = src;
      this.video.load();
    } catch {
      this.announce('Não foi possível carregar o vídeo');
      this.opts.onError?.('Não foi possível carregar o vídeo');
      return;
    }

    this.setMediaSessionMetadata();
    this.updateMediaSessionPlayback('none');

    if (autoplay) {
      void this.video.play().catch(() => {
        this.announce('Reprodução automática bloqueada pelo navegador');
      });
    }
    this.wake();
  }

  /** Sets the resume position (seconds) used by the next `load`. */
  setResumePosition(seconds: number): void {
    this.resumeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  }

  /** Removes listeners, timers and the DOM created by this instance. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.idleTimer !== undefined) window.clearTimeout(this.idleTimer);
    if (this.progressTimer !== undefined) window.clearInterval(this.progressTimer);
    this.idleTimer = undefined;
    this.progressTimer = undefined;

    document.removeEventListener('keydown', this.onDocKey);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);

    try {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    } catch {
      /* media APIs unavailable */
    }

    this.shell.remove();
  }
}

export default VideoPlayer;

