type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
    google_tag_manager?: Record<string, unknown>;
  }
}

const GA_SCRIPT_ID = 'innerbloom-ga4-script';

let gaConfiguredForId: string | null = null;
let gaBootstrapDone = false;
let gaScriptLoadPromise: Promise<void> | null = null;

function getOrCreateGtag(): GtagCommand {
  window.dataLayer = window.dataLayer ?? [];

  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(arguments);
    };
  }

  return window.gtag;
}

function ensureGaScript(measurementId: string): Promise<void> {
  if (gaScriptLoadPromise) {
    return gaScriptLoadPromise;
  }

  gaScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => {
        gaScriptLoadPromise = null;
        reject(new Error('[ga4] gtag.js failed to load.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      gaScriptLoadPromise = null;
      reject(new Error('[ga4] gtag.js failed to load.'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return gaScriptLoadPromise;
}

function bootstrapGaConsentAndClock(gtag: GtagCommand): void {
  if (gaBootstrapDone) {
    return;
  }

  gtag('js', new Date());
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('consent', 'update', {
    analytics_storage: 'granted',
  });

  gaBootstrapDone = true;
}

export async function ensureGa4Initialized(measurementId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedMeasurementId = measurementId.trim();

  if (!normalizedMeasurementId) {
    return;
  }

  const gtag = getOrCreateGtag();

  bootstrapGaConsentAndClock(gtag);
  await ensureGaScript(normalizedMeasurementId);

  if (gaConfiguredForId === normalizedMeasurementId) {
    return;
  }

  gtag('config', normalizedMeasurementId, {
    anonymize_ip: true,
  });

  gaConfiguredForId = normalizedMeasurementId;
}

export function sendGaEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !gaConfiguredForId) {
    return;
  }

  window.gtag('event', eventName, params);
}
