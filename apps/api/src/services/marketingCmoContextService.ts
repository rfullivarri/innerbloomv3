import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as Ajv2020Module from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';
import type { Pool } from 'pg';
import { HttpError } from '../lib/http-error.js';
import {
  getPersistedMarketingAnalyticsContextForPeriod,
  type PersistedMarketingAnalyticsContext,
} from './marketingAnalyticsService.js';
import {
  listRecentMarketingCampaignsForContext,
  type MarketingCampaignWithMetricsPayload,
} from './marketingCampaignService.js';

const MARKETING_TIMEZONE = 'Europe/Madrid';
const DEFAULT_MONTHLY_CAPACITY_POSTS = 20;
const MAX_CONTEXT_CAMPAIGNS = 12;
const SCHEMA_VERSION = '1.0';
const MANUAL_CONFIG_CAPTURED_AT = '2026-06-30T00:00:00.000Z';

export type BuildMarketingCmoContextParams = {
  periodKey: string;
  force?: boolean;
};

export type MarketingCmoContextResult = {
  status: 'written' | 'already_exists';
  periodKey: string;
  previousPeriodKey: string;
  outputPath: string;
  sourceSummary: Pick<MarketingCmoSourceManifestEntry, 'source_type' | 'source_path_or_id'>[];
};

export type MarketingCmoSourceManifestEntry = {
  source_type: 'repo_file' | 'database_snapshot' | 'analytics_sync' | 'manual_input' | 'asset_manifest';
  source_path_or_id: string;
  captured_at: string;
  checksum?: string | null;
};

export type MarketingCmoContext = {
  schema_version: typeof SCHEMA_VERSION;
  period: {
    current_period: string;
    previous_period: string;
    timezone: typeof MARKETING_TIMEZONE;
    target_post_count: number;
    analysis_window: {
      start_date: string;
      end_date: string;
    };
  };
  business_context: {
    current_marketing_objective: string;
    product_stage: string;
    audience: string[];
    current_priorities: string[];
    constraints: string[];
    known_product_changes: string[];
    notes: string[];
  };
  strategy_memory: MarketingStrategyMemoryContext;
  analytics: MarketingAnalyticsContext;
  previous_campaigns: MarketingCmoCampaignContext[];
  available_assets: MarketingCmoAvailableAssets;
  operational_constraints: MarketingOperationalConstraints;
  source_manifest: MarketingCmoSourceManifestEntry[];
};

export type MarketingStrategyMemoryContext = {
  document_path: string;
  current_objective: string;
  current_positioning: string[];
  historical_learnings: string[];
  previous_experiments: string[];
  previous_decisions: string[];
  content_rules: string[];
  known_risks: string[];
  open_questions: string[];
  campaign_defaults: {
    default_platform: string;
    default_language: string;
    default_monthly_post_count: number | null;
    current_tested_formats: string[];
    current_mvp_campaign_code: string;
  };
};

export type MarketingAnalyticsContext = {
  sync_run_id: string;
  period_start: string;
  period_end: string;
  data_quality: {
    status: string;
    issues: string[];
  };
  marketing_totals: Record<string, unknown>;
  product_totals: Record<string, unknown>;
  registered_users: Record<string, unknown>;
  top_pages: Record<string, unknown>[];
  marketing_pages: Record<string, unknown>[];
  product_pages: Record<string, unknown>[];
  top_sources: Record<string, unknown>[];
  clean_sources: Record<string, unknown>[];
  top_events: Record<string, unknown>[];
  search_console_queries: Record<string, unknown>[];
  funnel_events: Record<string, unknown>[];
};

export type MarketingCmoCampaignContext = {
  campaign_code: string;
  period_key: string;
  objective: string;
  status: string;
  strategy_summary: string;
  posts: MarketingCmoPostContext[];
  results: Record<string, unknown>[];
  human_decisions: string[];
  rejection_reasons: string[];
};

