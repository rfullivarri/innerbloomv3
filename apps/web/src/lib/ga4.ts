type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
  }
}

const GA_SCRIPT_ID = 'innerbloom-ga4-script';

let gaBootstrapPromise: Promise<void> | null = null;
let gaConfiguredForId: string | null = null;

function getOrCreateGtag(): GtagCommand {
  window.dataLayer = window.dataLayer ?? [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  return window.gtag;
}

function loadGaScript(measurementId: string): Promise<void> {
  const existing = document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;

  if (existing?.dataset.loaded === 'true') {
    return Promise.resolve();
  }

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load GA4 script.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load GA4 script.'));
    document.head.appendChild(script);
  });
}

export async function ensureGa4Initialized(measurementId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if (!measurementId.trim()) {
    return;
  }

  if (!gaBootstrapPromise) {
    gaBootstrapPromise = loadGaScript(measurementId);
  }

  await gaBootstrapPromise;

  const gtag = getOrCreateGtag();

  if (gaConfiguredForId === measurementId) {
    return;
  }

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  gaConfiguredForId = measurementId;
}

export function sendGaEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, params);
}
