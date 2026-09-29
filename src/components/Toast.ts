/**
 * Toast — polite, non-blocking status messages.
 * Renders into a container element (or creates one) and announces via aria-live.
 */
export class Toast {
  private readonly host: HTMLElement;
  private timer: number | undefined;

  /**
   * @param host Element to render into. When omitted, a `.toast-region`
   * container is appended to `<body>`.
   */
  constructor(host?: HTMLElement) {
    if (host) {
      this.host = host;
    } else {
      const created = document.createElement('div');
      created.className = 'toast-region';
      document.body.appendChild(created);
      this.host = created;
    }

    this.host.classList.add('toast');
    this.host.setAttribute('role', 'status');
    this.host.setAttribute('aria-live', 'polite');
    this.host.setAttribute('aria-atomic', 'true');
    this.host.textContent = '';
  }

  /** Shows `msg` for `ms` milliseconds (default 1800). */
  show(msg: string, ms = 1800): void {
    const el = this.host;
    el.textContent = msg;
    el.classList.add('show');

    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      el.classList.remove('show');
      this.timer = undefined;
    }, ms);
  }

  /** Hides immediately. */
  hide(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.host.classList.remove('show');
  }
}

export default Toast;