export type MarketingCmoPostContext = {
  post_code: string;
  platform: string;
  format: string;
  status: string;
  hook: string;
  caption: string;
  hypothesis: string;
  target_metric: string;
  tracking_url: string;
  assets: MarketingCmoAsset[];
  agent_notes: string;
  decision_note: string;
  rejection_reason: string;
  timestamps: {
    scheduled_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    published_at: string | null;
    measured_at: string | null;
  };
  metrics: Record<string, unknown>[];
};

export type MarketingCmoAsset = {
  asset_id: string;
  source: string;
  kind: string;
  label: string;
  url?: string;
  file_path?: string;
  campaign_code?: string;
  post_code?: string;
};

export type MarketingCmoAvailableAssets = {
  product_screenshots: MarketingCmoAsset[];
  brand_assets: MarketingCmoAsset[];
  reusable_templates: MarketingCmoAsset[];
  existing_visuals: MarketingCmoAsset[];
  missing_assets: string[];
};

export type MarketingOperationalConstraints = {
  platforms: string[];
  supported_formats: string[];
  publishing: string;
  public_storage: string;
  monthly_capacity_posts: number;
  asset_limits: string[];
  legal_and_brand: string[];
  human_review_required: boolean;
};

type MarketingCmoContextDeps = {
  repoRoot?: string;
  outputRoot?: string;
  schemaPath?: string;
  dbPool?: Pick<Pool, 'query'>;
  campaignLoader?: (limit: number) => Promise<MarketingCampaignWithMetricsPayload[]>;
  analyticsLoader?: (params: {
    periodStart: string;
    periodEnd: string;
    dbPool: Pick<Pool, 'query'>;
  }) => Promise<PersistedMarketingAnalyticsContext>;
};

export async function buildMarketingCmoContext(
  params: BuildMarketingCmoContextParams,
): Promise<MarketingCmoContextResult> {
  return buildMarketingCmoContextWithDeps(params, {});
}

