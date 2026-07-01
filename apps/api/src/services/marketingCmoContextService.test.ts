import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import {
  buildMarketingCmoContextWithDeps,
  buildMarketingPeriod,
  type MarketingAnalyticsContext,
} from './marketingCmoContextService.js';
import type { MarketingCampaignWithMetricsPayload } from './marketingCampaignService.js';

const schemaPath = path.resolve(process.cwd(), '../../prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json');

describe('marketingCmoContextService', () => {
  it('calculates the previous full Madrid marketing period', () => {
    const period = buildMarketingPeriod('2026-07');

    expect(period.previousPeriodKey).toBe('2026-06');
    expect(period.analyticsWindow).toEqual({
      period_start: '2026-06-01',
      period_end: '2026-06-30',
      period_start_utc: '2026-05-31T22:00:00.000Z',
      period_end_utc: '2026-06-30T21:59:59.999Z',
    });
  });

  it('builds and writes a valid context with persisted data', async () => {
    const fixture = await createFixture();
    const result = await buildMarketingCmoContextWithDeps(
      { periodKey: '2026-07' },
      fixture.deps,
    );

    expect(result.status).toBe('written');
    const json = JSON.parse(await readFile(result.outputPath, 'utf8')) as { analytics: MarketingAnalyticsContext };
    expect(json.analytics.sync_run_id).toBe('sync-1');
    expect(json.analytics.top_pages).toHaveLength(1);
  });

  it('fails clearly when no analytics snapshot table exists', async () => {
    const fixture = await createFixture({ analyticsTableExists: false });

    await expect(
      buildMarketingCmoContextWithDeps({ periodKey: '2026-07' }, fixture.deps),
    ).rejects.toMatchObject({
      status: 409,
      code: 'marketing_analytics_snapshot_missing',
    });
  });

  it('does not write an invalid schema payload', async () => {
    const fixture = await createFixture();
    const badSchemaPath = path.join(fixture.repoRoot, 'bad.schema.json');
    await writeFile(
      badSchemaPath,
      JSON.stringify({
        type: 'object',
        required: ['missing_required_field'],
        properties: { missing_required_field: { type: 'string' } },
      }),
    );

    await expect(
      buildMarketingCmoContextWithDeps(
        { periodKey: '2026-07' },
        { ...fixture.deps, schemaPath: badSchemaPath },
      ),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('returns already_exists without force when the file is present', async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.outputRoot, '2026-07', 'cmo-context.json');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, '{"existing":true}\n');

    const result = await buildMarketingCmoContextWithDeps(
      { periodKey: '2026-07', force: false },
      fixture.deps,
    );

    expect(result.status).toBe('already_exists');
    expect(fixture.dbPool.query).not.toHaveBeenCalled();
  });

  it('overwrites when force is true', async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.outputRoot, '2026-07', 'cmo-context.json');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, '{"existing":true}\n');

    const result = await buildMarketingCmoContextWithDeps(
      { periodKey: '2026-07', force: true },
      fixture.deps,
    );

    expect(result.status).toBe('written');
    expect(await readFile(outputPath, 'utf8')).toContain('"schema_version": "cmo-input-v1"');
  });

  it('redacts sensitive keys from analytics payloads', async () => {
    const fixture = await createFixture({
      analyticsPayload: {
        marketing_totals: { sessions: 4, token: 'secret-token' },
        product_totals: { dashboard_views: 2 },
        registered_users: { count: 3, user_id: 'user-123', email: 'person@example.com' },
        top_pages: [{ path: '/', user_id: 'user-456' }],
      },
    });

    const result = await buildMarketingCmoContextWithDeps(
      { periodKey: '2026-07', force: true },
      fixture.deps,
    );
    const contents = await readFile(result.outputPath, 'utf8');

    expect(contents).not.toContain('secret-token');
    expect(contents).not.toContain('person@example.com');
    expect(contents).not.toContain('user-123');
    expect(contents).toContain('[redacted]');
  });
});

