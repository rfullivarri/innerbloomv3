import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AnalyticsConsentStatus } from '../../lib/cookieConsent';
import { isMetricoolLandingPath, resetMetricoolTrackingForTests, useMetricoolTracking } from './useMetricoolTracking';

function MetricoolHarness({ consent, pathname }: { consent: AnalyticsConsentStatus; pathname: string }) {
  useMetricoolTracking({ consent, pathname });
  return null;
}

describe('useMetricoolTracking', () => {
  beforeEach(() => {
    resetMetricoolTrackingForTests();
    document.head.innerHTML = '';
    window.beTracker = { t: vi.fn() };
  });

  afterEach(() => {
    resetMetricoolTrackingForTests();
    document.head.innerHTML = '';
    delete window.beTracker;
    vi.restoreAllMocks();
  });

  it('only allows the three public landing paths', () => {
    expect(isMetricoolLandingPath('/')).toBe(true);
    expect(isMetricoolLandingPath('/v2')).toBe(true);
    expect(isMetricoolLandingPath('/v3')).toBe(true);
    expect(isMetricoolLandingPath('/v2/')).toBe(true);
    expect(isMetricoolLandingPath('/login')).toBe(false);
    expect(isMetricoolLandingPath('/sign-up')).toBe(false);
    expect(isMetricoolLandingPath('/onboarding')).toBe(false);
    expect(isMetricoolLandingPath('/dashboard')).toBe(false);
    expect(isMetricoolLandingPath('/pricing')).toBe(false);
  });

  it.each(['/', '/v2', '/v3'])('loads and tracks on %s with analytics consent', async (pathname) => {
    render(<MetricoolHarness consent="accepted" pathname={pathname} />);

    const script = await findMetricoolScript();
    script.dispatchEvent(new Event('load'));

    await vi.waitFor(() => {
      expect(window.beTracker?.t).toHaveBeenCalledWith({ hash: 'a88da44ed483bed8d8615d3f9ca928bc' });
    });
  });

  it.each(['/login', '/sign-up', '/onboarding', '/dashboard', '/innerbloom2/dashboard', '/pricing'])('does not load or track on %s', async (pathname) => {
    render(<MetricoolHarness consent="accepted" pathname={pathname} />);

    expect(getMetricoolScripts()).toHaveLength(0);
    expect(window.beTracker?.t).not.toHaveBeenCalled();
  });

  it('does not load without analytics consent', () => {
    render(<MetricoolHarness consent="rejected" pathname="/" />);
    render(<MetricoolHarness consent="unset" pathname="/v2" />);

    expect(getMetricoolScripts()).toHaveLength(0);
    expect(window.beTracker?.t).not.toHaveBeenCalled();
  });

  it('does not insert the script more than once or duplicate tracking for the same landing path', async () => {
    const { rerender } = render(<MetricoolHarness consent="accepted" pathname="/" />);

    const script = await findMetricoolScript();
    script.dispatchEvent(new Event('load'));

    await vi.waitFor(() => {
      expect(window.beTracker?.t).toHaveBeenCalledTimes(1);
    });

    rerender(<MetricoolHarness consent="accepted" pathname="/v2" />);
    await vi.waitFor(() => {
      expect(window.beTracker?.t).toHaveBeenCalledTimes(2);
    });

    rerender(<MetricoolHarness consent="accepted" pathname="/" />);

    expect(getMetricoolScripts()).toHaveLength(1);
    expect(window.beTracker?.t).toHaveBeenCalledTimes(2);
  });
});

function getMetricoolScripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[src="https://tracker.metricool.com/resources/be.js"]'));
}

async function findMetricoolScript(): Promise<HTMLScriptElement> {
  await vi.waitFor(() => {
    expect(getMetricoolScripts()).toHaveLength(1);
  });
  return getMetricoolScripts()[0];
}
