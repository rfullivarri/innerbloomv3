import { describe, expect, it } from 'vitest';
import { marketingCampaignSeed } from '../../content/marketingAdminSeed';
import { buildMetricoolCalendarCsv } from '../marketingMetricoolCsv';

describe('buildMetricoolCalendarCsv', () => {
  it('exports only the approved posts passed to it in Metricool import format', () => {
    const post = {
      ...marketingCampaignSeed.posts[0],
      status: 'approved' as const,
    };
    const csv = buildMetricoolCalendarCsv([post]);

    expect(csv).toContain('Text,Date,Time,Draft');
    expect(csv).toContain('Instagram');
    expect(csv).toContain(post.scheduledDate);
    expect(csv).toContain(post.scheduledTime);
    expect(csv).toContain(post.assets[0].url);
    expect(csv).toContain('TRUE');
    expect(csv).not.toContain(marketingCampaignSeed.posts[1].trackingUrl);
  });
});
