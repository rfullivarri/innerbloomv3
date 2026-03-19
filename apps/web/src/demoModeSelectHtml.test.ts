import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const demoModeSelectHtml = readFileSync(resolve(__dirname, '../demo-mode-select/index.html'), 'utf8');

describe('demo mode select initial HTML metadata', () => {
  it('includes share metadata in the prerendered HTML shell', () => {
    expect(demoModeSelectHtml).toContain('property="og:title"');
    expect(demoModeSelectHtml).toContain('property="og:description"');
    expect(demoModeSelectHtml).toContain('property="og:url"');
    expect(demoModeSelectHtml).toContain('property="og:image"');
    expect(demoModeSelectHtml).toContain('name="twitter:image"');
    expect(demoModeSelectHtml).toContain('rel="canonical"');
    expect(demoModeSelectHtml).toContain('https://innerbloomjourney.org/demo-mode-select');
  });
});
