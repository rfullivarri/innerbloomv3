type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
  }
}

const GA_SCRIPT_ID = 'innerbloom-ga4-script';

let gaConfiguredForId: string | null = null;
let gaBootstrapDone = false;

function getOrCreateGtag(): GtagCommand {
  window.dataLayer = window.dataLayer ?? [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  return window.gtag;
}

function ensureGaScript(measurementId: string): void {
  if (document.getElementById(GA_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
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

  ensureGaScript(normalizedMeasurementId);
  bootstrapGaConsentAndClock(gtag);

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
