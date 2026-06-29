import { useEffect } from 'react';
import { type AnalyticsConsentStatus } from '../../lib/cookieConsent';

const METRICOOL_SCRIPT_ID = 'innerbloom-metricool-script';
const METRICOOL_SCRIPT_SRC = 'https://tracker.metricool.com/resources/be.js';
const METRICOOL_HASH = 'a88da44ed483bed8d8615d3f9ca928bc';
const METRICOOL_ALLOWED_PATHS = new Set(['/', '/v2', '/v3']);
const METRICOOL_TRACKER_TIMEOUT_MS = 5000;
const METRICOOL_TRACKER_POLL_MS = 50;

type MetricoolTracker = {
  t: (params: { hash: string }) => void;
};

declare global {
  interface Window {
    beTracker?: MetricoolTracker;
  }
}

let metricoolScriptLoadPromise: Promise<void> | null = null;
const trackedMetricoolPageViews = new Set<string>();

export function isMetricoolLandingPath(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return METRICOOL_ALLOWED_PATHS.has(normalizedPathname);
}

export function useMetricoolTracking({
  consent,
  pathname,
}: {
  consent: AnalyticsConsentStatus;
  pathname: string;
}) {
  useEffect(() => {
    const normalizedPathname = normalizePathname(pathname);

    if (consent !== 'accepted' || !METRICOOL_ALLOWED_PATHS.has(normalizedPathname)) {
      return;
    }

    if (trackedMetricoolPageViews.has(normalizedPathname)) {
      return;
    }

    let cancelled = false;

    void ensureMetricoolScriptLoaded()
      .then(() => waitForMetricoolTracker())
      .then((tracker) => {
        if (cancelled || trackedMetricoolPageViews.has(normalizedPathname)) {
          return;
        }

        tracker.t({ hash: METRICOOL_HASH });
        trackedMetricoolPageViews.add(normalizedPathname);
      })
      .catch((error) => {
        console.error('[landing] Metricool initialization failed.', error);
      });

    return () => {
      cancelled = true;
    };
  }, [consent, pathname]);
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '');
}

function ensureMetricoolScriptLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (metricoolScriptLoadPromise) {
    return metricoolScriptLoadPromise;
  }

  metricoolScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(METRICOOL_SCRIPT_ID) as HTMLScriptElement | null;

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
        metricoolScriptLoadPromise = null;
        reject(new Error('[metricool] be.js failed to load.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = METRICOOL_SCRIPT_ID;
    script.type = 'text/javascript';
    script.async = true;
    script.src = METRICOOL_SCRIPT_SRC;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      metricoolScriptLoadPromise = null;
      reject(new Error('[metricool] be.js failed to load.'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return metricoolScriptLoadPromise;
}

function waitForMetricoolTracker(): Promise<MetricoolTracker> {
  if (window.beTracker) {
    return Promise.resolve(window.beTracker);
  }

  return new Promise<MetricoolTracker>((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      if (window.beTracker) {
        resolve(window.beTracker);
        return;
      }

      if (Date.now() - startedAt >= METRICOOL_TRACKER_TIMEOUT_MS) {
        reject(new Error('[metricool] beTracker was not available after script load.'));
        return;
      }

      window.setTimeout(poll, METRICOOL_TRACKER_POLL_MS);
    };

    poll();
  });
}

export function resetMetricoolTrackingForTests(): void {
  metricoolScriptLoadPromise = null;
  trackedMetricoolPageViews.clear();
}