export async function getMarketingCmoContextStatus(periodKey: string): Promise<{
  periodKey: string;
  exists: boolean;
  outputPath: string;
  updatedAt: string | null;
  sizeBytes: number | null;
}> {
  validatePeriodKey(periodKey);
  const repoRoot = resolveRepoRoot();
  const outputPath = getOutputPath(repoRoot, periodKey);

  try {
    const fileStat = await stat(outputPath);
    return {
      periodKey,
      exists: true,
      outputPath,
      updatedAt: fileStat.mtime.toISOString(),
      sizeBytes: fileStat.size,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    return {
      periodKey,
      exists: false,
      outputPath,
      updatedAt: null,
      sizeBytes: null,
    };
  }
}

export async function buildMarketingCmoContextWithDeps(
  params: BuildMarketingCmoContextParams,
  deps: MarketingCmoContextDeps,
): Promise<MarketingCmoContextResult> {
  validatePeriodKey(params.periodKey);

  const repoRoot = deps.repoRoot ?? resolveRepoRoot();
  const outputRoot = deps.outputRoot ?? path.join(repoRoot, 'marketing', 'agent-inputs');
  const outputPath = getOutputPath(outputRoot, params.periodKey, true);
  const period = buildMarketingPeriod(params.periodKey);

  if (!params.force && existsSync(outputPath)) {
    return {
      status: 'already_exists',
      periodKey: params.periodKey,
      previousPeriodKey: period.previousPeriodKey,
      outputPath,
      sourceSummary: [],
    };
  }

  const dbPool = deps.dbPool ?? (await import('../db.js')).pool;
  const campaignLoader = deps.campaignLoader ?? listRecentMarketingCampaignsForContext;
  const analyticsLoader = deps.analyticsLoader ?? getPersistedMarketingAnalyticsContextForPeriod;
  const schemaPath = deps.schemaPath ?? path.join(repoRoot, 'prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json');
  const strategyPath = resolveStrategyMemoryPath(repoRoot);

  const [strategyMemory, campaigns, analytics] = await Promise.all([
    readStrategyMemory(strategyPath, repoRoot),
    campaignLoader(MAX_CONTEXT_CAMPAIGNS),
    analyticsLoader({
      periodStart: period.analyticsWindow.period_start,
      periodEnd: period.analyticsWindow.period_end,
      dbPool,
    }),
  ]);

  const campaignContext = normalizeCampaigns(campaigns);
  const sourceManifest: MarketingCmoSourceManifestEntry[] = [];
  sourceManifest.push(await buildFileSourceManifest('strategy_memory', strategyPath));
  sourceManifest.push(buildAnalyticsSourceManifest(analytics));
  sourceManifest.push(buildCampaignSourceManifest(campaigns));

  const availableAssets = await buildAvailableAssets(repoRoot, campaigns, sourceManifest);
  const operationalConstraints = buildOperationalConstraints(campaigns, strategyMemory);
  const targetPostCount = strategyMemory.campaign_defaults.default_monthly_post_count ?? DEFAULT_MONTHLY_CAPACITY_POSTS;
  const context: MarketingCmoContext = scrubSensitiveValues({
    schema_version: SCHEMA_VERSION,
    period: {
      current_period: params.periodKey,
      previous_period: period.previousPeriodKey,
      timezone: MARKETING_TIMEZONE,
      target_post_count: targetPostCount,
      analysis_window: {
        start_date: period.analyticsWindow.period_start,
        end_date: period.analyticsWindow.period_end,
      },
    },
    business_context: buildBusinessContext(strategyMemory, campaigns, operationalConstraints),
    strategy_memory: strategyMemory,
    analytics: analytics.context,
    previous_campaigns: campaignContext,
    available_assets: availableAssets,
    operational_constraints: operationalConstraints,
    source_manifest: [
      ...sourceManifest,
      {
        source_type: 'manual_input',
        source_path_or_id: 'marketing_cmo_context_service.defaults',
        captured_at: MANUAL_CONFIG_CAPTURED_AT,
        checksum: checksumJson({
          timezone: MARKETING_TIMEZONE,
          monthly_capacity_posts: DEFAULT_MONTHLY_CAPACITY_POSTS,
          max_context_campaigns: MAX_CONTEXT_CAMPAIGNS,
        }),
      },
    ],
  }) as MarketingCmoContext;

  await validateCmoContext(context, schemaPath);
  await writeJsonAtomically(outputPath, context);

  return {
    status: 'written',
    periodKey: params.periodKey,
    previousPeriodKey: period.previousPeriodKey,
    outputPath,
    sourceSummary: context.source_manifest.map((source) => ({
      source_type: source.source_type,
      source_path_or_id: source.source_path_or_id,
    })),
  };
}

export function buildMarketingPeriod(periodKey: string): {
  previousPeriodKey: string;
  analyticsWindow: {
    period_start: string;
    period_end: string;
    period_start_utc: string;
    period_end_utc: string;
  };
} {
  validatePeriodKey(periodKey);
  const [year, month] = periodKey.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousYear = previous.getUTCFullYear();
  const previousMonth = previous.getUTCMonth() + 1;
  const previousPeriodKey = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
  const periodStart = `${previousPeriodKey}-01`;
  const nextMonth = new Date(Date.UTC(previousYear, previousMonth, 1));
  const periodEndDate = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), 0));
  const periodEnd = periodEndDate.toISOString().slice(0, 10);
  const startUtc = zonedDateTimeToUtc(previousYear, previousMonth, 1, 0, 0, 0, 0);
  const nextStartUtc = zonedDateTimeToUtc(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  const endUtc = new Date(nextStartUtc.getTime() - 1);

  return {
    previousPeriodKey,
    analyticsWindow: {
      period_start: periodStart,
      period_end: periodEnd,
      period_start_utc: startUtc.toISOString(),
      period_end_utc: endUtc.toISOString(),
    },
  };
}

