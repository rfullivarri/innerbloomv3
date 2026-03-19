import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEMO_MODE_SELECT_OG_IMAGE_HEIGHT,
  DEMO_MODE_SELECT_OG_IMAGE_TYPE,
  DEMO_MODE_SELECT_OG_IMAGE_URL,
  DEMO_MODE_SELECT_OG_IMAGE_WIDTH,
} from './lib/demoModeSelectSeo';

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
    expect(demoModeSelectHtml).toContain(`content="${DEMO_MODE_SELECT_OG_IMAGE_URL}"`);
    expect(demoModeSelectHtml).toContain(`content="${DEMO_MODE_SELECT_OG_IMAGE_TYPE}"`);
    expect(demoModeSelectHtml).toContain(`content="${DEMO_MODE_SELECT_OG_IMAGE_WIDTH}"`);
    expect(demoModeSelectHtml).toContain(`content="${DEMO_MODE_SELECT_OG_IMAGE_HEIGHT}"`);
  });
});
