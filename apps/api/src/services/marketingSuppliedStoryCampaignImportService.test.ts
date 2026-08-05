import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClientQuery, mockConnect } = vi.hoisted(() => {
  const query = vi.fn();
  return {
    mockClientQuery: query,
    mockConnect: vi.fn(async () => ({ query, release: vi.fn() })),
  };
});

vi.mock('../db.js', () => ({
  pool: { connect: mockConnect },
}));

import { importSuppliedStoryCampaign, readSuppliedStoryCampaign } from './marketingSuppliedStoryCampaignImportService.js';

describe('importSuppliedStoryCampaign', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    mockConnect.mockClear();
    mockClientQuery.mockImplementation(async (sql: string) => (
      sql.includes('INSERT INTO marketing_campaigns')
        ? { rows: [{ marketing_campaign_id: 'campaign-id' }] }
        : { rows: [] }
    ));
  });

  it('uses the campaign state contract and keeps review state on posts', async () => {
    await importSuppliedStoryCampaign({
      campaign: {
        campaign_code: 'ib_202608_stories',
        title: 'Supplied Stories',
        period_key: '2026-08',
        objective: 'new_users',
        source_campaign_code: 'ib_202607',
        source_drive_folder_id: 'folder-id',
        brand_logo_drive_file_id: 'logo-id',
      },
      stories: [{
        post_code: 'post_001',
        source_drive_file_id: 'file-id',
        source_file_name: 'base.png',
        visible_copy: { headline: 'A clear hook', cta: 'Try it' },
        caption: 'Caption',
        hypothesis: 'Hypothesis',
        target_metric: 'Metric',
        tracking_url: 'https://innerbloomjourney.org',
        scheduled_at: '2026-08-05T15:00:00Z',
      }],
    });

    const campaignInsert = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO marketing_campaigns'));
    const postInsert = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO marketing_posts'));

    expect(campaignInsert?.[0]).toContain("'review'");
    expect(campaignInsert?.[1]).toEqual([
      '2026-08',
      'ib_202608_stories',
      'Supplied Stories',
      'new_users',
      '',
      expect.any(String),
    ]);
    expect(postInsert?.[0]).toContain("'needs_review'");
  });

  it('rejects a configuration without the database-required campaign fields', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'supplied-story-campaign-'));
    const campaignPath = path.join(directory, 'campaign.json');

    await writeFile(campaignPath, JSON.stringify({
      campaign: { campaign_code: 'ib_invalid', title: 'Invalid campaign' },
      stories: [{ post_code: 'post_001' }],
    }));

    await expect(readSuppliedStoryCampaign(campaignPath)).rejects.toThrow('Invalid supplied Story campaign configuration.');
    await rm(directory, { recursive: true, force: true });
  });
});
