import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ga4 bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = '';
    // @ts-expect-error test cleanup
    delete window.gtag;
    // @ts-expect-error test cleanup
    delete window.dataLayer;
  });

  it('bootstraps the google tag snippet and configures GA4', async () => {
    const { ensureGa4Initialized, sendGaEvent } = await import('../ga4');

    const initializePromise = ensureGa4Initialized('G-TEST1234');

    const script = document.getElementById('innerbloom-ga4-script') as HTMLScriptElement | null;
    expect(script?.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234');
    script?.dispatchEvent(new Event('load'));

    await initializePromise;
    sendGaEvent('page_view', { page_path: '/' });

    expect(window.dataLayer).toContainEqual(expect.objectContaining({
      0: 'config',
      1: 'G-TEST1234',
    }));
    expect(window.dataLayer).toContainEqual(expect.objectContaining({
      0: 'event',
      1: 'page_view',
      2: { page_path: '/' },
    }));
  });
});