function validatePeriodKey(periodKey: string): void {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) {
    throw new HttpError(400, 'invalid_period_key', 'periodKey must be YYYY-MM');
  }

  const month = Number(periodKey.slice(5, 7));
  if (month < 1 || month > 12) {
    throw new HttpError(400, 'invalid_period_key', 'periodKey month must be between 01 and 12');
  }
}

function resolveRepoRoot(): string {
  let current = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (existsSync(path.join(current, 'package.json')) && existsSync(path.join(current, 'apps/api'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return process.cwd();
}

function getOutputPath(rootOrOutputRoot: string, periodKey: string, rootIsOutputRoot = false): string {
  const outputRoot = rootIsOutputRoot ? rootOrOutputRoot : path.join(rootOrOutputRoot, 'marketing', 'agent-inputs');
  return path.join(outputRoot, periodKey, 'cmo-context.json');
}

function resolveStrategyMemoryPath(repoRoot: string): string {
  const requestedPath = path.join(repoRoot, 'Docs/marketing/strategy-memory.md');
  if (existsSync(requestedPath)) {
    return requestedPath;
  }

  return path.join(repoRoot, 'Docs/marketing/STRATEGY_MEMORY.md');
}

async function readStrategyMemory(strategyPath: string, repoRoot: string): Promise<MarketingStrategyMemoryContext> {
  const markdown = await readFile(strategyPath, 'utf8');
  const sections = parseMarkdownSections(markdown);
  const campaignDefaults = parseCampaignDefaults(sections.get('campaign defaults') ?? []);
  const knownGaps = sectionItems(sections, 'Known Gaps');
  const nextRunInstructions = sectionItems(sections, 'Next Run Instructions');
  const firstStrategyProposal = sectionItems(sections, 'First 20-Post Strategy Proposal');

  return {
    document_path: path.relative(repoRoot, strategyPath),
    current_objective: firstSectionText(sections, 'Current Objective'),
    current_positioning: sectionItems(sections, 'Current Positioning'),
    historical_learnings: sectionItemsByPrefix(sections, 'Baseline:'),
    previous_experiments: firstStrategyProposal,
    previous_decisions: nextRunInstructions,
    content_rules: [
      ...sectionItems(sections, 'Data Interpretation Rules'),
      ...firstStrategyProposal,
      ...nextRunInstructions,
    ],
    known_risks: knownGaps,
    open_questions: knownGaps,
    campaign_defaults: campaignDefaults,
  };
}

export function parseMarkdownSections(markdown: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let currentSection = '';
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentSection) {
      return;
    }
    sections.set(normalizeSectionName(currentSection), normalizeMarkdownContent(currentLines));
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentSection = heading[1].trim();
      currentLines = [];
      continue;
    }

    if (currentSection) {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}

function normalizeSectionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeMarkdownContent(lines: string[]): string[] {
  const items: string[] = [];
  const paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    items.push(paragraph.join(' ').trim());
    paragraph.length = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      items.push((bullet?.[1] ?? numbered?.[1] ?? '').trim());
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return items.filter(Boolean);
}

function sectionItems(sections: Map<string, string[]>, name: string): string[] {
  return sections.get(normalizeSectionName(name)) ?? [];
}

function sectionItemsByPrefix(sections: Map<string, string[]>, prefix: string): string[] {
  const normalizedPrefix = normalizeSectionName(prefix);
  return Array.from(sections.entries())
    .filter(([name]) => name.startsWith(normalizedPrefix))
    .flatMap(([, items]) => items);
}

function firstSectionText(sections: Map<string, string[]>, name: string): string {
  return sectionItems(sections, name)[0] ?? '';
}

function parseCampaignDefaults(items: string[]): MarketingStrategyMemoryContext['campaign_defaults'] {
  const defaults: MarketingStrategyMemoryContext['campaign_defaults'] = {
    default_platform: '',
    default_language: '',
    default_monthly_post_count: null,
    current_tested_formats: [],
    current_mvp_campaign_code: '',
  };

  for (const item of items) {
    const [rawKey, ...rest] = item.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim().replace(/^`|`$/g, '');
    if (key === 'default platform') {
      defaults.default_platform = value;
    } else if (key === 'default language') {
      defaults.default_language = value;
    } else if (key === 'default monthly post count') {
      const parsed = Number.parseInt(value, 10);
      defaults.default_monthly_post_count = Number.isFinite(parsed) ? parsed : null;
    } else if (key === 'current tested format') {
      defaults.current_tested_formats = value.split('+').map((part) => part.trim()).filter(Boolean);
    } else if (key === 'current mvp campaign code') {
      defaults.current_mvp_campaign_code = value;
    }
  }

  return defaults;
}

function normalizeCampaigns(campaigns: MarketingCampaignWithMetricsPayload[]): MarketingCmoCampaignContext[] {
  return campaigns.map((campaign) => ({
    campaign_code: campaign.campaignCode,
    period_key: campaign.periodKey,
    objective: campaign.objective,
    status: campaign.status,
    strategy_summary: campaign.strategySummary,
    posts: campaign.posts.map((post) => ({
      post_code: post.postCode,
      platform: post.platform,
      format: post.format,
      status: post.status,
      hook: post.hook,
      caption: post.caption,
      hypothesis: post.hypothesis,
      target_metric: post.targetMetric,
      tracking_url: post.trackingUrl,
      assets: normalizePostAssets(campaign.campaignCode, post.postCode, post.assetUrls),
      agent_notes: post.agentNotes,
      decision_note: post.decisionNote,
      rejection_reason: post.rejectionReason,
      timestamps: {
        scheduled_at: post.scheduledAt,
        approved_at: post.approvedAt,
        rejected_at: post.rejectedAt,
        published_at: post.publishedAt,
        measured_at: post.measuredAt,
      },
      metrics: post.metrics.map((metric) => ({
        source: metric.source,
        period_start: metric.periodStart,
        period_end: metric.periodEnd,
        impressions: metric.impressions,
        reach: metric.reach,
        clicks: metric.clicks,
        sessions: metric.sessions,
        landing_cta_clicks: metric.landingCtaClicks,
        signups: metric.signups,
        dashboard_views: metric.dashboardViews,
        leads: metric.leads,
        notes: metric.notes,
        imported_at: metric.importedAt,
      })),
    })),
    results: campaign.posts.flatMap((post) =>
      post.metrics.map((metric) => ({
        post_code: post.postCode,
        source: metric.source,
        period_start: metric.periodStart,
        period_end: metric.periodEnd,
        clicks: metric.clicks,
        sessions: metric.sessions,
        signups: metric.signups,
        dashboard_views: metric.dashboardViews,
        notes: metric.notes,
      })),
    ),
    human_decisions: campaign.posts.map((post) => post.decisionNote).filter(Boolean),
    rejection_reasons: campaign.posts.map((post) => post.rejectionReason).filter(Boolean),
  }));
}

function normalizePostAssets(
  campaignCode: string,
  postCode: string,
  assets: { file: string; title: string; type?: string; url?: string }[],
): MarketingCmoAsset[] {
  return assets.map((asset, index) => ({
    asset_id: stableId(['campaign', campaignCode, postCode, asset.file || String(index)]),
    source: 'campaign_post_asset',
    kind: asset.type ?? classifyAssetKind(asset.file),
    label: asset.title || asset.file,
    ...(asset.url ? { url: asset.url } : {}),
    ...(asset.file ? { file_path: asset.file } : {}),
    campaign_code: campaignCode,
    post_code: postCode,
  }));
}

async function buildAvailableAssets(
  repoRoot: string,
  campaigns: MarketingCampaignWithMetricsPayload[],
  sourceManifest: MarketingCmoSourceManifestEntry[],
): Promise<MarketingCmoAvailableAssets> {
  const campaignAssets = campaigns.flatMap((campaign) =>
    [
      ...campaign.posts.flatMap((post) => normalizePostAssets(campaign.campaignCode, post.postCode, post.assetUrls)),
      ...normalizeCampaignSourceContextAssets(campaign),
    ],
  );
  const repoAssets = await listRepoMarketingAssets(repoRoot);
  sourceManifest.push({
    source_type: 'asset_manifest',
    source_path_or_id: 'Docs/marketing; apps/web/public/marketing; assest visuales',
    captured_at: repoAssets.capturedAt,
    checksum: checksumJson(repoAssets.assets.map((asset) => asset.file_path ?? asset.url ?? asset.asset_id).sort()),
  });

  const allAssets = stableUniqueAssets([...campaignAssets, ...repoAssets.assets]);
  const contentAssets = allAssets.filter((asset) => isContentAssetKind(asset.kind));

  return {
    product_screenshots: contentAssets.filter((asset) => asset.kind === 'product_screenshot'),
    brand_assets: contentAssets.filter((asset) => asset.kind === 'brand_asset'),
    reusable_templates: contentAssets.filter((asset) => asset.kind === 'reusable_template'),
    existing_visuals: contentAssets.filter((asset) => asset.kind === 'existing_visual'),
    missing_assets: [],
  };
}

function normalizeCampaignSourceContextAssets(campaign: MarketingCampaignWithMetricsPayload): MarketingCmoAsset[] {
  return Object.entries(campaign.sourceContext)
    .filter(([key, value]) => /url/i.test(key) && typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => {
      const url = String(value);
      return {
        asset_id: stableId(['campaign-source', campaign.campaignCode, key, url]),
        source: url.includes('drive.google.com') ? 'drive_url' : 'campaign_source_url',
        kind: classifyAssetKind(`${key} ${url}`),
        label: key,
        url,
        campaign_code: campaign.campaignCode,
      };
    });
}

async function listRepoMarketingAssets(repoRoot: string): Promise<{ capturedAt: string; assets: MarketingCmoAsset[] }> {
  const roots = ['Docs/marketing', 'apps/web/public/marketing', 'assest visuales'];
  const files: string[] = [];
  let latestMtime = new Date(MANUAL_CONFIG_CAPTURED_AT);

  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!existsSync(absoluteRoot)) {
      continue;
    }

    const found = await walkFiles(absoluteRoot);
    for (const file of found) {
      if (!/\.(png|jpe?g|webp|gif|html|csv|json|md)$/i.test(file)) {
        continue;
      }

      const fileStat = await stat(file);
      latestMtime = fileStat.mtime > latestMtime ? fileStat.mtime : latestMtime;
      files.push(path.relative(repoRoot, file));
    }
  }

  files.sort();

  return {
    capturedAt: latestMtime.toISOString(),
    assets: files.map((file) => ({
      asset_id: stableId(['repo', file]),
      source: 'repository_asset',
      kind: classifyAssetKind(file),
      label: path.basename(file),
      file_path: file,
    })),
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await import('node:fs/promises').then((fs) => fs.readdir(root, { withFileTypes: true }));
  const result: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile()) {
      result.push(absolutePath);
    }
  }

  return result;
}

