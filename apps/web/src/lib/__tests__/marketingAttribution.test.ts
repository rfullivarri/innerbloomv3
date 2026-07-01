import { describe, expect, it } from 'vitest';
import {
  buildMarketingAttribution,
  getMarketingEventParams,
  resolveLandingVariant,
} from '../marketingAttribution';

describe('marketing attribution', () => {
  it('resolves public landing variants', () => {
    expect(resolveLandingVariant('/')).toBe('root_v3');
    expect(resolveLandingVariant('/v2')).toBe('v2');
    expect(resolveLandingVariant('/v3')).toBe('v3_legacy');
    expect(resolveLandingVariant('/pricing')).toBe('unknown');
  });

  it('builds attribution from UTM and Innerbloom campaign params', () => {
    const attribution = buildMarketingAttribution({
      pathname: '/v2',
      search: '?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
      referrer: 'https://instagram.com/p/example',
      origin: 'https://innerbloomjourney.org',
      now: new Date('2026-06-27T10:00:00.000Z'),
    });

    expect(attribution).toMatchObject({
      captured_at: '2026-06-27T10:00:00.000Z',
      entry_path: '/v2?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
      landing_variant: 'v2',
      referrer_domain: 'instagram.com',
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'ib20_mvp',
      utm_content: 'post_001',
      ib_post: '001',
    });
  });

  it('ignores internal referrers without explicit campaign params', () => {
    const attribution = buildMarketingAttribution({
      pathname: '/',
      search: '',
      referrer: 'https://innerbloomjourney.org/v2',
      origin: 'https://innerbloomjourney.org',
      now: new Date('2026-06-27T10:00:00.000Z'),
    });

    expect(attribution).toBeNull();
  });

  it('always includes current landing variant in event params', () => {
    expect(getMarketingEventParams({
      pathname: '/v3',
      search: '',
      allowStoredAttribution: false,
    })).toEqual({ landing_variant: 'v3_legacy' });
  });
});

