type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
  }
}

const GA_SCRIPT_ID = 'innerbloom-ga4-script';
const GA4_DEBUG_PREFIX = '[landing][ga4-debug]';

let gaBootstrapPromise: Promise<void> | null = null;
let gaConfiguredForId: string | null = null;
let gaScriptLoaded = false;

function logGa4Debug(step: string, details?: Record<string, unknown>) {
  console.info(GA4_DEBUG_PREFIX, step, details ?? {});
}

function getOrCreateGtag(): GtagCommand {
  logGa4Debug('getOrCreateGtag:start', {
    hasDataLayer: Array.isArray(window.dataLayer),
    hasGtag: typeof window.gtag === 'function',
  });

  window.dataLayer = window.dataLayer ?? [];

  if (!window.gtag) {
    logGa4Debug('getOrCreateGtag:create-window.gtag');
    window.gtag = (...args: unknown[]) => {
      logGa4Debug('window.gtag:push-to-dataLayer', { args });
      window.dataLayer?.push(args);
    };
  }

  logGa4Debug('getOrCreateGtag:ready', {
    dataLayerLength: window.dataLayer.length,
    hasGtag: typeof window.gtag === 'function',
  });
  return window.gtag;
}

function loadGaScript(measurementId: string): Promise<void> {
  logGa4Debug('loadGaScript:start', { measurementId });
  const existing = document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;

  if (existing?.dataset.loaded === 'true') {
    logGa4Debug('loadGaScript:existing-script-already-loaded');
    return Promise.resolve();
  }

  if (existing) {
    const readyState = (existing as HTMLScriptElement & { readyState?: string }).readyState;
    if (readyState === 'complete' || readyState === 'loaded') {
      existing.dataset.loaded = 'true';
      logGa4Debug('loadGaScript:existing-script-readyState-loaded');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        logGa4Debug('loadGaScript:existing-script-load-event');
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => {
        logGa4Debug('loadGaScript:existing-script-error-event');
        reject(new Error('Failed to load GA4 script.'));
      }, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => {
      script.dataset.loaded = 'true';
      logGa4Debug('loadGaScript:new-script-onload');
      resolve();
    };
    script.onerror = () => {
      logGa4Debug('loadGaScript:new-script-onerror');
      reject(new Error('Failed to load GA4 script.'));
    };
    logGa4Debug('loadGaScript:append-new-script', { src: script.src });
    document.head.appendChild(script);
  });
}

export async function ensureGa4Initialized(measurementId: string): Promise<void> {
  logGa4Debug('ensureGa4Initialized:called', {
    measurementId,
    hasWindow: typeof window !== 'undefined',
    gaConfiguredForId,
    gaScriptLoaded,
  });

  if (typeof window === 'undefined') {
    logGa4Debug('ensureGa4Initialized:return-no-window');
    return;
  }

  if (!measurementId.trim()) {
    logGa4Debug('ensureGa4Initialized:return-empty-measurement-id');
    return;
  }

  const gtag = getOrCreateGtag();

  if (!gaConfiguredForId) {
    logGa4Debug('ensureGa4Initialized:gtag-js');
    gtag('js', new Date());
  }

  if (!gaBootstrapPromise) {
    logGa4Debug('ensureGa4Initialized:create-bootstrap-promise');
    gaBootstrapPromise = loadGaScript(measurementId);
  }

  try {
    await gaBootstrapPromise;
  } catch (error) {
    gaBootstrapPromise = null;
    gaScriptLoaded = false;
    logGa4Debug('ensureGa4Initialized:script-load-failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  gaScriptLoaded = true;
  logGa4Debug('ensureGa4Initialized:script-loaded');

  if (gaConfiguredForId === measurementId) {
    logGa4Debug('ensureGa4Initialized:return-already-configured', { gaConfiguredForId });
    return;
  }

  logGa4Debug('ensureGa4Initialized:gtag-config', { measurementId });
  gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  gaConfiguredForId = measurementId;
  logGa4Debug('ensureGa4Initialized:configured', {
    gaConfiguredForId,
    gaScriptLoaded,
  });
}

export function sendGaEvent(eventName: string, params: Record<string, unknown> = {}): void {
  const hasWindow = typeof window !== 'undefined';
  const hasGtag = hasWindow && typeof window.gtag === 'function';
  const guardBlocked = !hasWindow || !hasGtag || !gaScriptLoaded || !gaConfiguredForId;

  logGa4Debug('sendGaEvent:called', {
    eventName,
    params,
    hasWindow,
    hasGtag,
    gaScriptLoaded,
    gaConfiguredForId,
    hasDataLayer: hasWindow && Array.isArray(window.dataLayer),
    dataLayerLength: hasWindow && Array.isArray(window.dataLayer) ? window.dataLayer.length : null,
    guardBlocked,
  });

  if (
    !hasWindow
    || !hasGtag
    || !gaScriptLoaded
    || !gaConfiguredForId
  ) {
    logGa4Debug('sendGaEvent:return-guard-blocked');
    return;
  }

  const gtag = window.gtag as GtagCommand;
  gtag('event', eventName, params);
  logGa4Debug('sendGaEvent:dispatched');
}