function classifyAssetKind(fileOrType: string): string {
  const value = fileOrType.toLowerCase();
  if (value.endsWith('.md')) {
    return 'reference_document';
  }
  if (value.endsWith('.json') || value.endsWith('.csv')) {
    return 'data_file';
  }
  if (value.includes('template') || value.endsWith('.html')) {
    return 'reusable_template';
  }
  if (value.includes('asset') && value.includes('drive.google.com')) {
    return 'existing_visual';
  }
  if (/^https?:/.test(value) && !/\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value)) {
    return 'reference_document';
  }
  if (value.includes('logo') || value.includes('brand')) {
    return 'brand_asset';
  }
  if (value.includes('dashboard') || value.includes('task') || value.includes('dquest') || value.includes('mobile')) {
    return 'product_screenshot';
  }
  return 'existing_visual';
}

function isContentAssetKind(kind: string): boolean {
  return ['product_screenshot', 'brand_asset', 'reusable_template', 'existing_visual'].includes(kind);
}

function stableUniqueAssets(assets: MarketingCmoAsset[]): MarketingCmoAsset[] {
  const byId = new Map<string, MarketingCmoAsset>();
  for (const asset of assets) {
    byId.set(asset.asset_id, asset);
  }
  return Array.from(byId.values()).sort((a, b) => a.asset_id.localeCompare(b.asset_id));
}

