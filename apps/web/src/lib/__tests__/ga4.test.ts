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

    await ensureGa4Initialized('G-TEST1234');
    sendGaEvent('page_view', { page_path: '/' });

    const script = document.getElementById('innerbloom-ga4-script') as HTMLScriptElement | null;

    expect(script?.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234');
    expect(window.dataLayer).toContainEqual(['config', 'G-TEST1234', { anonymize_ip: true }]);
    expect(window.dataLayer).toContainEqual(['event', 'page_view', { page_path: '/' }]);
  });
});
