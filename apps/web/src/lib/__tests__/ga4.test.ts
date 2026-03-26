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

  it('initializes when an existing GA script is already complete', async () => {
    const existingScript = document.createElement('script');
    existingScript.id = 'innerbloom-ga4-script';
    existingScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-TEST1234';
    Object.defineProperty(existingScript, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    document.head.appendChild(existingScript);

    const { ensureGa4Initialized, sendGaEvent } = await import('../ga4');

    await ensureGa4Initialized('G-TEST1234');
    sendGaEvent('page_view', { page_path: '/' });

    expect(existingScript.dataset.loaded).toBe('true');
    expect(window.dataLayer).toBeDefined();
    expect(window.dataLayer).toContainEqual(['event', 'page_view', { page_path: '/' }]);
  });
});
