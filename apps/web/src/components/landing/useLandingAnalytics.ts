import { useEffect, useRef, useState } from 'react';
import { type AnalyticsConsentStatus } from '../../lib/cookieConsent';
import { ensureGa4Initialized, sendGaEvent } from '../../lib/ga4';
import {
  buildMarketingAttribution,
  getMarketingEventParams,
  persistMarketingAttribution,
} from '../../lib/marketingAttribution';

const LANDING_GA4_MEASUREMENT_ID = (
  import.meta.env.VITE_GA4_MEASUREMENT_ID
  ?? import.meta.env.VITE_GA_MEASUREMENT_ID
  ?? ''
).trim();
const LANDING_GA4_MEASUREMENT_ID_SOURCE = import.meta.env.VITE_GA4_MEASUREMENT_ID
  ? 'VITE_GA4_MEASUREMENT_ID'
  : import.meta.env.VITE_GA_MEASUREMENT_ID
    ? 'VITE_GA_MEASUREMENT_ID'
    : 'unset';
const LANDING_GA4_DEBUG = import.meta.env.DEV
  || String(import.meta.env.VITE_GA4_DEBUG ?? '').toLowerCase() === 'true';
let missingMeasurementIdWarningShown = false;

export function debugLandingGa4(message: string, payload?: Record<string, unknown>): void {
  if (!LANDING_GA4_DEBUG) {
    return;
  }

  console.info(message, payload);
}

export function useLandingAnalytics({
  consent,
  pathname,
  search,
}: {
  consent: AnalyticsConsentStatus;
  pathname: string;
  search: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const trackedPageViews = useRef<Set<string>>(new Set());
  const trackedScrollMilestones = useRef<Set<number>>(new Set());

  useEffect(() => {
    debugLandingGa4('[landing][ga4-debug] analytics init effect', {
      consent,
      measurementIdSource: LANDING_GA4_MEASUREMENT_ID_SOURCE,
      measurementId: LANDING_GA4_MEASUREMENT_ID,
    });

    if (consent !== 'accepted') {
      debugLandingGa4('[landing][ga4-debug] analytics init effect blocked: consent is not accepted', { consent });
      setIsReady(false);
      trackedScrollMilestones.current.clear();
      return;
    }

    if (!LANDING_GA4_MEASUREMENT_ID) {
      if (!missingMeasurementIdWarningShown) {
        missingMeasurementIdWarningShown = true;
        console.warn('[landing] VITE_GA4_MEASUREMENT_ID is not configured. GA4 will stay disabled.');
      }
      debugLandingGa4('[landing][ga4-debug] analytics init effect blocked: empty measurement id');
      setIsReady(false);
      return;
    }

    let cancelled = false;

    debugLandingGa4('[landing][ga4-debug] calling ensureGa4Initialized', {
      measurementId: LANDING_GA4_MEASUREMENT_ID,
    });
    void ensureGa4Initialized(LANDING_GA4_MEASUREMENT_ID)
      .then(() => {
        if (!cancelled) {
          const attribution = buildMarketingAttribution({
            pathname,
            search,
            referrer: document.referrer,
            origin: window.location.origin,
          });
          if (attribution) {
            persistMarketingAttribution(attribution);
          }
          debugLandingGa4('[landing][ga4-debug] ensureGa4Initialized resolved, setting isReady=true');
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('[landing] GA4 initialization failed.', error);
      });

    return () => {
      cancelled = true;
    };
  }, [consent, pathname, search]);

  useEffect(() => {
    if (!isReady || consent !== 'accepted') {
      return;
    }

    const pageKey = `${pathname}${search}`;
    if (trackedPageViews.current.has(pageKey)) {
      return;
    }

    trackedPageViews.current.add(pageKey);
    sendGaEvent('page_view', {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}${search}`,
      ...getMarketingEventParams({
        pathname,
        search,
        allowStoredAttribution: true,
      }),
    });
  }, [consent, isReady, pathname, search]);

  useEffect(() => {
    if (!isReady || consent !== 'accepted') {
      return;
    }

    const milestones = [25, 50, 75, 100];

    const handleScroll = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);

      if (maxScroll <= 0) {
        return;
      }

      const scrolled = Math.min(window.scrollY / maxScroll, 1);
      const percent = Math.round(scrolled * 100);

      milestones.forEach((milestone) => {
        if (percent >= milestone && !trackedScrollMilestones.current.has(milestone)) {
          trackedScrollMilestones.current.add(milestone);
          sendGaEvent('scroll', {
            percent_scrolled: milestone,
            page_path: pathname,
            ...getMarketingEventParams({
              pathname,
              search,
              allowStoredAttribution: true,
            }),
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [consent, isReady, pathname, search]);

  useEffect(() => {
    if (!isReady || consent !== 'accepted') {
      return;
    }

    const clickHandler = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-analytics-cta]');

      if (!element) {
        return;
      }

      const ctaName = element.dataset.analyticsCta;
      const ctaLocation = element.dataset.analyticsLocation;
      const destination = element.getAttribute('href') ?? element.dataset.analyticsDestination ?? '';
      const isOutbound = /^https?:\/\//i.test(destination);

      if (!ctaName) {
        return;
      }

      sendGaEvent('landing_cta_clicked', {
        cta_id: ctaName,
        ...(ctaLocation ? { cta_location: ctaLocation } : {}),
        ...(destination ? { destination } : {}),
        outbound: isOutbound,
        page_path: pathname,
        ...getMarketingEventParams({
          pathname,
          search,
          allowStoredAttribution: true,
        }),
      });
    };

    document.addEventListener('click', clickHandler);

    return () => {
      document.removeEventListener('click', clickHandler);
    };
  }, [consent, isReady, pathname, search]);

  useEffect(() => {
    if (!isReady || consent !== 'accepted') {
      return;
    }

    const handler = (event: Event) => {
      const element = event.target as HTMLElement | null;
      const analyticsEvent = element?.closest<HTMLElement>('[data-analytics-event]')?.dataset.analyticsEvent;
      if (!analyticsEvent) {
        return;
      }

      sendGaEvent(analyticsEvent, {
        page_path: pathname,
        ...(element?.dataset.analyticsValue ? { event_value: element.dataset.analyticsValue } : {}),
        ...getMarketingEventParams({
          pathname,
          search,
          allowStoredAttribution: true,
        }),
      });
    };

    document.addEventListener('click', handler);
    document.addEventListener('change', handler);

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('change', handler);
    };
  }, [consent, isReady, pathname, search]);
}
