import { useEffect, useRef, useState } from 'react';
import { type AnalyticsConsentStatus } from '../../lib/cookieConsent';
import { ensureGa4Initialized, sendGaEvent } from '../../lib/ga4';

const LANDING_GA4_MEASUREMENT_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID ?? '').trim();
let missingMeasurementIdWarningShown = false;

function buildPageLocation(pathname: string, search: string, hash: string): string {
  if (typeof window === 'undefined') {
    return pathname;
  }

  return `${window.location.origin}${pathname}${search}${hash}`;
}

export function useLandingAnalytics({
  consent,
  language,
  pathname,
  search,
  hash,
}: {
  consent: AnalyticsConsentStatus;
  language: string;
  pathname: string;
  search: string;
  hash: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const trackedScrollMilestones = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (consent !== 'accepted') {
      setIsReady(false);
      trackedScrollMilestones.current.clear();
      return;
    }

    if (!LANDING_GA4_MEASUREMENT_ID) {
      if (!missingMeasurementIdWarningShown) {
        missingMeasurementIdWarningShown = true;
        console.warn('[landing] VITE_GA4_MEASUREMENT_ID is not configured. GA4 will stay disabled.');
      }
      setIsReady(false);
      return;
    }

    let cancelled = false;

    void ensureGa4Initialized(LANDING_GA4_MEASUREMENT_ID)
      .then(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('[landing] GA4 initialization failed.', error);
      });

    return () => {
      cancelled = true;
    };
  }, [consent]);

  useEffect(() => {
    if (!isReady || consent !== 'accepted') {
      return;
    }

    sendGaEvent('page_view', {
      page_title: document.title,
      page_path: pathname,
      page_location: buildPageLocation(pathname, search, hash),
      language,
    });
  }, [consent, hash, isReady, language, pathname, search]);

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
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [consent, isReady, pathname]);

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

      if (!ctaName) {
        return;
      }

      sendGaEvent('click', {
        cta_name: ctaName,
        page_path: pathname,
      });
    };

    document.addEventListener('click', clickHandler);

    return () => {
      document.removeEventListener('click', clickHandler);
    };
  }, [consent, isReady, pathname]);
}
