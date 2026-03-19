import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_CANONICAL_URL,
  ONBOARDING_OG_IMAGE_HEIGHT,
  ONBOARDING_OG_IMAGE_TYPE,
  ONBOARDING_OG_IMAGE_URL,
  ONBOARDING_OG_IMAGE_WIDTH,
} from './lib/onboardingSeo';

const onboardingHtml = readFileSync(resolve(__dirname, '../onboarding/index.html'), 'utf8');

describe('onboarding initial HTML metadata', () => {
  it('includes share metadata in the prerendered HTML shell', () => {
    expect(onboardingHtml).toContain('property="og:title"');
    expect(onboardingHtml).toContain('property="og:description"');
    expect(onboardingHtml).toContain('property="og:url"');
    expect(onboardingHtml).toContain('property="og:image"');
    expect(onboardingHtml).toContain('name="twitter:image"');
    expect(onboardingHtml).toContain('rel="canonical"');
    expect(onboardingHtml).toContain(ONBOARDING_CANONICAL_URL);
    expect(onboardingHtml).toContain(`content="${ONBOARDING_OG_IMAGE_URL}"`);
    expect(onboardingHtml).toContain(`content="${ONBOARDING_OG_IMAGE_TYPE}"`);
    expect(onboardingHtml).toContain(`content="${ONBOARDING_OG_IMAGE_WIDTH}"`);
    expect(onboardingHtml).toContain(`content="${ONBOARDING_OG_IMAGE_HEIGHT}"`);
  });
});
