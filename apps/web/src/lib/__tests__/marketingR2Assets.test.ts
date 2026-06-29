import { describe, expect, it } from 'vitest';
import { buildMarketingAssetKey, isMarketingAssetStoredOnR2 } from '../marketingR2Assets';

describe('buildMarketingAssetKey', () => {
  it('builds stable public R2 object keys for campaign assets', () => {
    expect(
      buildMarketingAssetKey({
        campaignCode: 'IB20 MVP',
        postId: 'post_001',
        file: 'post-001-carousel-01.png',
      }),
    ).toBe('campaigns/ib20-mvp/post_001/post-001-carousel-01.png');
  });

  it('uses only the file basename when a source path is passed', () => {
    expect(
      buildMarketingAssetKey({
        campaignCode: '2026/07 Launch',
        postId: 'Post 002',
        file: 'Docs/marketing/assets/post-002.png',
      }),
    ).toBe('campaigns/2026-07-launch/post-002/post-002.png');
  });

  it('detects assets that already point at the R2 public base URL', () => {
    expect(
      isMarketingAssetStoredOnR2(
        'https://assets.innerbloomjourney.org/campaigns/ib20_mvp/post_001/post-001-carousel-01.png',
        'https://assets.innerbloomjourney.org/',
      ),
    ).toBe(true);

    expect(
      isMarketingAssetStoredOnR2(
        'https://raw.githubusercontent.com/rfullivarri/innerbloomv3/main/Docs/marketing/post.png',
        'https://assets.innerbloomjourney.org',
      ),
    ).toBe(false);
  });
});