function buildBusinessContext(
  strategyMemory: MarketingStrategyMemoryContext,
  campaigns: MarketingCampaignWithMetricsPayload[],
  constraints: MarketingOperationalConstraints,
): MarketingCmoContext['business_context'] {
  const latestCampaign = campaigns[0];
  const currentObjective = strategyMemory.current_objective || latestCampaign?.objective || '';
  const audience: string[] = [];
  const notes = [
    ...(audience.length === 0 ? ['No explicit audience section found in strategy memory or structured configuration.'] : []),
    ...(strategyMemory.current_objective ? [] : ['No explicit Current Objective section found in strategy memory.']),
  ];

  return {
    current_marketing_objective: currentObjective,
    product_stage: detectProductStage(strategyMemory),
    audience,
    current_priorities: [
      ...strategyMemory.previous_experiments,
      ...strategyMemory.content_rules,
    ],
    constraints: [
      constraints.publishing,
      constraints.public_storage,
      ...constraints.legal_and_brand,
    ],
    known_product_changes: strategyMemory.historical_learnings.filter((item) =>
      /r2|drive|ga4|search console|neon|admin|dashboard|metricool|publishing|asset|csv/i.test(item),
    ),
    notes,
  };
}

function detectProductStage(strategyMemory: MarketingStrategyMemoryContext): string {
  const text = [
    ...strategyMemory.current_positioning,
    ...strategyMemory.historical_learnings,
    strategyMemory.campaign_defaults.current_mvp_campaign_code,
  ].join(' ').toLowerCase();

  if (text.includes('mvp') || text.includes('early product') || text.includes('early version')) {
    return 'early-stage MVP';
  }

  return '';
}

