const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,object,embed,' +
  '[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export interface ModalOptions {
  /** Called after the modal finishes opening. */
  onOpen?: () => void;
  /** Called after the modal closes. */
  onClose?: () => void;
  /** Selector for the element that should receive focus on open. Defaults to the first focusable. */
  initialFocus?: string;
}

/**
 * Accessible dialog: focus trap, Escape to close, backdrop click to close,
 * `aria-modal` and `role="dialog"` on the given element.
 *
 * `el` may be the overlay (e.g. `.sheet-overlay`) containing the dialog, or
 * the dialog itself; a backdrop click is detected via coordinates so both work.
 */
export class Modal {
  private readonly el: HTMLElement;
  private readonly panel: HTMLElement;
  /** Native <dialog> gets showModal/close; custom overlays use a class. */
  private readonly native: HTMLDialogElement | null;
  private readonly opts: ModalOptions;
  private lastFocused: HTMLElement | null = null;
  private isOpen = false;
  private readonly onKeydown: (e: KeyboardEvent) => void;
  private readonly onBackdropClick: (e: MouseEvent) => void;

  constructor(el: HTMLElement, opts: ModalOptions = {}) {
    this.el = el;
    this.opts = opts;

    const panel = el.querySelector<HTMLElement>('[role="dialog"], .settings-sheet, .modal');
    this.panel = panel ?? el;
    this.native = el instanceof HTMLDialogElement ? el : null;

    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    if (!this.panel.hasAttribute('tabindex')) this.panel.setAttribute('tabindex', '-1');
    if (!this.native && !this.el.hasAttribute('aria-hidden')) {
      this.el.setAttribute('aria-hidden', 'true');
    }

    this.onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    this.onBackdropClick = (e: MouseEvent) => {
      if (!this.isOpen) return;
      const t = e.target as Node | null;
      if (t && (t === this.el || t === this.panel)) this.close();
    };

    this.el.addEventListener('click', this.onBackdropClick);
  }

  /** Focusable descendants, in DOM order. */
  private focusables(): HTMLElement[] {
    return Array.from(this.panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => n.offsetParent !== null || n === this.panel,
    );
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key !== 'Tab') return;

    const items = this.focusables();
    if (items.length === 0) {
      e.preventDefault();
      this.panel.focus();
      return;
    }

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === this.panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this.lastFocused = document.activeElement as HTMLElement | null;
    if (this.native) {
      // A native dialog handles the backdrop and inert background for us.
      if (!this.native.open) this.native.showModal();
    } else {
      this.el.classList.add('open');
      this.el.removeAttribute('aria-hidden');
    }
    document.addEventListener('keydown', this.onKeydown, true);

    let target: HTMLElement | null = null;
    if (this.opts.initialFocus) {
      target = this.panel.querySelector<HTMLElement>(this.opts.initialFocus);
    }
    if (!target) {
      target = this.focusables().find((n) => !n.hasAttribute('data-close')) ?? null;
    }
    (target ?? this.panel).focus();

    this.opts.onOpen?.();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this.native) {
      if (this.native.open) this.native.close();
    } else {
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
    }
    document.removeEventListener('keydown', this.onKeydown, true);

    if (this.lastFocused && document.contains(this.lastFocused)) this.lastFocused.focus();
    this.lastFocused = null;

    this.opts.onClose?.();
  }

  /** True while the dialog is visible. */
  get open_state(): boolean {
    return this.isOpen;
  }

  /** Detaches listeners. Call when the dialog is removed from the DOM. */
  destroy(): void {
    this.close();
    this.el.removeEventListener('click', this.onBackdropClick);
  }
}

export default Modal;

