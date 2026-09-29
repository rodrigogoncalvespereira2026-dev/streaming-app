const QUEUE_MESSAGE = 'pf-queue-download';

let registration: ServiceWorkerRegistration | null = null;

/** Registers the service worker in production builds only. */
export function registerOffline(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {
        /* Offline support unavailable (e.g. insecure origin): app still works online. */
      });
  });
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
  return registration;
}

/**
 * Queues a video for offline download. Resolves once the worker has accepted it.
 * Actual progress arrives later through the "pf-offline" message event.
 */
export async function downloadVideo(url: string): Promise<void> {
  const reg = await getRegistration();
  if (!reg) throw new Error('Service worker indispon?vel');
  const worker = reg.active ?? navigator.serviceWorker.controller;
  if (!worker) throw new Error('Service worker ainda n?o ativo');
  worker.postMessage({ type: QUEUE_MESSAGE, url });
}

/** Asks the worker to drain the queue; used on reconnect and on load. */
export function flushDownloadQueue(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: 'pf-process-queue' });
}

export interface OfflineEventDetail {
  status: 'queued' | 'done' | 'failed' | 'batch-done';
  url?: string;
  count?: number;
  error?: string;
}

export function onOfflineEvent(handler: (detail: OfflineEventDetail) => void): () => void {
  const listener = (event: MessageEvent) => {
    const data = event.data as { type?: string } | null;
    if (!data || data.type !== 'pf-offline') return;
    handler(data as unknown as OfflineEventDetail);
  };
  navigator.serviceWorker?.addEventListener('message', listener);
  return () => navigator.serviceWorker?.removeEventListener('message', listener);
}

/** Retries queued downloads when the connection returns (Background Sync is desktop-only). */
export function watchConnection(): void {
  window.addEventListener('online', () => flushDownloadQueue());
  if (navigator.serviceWorker) flushDownloadQueue();
}