function buildOperationalConstraints(
  campaigns: MarketingCampaignWithMetricsPayload[],
  strategyMemory: MarketingStrategyMemoryContext,
): MarketingOperationalConstraints {
  const platforms = Array.from(new Set([
    strategyMemory.campaign_defaults.default_platform.toLowerCase(),
    ...campaigns.flatMap((campaign) => campaign.posts.map((post) => post.platform)),
  ].filter(Boolean))).sort();
  const configuredFormats = strategyMemory.campaign_defaults.current_tested_formats.length
    ? strategyMemory.campaign_defaults.current_tested_formats
    : ['carousel', 'static', 'reel', 'story', 'thread', 'short_video'];

  return {
    platforms: platforms.length ? platforms : ['instagram'],
    supported_formats: configuredFormats,
    publishing: 'Approved posts are exported to Metricool CSV; this exporter does not publish content.',
    public_storage: 'Public marketing files can be served from R2 or repository public assets; this exporter does not upload binaries.',
    monthly_capacity_posts: strategyMemory.campaign_defaults.default_monthly_post_count ?? DEFAULT_MONTHLY_CAPACITY_POSTS,
    asset_limits: ['Do not download or duplicate binary assets during context export.', 'Use stable asset IDs that trace to campaign, URL, or repository paths.'],
    legal_and_brand: ['Human review is required before publishing.', 'Do not include secrets, service account keys, unnecessary PII, or individual user identifiers.'],
    human_review_required: true,
  };
}