async function createFixture(options: {
  analyticsTableExists?: boolean;
  analyticsPayload?: Record<string, unknown>;
} = {}) {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'innerbloom-cmo-'));
  const outputRoot = path.join(repoRoot, 'marketing/agent-inputs');
  await mkdir(path.join(repoRoot, 'Docs/marketing'), { recursive: true });
  await mkdir(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets'), { recursive: true });
  await writeFile(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets/post.png'), 'not-binary');
  await writeFile(
    path.join(repoRoot, 'Docs/marketing/STRATEGY_MEMORY.md'),
    `# Innerbloom Marketing Strategy Memory

### 2026-06-29 | 2026-06 MVP baseline

- **Insights detected:** Instagram / social is the top acquisition source after hygiene filters
- **Hypotheses:** Adaptive rhythm can differentiate Innerbloom from rigid streak-based habit apps
- **Decisions taken:** Keep the 2026-06 MVP campaign as a small validation loop; export only approved posts to Metricool
- **Changes vs previous strategy:** Move from one long operational board to a tabbed monthly workflow
- **What worked:** Clear anti-perfect-days hook
- **What did not work:** Ambiguous internal shorthand
- **Learnings:** Every post should map to a measurable funnel event
- **Next experiments:** Test dashboard walkthrough carousel
- **Recommendations for future content proposals:** Tie each hook to one user pain and one product mechanism
`,
  );

  const analyticsPayload = {
    marketing_totals: { sessions: 10 },
    product_totals: { dashboard_views: 4 },
    registered_users: { count: 2 },
    top_pages: [{ path: '/', views: 8 }],
    marketing_pages: [{ path: '/', views: 8 }],
    product_pages: [{ path: '/dashboard', views: 4 }],
    top_sources: [{ source: 'instagram', sessions: 6 }],
    clean_sources: [{ source: 'instagram / social', sessions: 6 }],
    top_events: [{ event_name: 'page_view', count: 8 }],
    search_console_queries: [{ query: 'innerbloom', clicks: 1 }],
    funnel_events: [{ event_name: 'landing_cta_clicked', count: 2 }],
    ...options.analyticsPayload,
  };

  const dbPool = {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return { rows: [{ exists: options.analyticsTableExists ?? true }] };
      }

      return {
        rows: [
          {
            sync_run_id: 'sync-1',
            period_start: '2026-06-01',
            period_end: '2026-06-30',
            snapshot_payload: analyticsPayload,
            data_quality: { status: 'valid', issues: [] },
            updated_at: '2026-07-01T00:00:00.000Z',
          },
        ],
      };
    }),
  };

  const campaigns: MarketingCampaignWithMetricsPayload[] = [
    {
      id: 'campaign-1',
      periodKey: '2026-06',
      campaignCode: 'ib20_mvp',
      title: 'Innerbloom MVP',
      objective: 'new_users',
      status: 'review',
      strategySummary: 'Validate first acquisition loop.',
      sourceContext: {},
      updatedAt: '2026-06-30T10:00:00.000Z',
      posts: [
        {
          postCode: 'post_001',
          platform: 'instagram',
          format: 'carousel',
          status: 'needs_review',
          hook: 'Your habits should adapt.',
          caption: 'Caption',
          hypothesis: 'People tired of rigid streaks will respond.',
          targetMetric: 'page_view -> landing_cta_clicked',
          trackingUrl: 'https://innerbloomjourney.org/?utm_source=instagram',
          assetUrls: [{ file: 'post.png', title: 'Post image', type: 'image' }],
          agentNotes: '',
          decisionNote: 'Needs review',
          rejectionReason: '',
          scheduledAt: '2026-06-30T17:30:00.000Z',
          approvedAt: null,
          rejectedAt: null,
          publishedAt: null,
          measuredAt: null,
          updatedAt: '2026-06-30T10:00:00.000Z',
          metrics: [
            {
              source: 'manual',
              periodStart: '2026-06-01',
              periodEnd: '2026-06-30',
              impressions: 100,
              reach: 80,
              clicks: 5,
              sessions: 4,
              landingCtaClicks: 1,
              signups: 1,
              dashboardViews: 1,
              leads: 0,
              notes: '',
              importedAt: '2026-07-01T00:00:00.000Z',
            },
          ],
        },
      ],
    },
  ];

  return {
    repoRoot,
    outputRoot,
    dbPool,
    deps: {
      repoRoot,
      outputRoot,
      schemaPath,
      dbPool,
      campaignLoader: vi.fn(async () => campaigns),
    },
  };
}
