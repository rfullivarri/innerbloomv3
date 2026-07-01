import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import {
  buildMarketingCmoContextWithDeps,
  buildMarketingPeriod,
  parseMarkdownSections,
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

  it('fails clearly when no analytics run exists', async () => {
    const fixture = await createFixture({
      analyticsError: new HttpError(409, 'marketing_analytics_run_missing', 'No completed marketing analytics run found.'),
    });

    await expect(
      buildMarketingCmoContextWithDeps({ periodKey: '2026-07' }, fixture.deps),
    ).rejects.toMatchObject({
      status: 409,
      code: 'marketing_analytics_run_missing',
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
    const contents = await readFile(outputPath, 'utf8');
    expect(contents).toContain('"schema_version": "1.0"');
    expect(contents).toContain('"current_period": "2026-07"');
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

  it('parses markdown headings, bullets, and numbered lists', () => {
    const sections = parseMarkdownSections(`
## Current Objective

Acquire early adopters.

## Known Gaps

- Metrics are sparse.
1. Metricool is manual.
`);

    expect(sections.get('current objective')).toEqual(['Acquire early adopters.']);
    expect(sections.get('known gaps')).toEqual(['Metrics are sparse.', 'Metricool is manual.']);
  });

  it('extracts objective, known gaps, campaign defaults, and keeps audience explicit-only', async () => {
    const fixture = await createFixture();
    const result = await buildMarketingCmoContextWithDeps(
      { periodKey: '2026-07', force: true },
      fixture.deps,
    );
    const json = JSON.parse(await readFile(result.outputPath, 'utf8')) as {
      business_context: {
        current_marketing_objective: string;
        product_stage: string;
        audience: string[];
        notes: string[];
      };
      strategy_memory: {
        known_risks: string[];
        open_questions: string[];
        campaign_defaults: {
          default_platform: string;
          default_language: string;
          default_monthly_post_count: number;
          current_tested_formats: string[];
        };
      };
      period: { target_post_count: number };
      available_assets: {
        existing_visuals: { file_path?: string }[];
        reusable_templates: { file_path?: string }[];
      };
    };

    expect(json.business_context.current_marketing_objective).toContain('Acquire early adopter users');
    expect(json.business_context.product_stage).toBe('early-stage MVP');
    expect(json.business_context.audience).toEqual([]);
    expect(json.business_context.notes).toContain('No explicit audience section found in strategy memory or structured configuration.');
    expect(json.strategy_memory.known_risks).toContain('Monthly draft generation is not automated yet.');
    expect(json.strategy_memory.open_questions).toContain('Metricool performance data is manual export for now.');
    expect(json.strategy_memory.campaign_defaults).toMatchObject({
      default_platform: 'Instagram',
      default_language: 'English',
      default_monthly_post_count: 20,
      current_tested_formats: ['square static', 'square carousel'],
    });
    expect(json.period.target_post_count).toBe(20);
    expect(JSON.stringify(json.available_assets)).not.toContain('notes.md');
    expect(JSON.stringify(json.available_assets)).not.toContain('asset-manifest.json');
    expect(json.available_assets.reusable_templates.some((asset) => asset.file_path?.endsWith('template.html'))).toBe(true);
  });
});

async function createFixture(options: {
  analyticsPayload?: Record<string, unknown>;
  analyticsError?: Error;
} = {}) {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'innerbloom-cmo-'));
  const outputRoot = path.join(repoRoot, 'marketing/agent-inputs');
  await mkdir(path.join(repoRoot, 'Docs/marketing'), { recursive: true });
  await mkdir(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets'), { recursive: true });
  await writeFile(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets/post.png'), 'not-binary');
  await writeFile(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets/template.html'), '<html></html>');
  await writeFile(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets/notes.md'), '# Notes');
  await writeFile(path.join(repoRoot, 'Docs/marketing/campaigns/2026-06-mvp/assets/asset-manifest.json'), '{}');
  await writeFile(
    path.join(repoRoot, 'Docs/marketing/strategy-memory.md'),
    `# Innerbloom Marketing Strategy Memory

## Current Objective

Acquire early adopter users for Innerbloom 2.0 with lightweight, measurable social content.

## Current Positioning

Innerbloom helps people build sustainable habits that adapt to real life instead of forcing rigid streaks.

- adaptive habits
- early product, feedback welcome

## Campaign Defaults

- Default platform: Instagram
- Default language: English
- Default monthly post count: 20
- Current MVP campaign code: \`ib20_mvp\`
- Current tested format: square static + square carousel

## Baseline: 2026-06 MVP

- Metricool CSV import works.
- Cloudflare R2 is now the publishing asset store for CSV exports.
- GA4 and Search Console snapshots can be synced into Neon and shown in \`/admin/marketing\`.

## Data Interpretation Rules

- Treat landing page views as acquisition signal.
- Treat \`/innerbloom2/...\` pages as product usage signal.

## First 20-Post Strategy Proposal

Planned mix:

- 8 pain/friction posts.
- 5 product mechanism/demo posts.

Creative rules:

1. Prefer real Innerbloom 2.0 screenshots over generic lifestyle imagery.
2. Use R2 URLs in Metricool CSV output.

## Known Gaps

- Monthly draft generation is not automated yet.
- Metricool performance data is manual export for now.

## Next Run Instructions

1. Keep the number of configurable knobs small.
2. Preserve every decision and result in this strategy memory.
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

  const dbPool = { query: vi.fn() };
  const analyticsLoader = vi.fn(async () => {
    if (options.analyticsError) {
      throw options.analyticsError;
    }

    return {
      syncRunId: 'sync-1',
      updatedAt: '2026-07-01T00:00:00.000Z',
      context: {
        sync_run_id: 'sync-1',
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        data_quality: { status: 'valid', issues: [] },
        marketing_totals: analyticsPayload.marketing_totals,
        product_totals: analyticsPayload.product_totals,
        registered_users: analyticsPayload.registered_users,
        top_pages: analyticsPayload.top_pages,
        marketing_pages: analyticsPayload.marketing_pages,
        product_pages: analyticsPayload.product_pages,
        top_sources: analyticsPayload.top_sources,
        clean_sources: analyticsPayload.clean_sources,
        top_events: analyticsPayload.top_events,
        search_console_queries: analyticsPayload.search_console_queries,
        funnel_events: analyticsPayload.funnel_events,
      },
    };
  });

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
      analyticsLoader,
    },
  };
}