async function buildFileSourceManifest(_sourceType: string, filePath: string): Promise<MarketingCmoSourceManifestEntry> {
  const contents = await readFile(filePath);
  const fileStat = await stat(filePath);
  return {
    source_type: 'repo_file',
    source_path_or_id: filePath,
    captured_at: fileStat.mtime.toISOString(),
    checksum: checksumBuffer(contents),
  };
}

function buildAnalyticsSourceManifest(analytics: { updatedAt: string; syncRunId: string }): MarketingCmoSourceManifestEntry {
  return {
    source_type: 'analytics_sync',
    source_path_or_id: analytics.syncRunId,
    captured_at: analytics.updatedAt,
    checksum: checksumJson({ sync_run_id: analytics.syncRunId, updated_at: analytics.updatedAt }),
  };
}

function buildCampaignSourceManifest(campaigns: MarketingCampaignWithMetricsPayload[]): MarketingCmoSourceManifestEntry {
  const updatedAt = campaigns
    .map((campaign) => campaign.updatedAt)
    .sort()
    .at(-1) ?? MANUAL_CONFIG_CAPTURED_AT;
  return {
    source_type: 'database_snapshot',
    source_path_or_id: `marketing_campaigns_recent_limit_${MAX_CONTEXT_CAMPAIGNS}`,
    captured_at: updatedAt,
    checksum: checksumJson(campaigns.map((campaign) => ({
      campaignCode: campaign.campaignCode,
      updatedAt: campaign.updatedAt,
      posts: campaign.posts.map((post) => ({
        postCode: post.postCode,
        updatedAt: post.updatedAt,
        metrics: post.metrics.map((metric) => metric.importedAt),
      })),
    }))),
  };
}

async function validateCmoContext(context: MarketingCmoContext, schemaPath: string): Promise<void> {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8')) as Record<string, unknown>;
  const ajv = new Ajv2020Module.Ajv2020({ allErrors: true, strict: false });
  ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/);
  ajv.addFormat('date-time', {
    type: 'string',
    validate: (value: string) => !Number.isNaN(Date.parse(value)),
  });
  const validate = ajv.compile(schema);
  const valid = validate(context);

  if (!valid) {
    throw new HttpError(
      500,
      'cmo_context_schema_invalid',
      'Generated CMO context does not validate against cmo-input-v1 schema.',
      formatAjvErrors(validate.errors ?? []),
    );
  }
}

function formatAjvErrors(errors: ErrorObject[]): { path: string; message: string }[] {
  return errors.map((error) => ({
    path: error.instancePath || '/',
    message: error.message ?? 'invalid',
  }));
}

async function writeJsonAtomically(outputPath: string, context: MarketingCmoContext): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const serialized = `${JSON.stringify(context, null, 2)}\n`;
  JSON.parse(serialized);
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(tempPath, serialized, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, outputPath);
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const offset = getTimeZoneOffsetMinutes(new Date(utcGuess), MARKETING_TIMEZONE);
  const adjusted = new Date(utcGuess - offset * 60_000);
  const adjustedOffset = getTimeZoneOffsetMinutes(adjusted, MARKETING_TIMEZONE);
  return new Date(utcGuess - adjustedOffset * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.get('year')),
    Number(values.get('month')) - 1,
    Number(values.get('day')),
    Number(values.get('hour')),
    Number(values.get('minute')),
    Number(values.get('second')),
  );
  return (asUtc - date.getTime()) / 60_000;
}

function checksumBuffer(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function checksumJson(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function stableId(parts: string[]): string {
  return parts
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function scrubSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubSensitiveValues);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      result[key] = '[redacted]';
      continue;
    }
    result[key] = scrubSensitiveValues(item);
  }
  return result;
}

function isSensitiveKey(key: string): boolean {
  return /token|secret|password|api[_-]?key|service[_-]?account|private[_-]?key|email|user[_-]?id|clerk/i.test(key);
}
