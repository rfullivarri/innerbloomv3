import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

export type MarketingPostStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'measured'
  | 'archived';

export type MarketingAssetPayload = {
  file: string;
  title: string;
  type?: string;
  url?: string;
  previewUrl?: string;
  sourceUrl?: string;
  selected?: boolean;
};

export type MarketingPostPayload = {
  postCode: string;
  platform: string;
  format: string;
  status: MarketingPostStatus;
  hook: string;
  caption: string;
  hypothesis: string;
  targetMetric: string;
  trackingUrl: string;
  assetUrls: MarketingAssetPayload[];
  agentNotes: string;
  decisionNote: string;
  rejectionReason: string;
  scheduledAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  publishedAt: string | null;
  measuredAt: string | null;
  updatedAt: string;
};

export type MarketingPostMetricPayload = {
  source: string;
  periodStart: string;
  periodEnd: string;
  impressions: number;
  reach: number;
  clicks: number;
  sessions: number;
  landingCtaClicks: number;
  signups: number;
  dashboardViews: number;
  leads: number;
  notes: string;
  importedAt: string;
};

export type MarketingPostWithMetricsPayload = MarketingPostPayload & {
  metrics: MarketingPostMetricPayload[];
};

export type MarketingCampaignPayload = {
  id: string;
  periodKey: string;
  campaignCode: string;
  title: string;
  objective: string;
  status: string;
  strategySummary: string;
  sourceContext: Record<string, unknown>;
  posts: MarketingPostPayload[];
  updatedAt: string;
};

export type MarketingCampaignWithMetricsPayload = Omit<MarketingCampaignPayload, 'posts'> & {
  posts: MarketingPostWithMetricsPayload[];
};

export type MarketingPostUpdateInput = Partial<{
  status: MarketingPostStatus;
  hook: string;
  caption: string;
  hypothesis: string;
  targetMetric: string;
  trackingUrl: string;
  assetUrls: MarketingAssetPayload[];
  agentNotes: string;
  decisionNote: string;
  rejectionReason: string;
  scheduledAt: string | null;
}>;

const CAMPAIGN_ASSET_BASE_URL =
  'https://raw.githubusercontent.com/rfullivarri/innerbloomv3/main/Docs/marketing/campaigns/2026-06-mvp/assets';

const CAMPAIGN_ASSET_URLS: Record<string, string> = {
  innerbloom_mobile_dailyquest_dark_tasks_selection:
    `${CAMPAIGN_ASSET_BASE_URL}/innerbloom_mobile_dailyquest_dark_tasks_selection.png`,
  innerbloom_mobile_dailyquest_dark_tasks_selection_png:
    `${CAMPAIGN_ASSET_BASE_URL}/innerbloom_mobile_dailyquest_dark_tasks_selection.png`,
};

const DEFAULT_CAMPAIGN = {
  periodKey: '2026-06',
  campaignCode: 'ib20_mvp',
  title: 'Innerbloom 2.0 Marketing MVP - English Test',
  objective: 'new_users',
  status: 'review',
  strategySummary: 'Validate the first acquisition loop with two simple Instagram posts before scaling to a monthly system.',
  sourceContext: {
    primaryUrl: 'https://innerbloomjourney.org/',
    driveRootUrl: 'https://drive.google.com/drive/folders/1OMs5zzPQcx9Db9RjpA7J-xL5h1b5V9cZ',
    strategyMemoryUrl: 'https://drive.google.com/file/d/1FGQPOJ1Gp0A7--yNbPDMKhgdOP89Gres/view?usp=drivesdk',
    assetsFolderUrl: 'https://drive.google.com/drive/folders/1FplCAOvdgLA9p73fA7-piQH16d0nSuEg',
    campaignsFolderUrl: 'https://drive.google.com/drive/folders/1S3J3aFgtd1np7mjBKGBpN1w5xuyuGyuH',
  },
  posts: [
    {
      postCode: 'post_001',
      platform: 'instagram',
      format: 'carousel',
      status: 'needs_review' as MarketingPostStatus,
      hook: 'Your habits should adapt to your real life.',
      caption:
        'Most habit apps assume every day is the same. Then a busy week hits, your streak breaks, and the whole plan starts feeling useless. Innerbloom is built around adaptive rhythm: lower the intensity when life gets heavy, keep visible progress, recalibrate instead of starting over, and build a Journey that can survive real weeks.',
      hypothesis: 'People who have failed with streak-based apps will respond to adaptive rhythm and real weeks.',
      targetMetric: 'page_view -> landing_cta_clicked -> auth_started -> auth_completed -> dashboard_view',
      trackingUrl:
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
      scheduledAt: '2026-06-30T19:30:00+02:00',
      assetUrls: [
        { file: 'post-001-carousel-01.png', title: 'Your habits should adapt to your real life.', type: 'image', url: `${CAMPAIGN_ASSET_BASE_URL}/post-001-carousel-01.png`, selected: true },
        { file: 'post-001-carousel-02.png', title: 'Most habit apps assume every day is the same.', type: 'split', url: `${CAMPAIGN_ASSET_BASE_URL}/post-001-carousel-02.png`, selected: true },
        { file: 'post-001-carousel-03.png', title: 'Lower the intensity. Keep the direction.', type: 'image', url: `${CAMPAIGN_ASSET_BASE_URL}/post-001-carousel-03.png`, selected: true },
        { file: 'post-001-carousel-04.png', title: 'Build a Journey that can survive real weeks.', type: 'brand', url: `${CAMPAIGN_ASSET_BASE_URL}/post-001-carousel-04.png`, selected: true },
      ],
    },
    {
      postCode: 'post_002',
      platform: 'instagram',
      format: 'static',
      status: 'needs_review' as MarketingPostStatus,
      hook: 'If your plan only works on perfect days, it is not a plan.',
      caption:
        'Most people do not fail habits because they are lazy. They fail because the system expects the same output from them every day, even when their energy, stress, sleep, and schedule change. Innerbloom is an adaptive habit app. It helps you keep direction without forcing the same rhythm all the time.',
      hypothesis: 'A direct anti-perfect-days message will perform better for people tired of rigid productivity systems.',
      targetMetric: 'page_view, scroll depth, landing_cta_clicked, and dashboard_view',
      trackingUrl:
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002',
      scheduledAt: '2026-07-02T22:30:00+02:00',
      assetUrls: [
        { file: 'post-002-static-pain-proposal.png', title: 'If your plan only works on perfect days, it is not a plan.', type: 'static', url: `${CAMPAIGN_ASSET_BASE_URL}/post-002-static-pain-proposal.png`, selected: true },
      ],
    },
    {
      postCode: 'post_003',
      platform: 'instagram',
      format: 'static',
      status: 'needs_review' as MarketingPostStatus,
      hook: 'A daily quest should fit the day you actually have.',
      caption:
        'Innerbloom turns daily habit work into a small adaptive quest. Pick what fits your energy, keep the direction visible, and avoid throwing away progress when the day gets messy.',
      hypothesis: 'A concrete Daily Quest product screenshot will make the adaptive habit promise easier to understand than abstract habit advice.',
      targetMetric: 'page_view -> landing_cta_clicked -> auth_started -> dashboard_view',
      trackingUrl:
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_003&ib_post=003',
      scheduledAt: '2026-07-04T19:30:00+02:00',
      assetUrls: [
        {
          file: 'innerbloom_mobile_dailyquest_dark_tasks_selection.png',
          title: 'Daily Quest task selection screen',
          type: 'static',
          url: CAMPAIGN_ASSET_URLS.innerbloom_mobile_dailyquest_dark_tasks_selection,
          previewUrl: CAMPAIGN_ASSET_URLS.innerbloom_mobile_dailyquest_dark_tasks_selection,
          sourceUrl: 'https://drive.google.com/file/d/1gCF5MqvQduPvc6s4t5FJg6WszFgjNSSA/view?usp=drivesdk',
          selected: true,
        },
      ],
    },
  ],
};

export async function listMarketingCampaigns(): Promise<MarketingCampaignPayload[]> {
  await ensureDefaultCampaign();

  const campaigns = await pool.query<CampaignRow>(
    `SELECT marketing_campaign_id, period_key, campaign_code, title, objective, status, strategy_summary,
            source_context, updated_at
       FROM marketing_campaigns
      ORDER BY period_key DESC, created_at DESC`,
  );

  const posts = await pool.query<PostRow>(
    `SELECT mp.*
       FROM marketing_posts mp
       JOIN marketing_campaigns mc ON mc.marketing_campaign_id = mp.marketing_campaign_id
      ORDER BY mc.period_key DESC, mp.scheduled_at NULLS LAST, mp.post_code`,
  );

  const postsByCampaign = new Map<string, MarketingPostPayload[]>();
  for (const row of posts.rows) {
    const items = postsByCampaign.get(row.marketing_campaign_id) ?? [];
    items.push(mapPostRow(row));
    postsByCampaign.set(row.marketing_campaign_id, items);
  }

  return campaigns.rows.map((row) => ({
    id: row.marketing_campaign_id,
    periodKey: row.period_key,
    campaignCode: row.campaign_code,
    title: row.title,
    objective: row.objective,
    status: row.status,
    strategySummary: row.strategy_summary,
    sourceContext: normalizeRecord(row.source_context),
    posts: postsByCampaign.get(row.marketing_campaign_id) ?? [],
    updatedAt: toIso(row.updated_at),
  }));
}

export async function listRecentMarketingCampaignsForContext(limit = 12): Promise<MarketingCampaignWithMetricsPayload[]> {
  const campaigns = (await listMarketingCampaigns()).slice(0, limit);
  const postCodes = campaigns.flatMap((campaign) =>
    campaign.posts.map((post) => ({ campaignCode: campaign.campaignCode, postCode: post.postCode })),
  );

  if (postCodes.length === 0) {
    return campaigns.map((campaign) => ({ ...campaign, posts: [] }));
  }

  const metrics = await pool.query<PostMetricRow>(
    `SELECT mc.campaign_code, mp.post_code, m.source, m.period_start, m.period_end,
            m.impressions, m.reach, m.clicks, m.sessions, m.landing_cta_clicks,
            m.signups, m.dashboard_views, m.leads, m.notes, m.imported_at
       FROM marketing_post_metrics m
       JOIN marketing_posts mp ON mp.marketing_post_id = m.marketing_post_id
       JOIN marketing_campaigns mc ON mc.marketing_campaign_id = mp.marketing_campaign_id
      WHERE mc.campaign_code = ANY($1::text[])
      ORDER BY mc.period_key DESC, mp.post_code, m.period_start DESC, m.source`,
    [Array.from(new Set(postCodes.map((item) => item.campaignCode)))],
  );

  const metricsByPost = new Map<string, MarketingPostMetricPayload[]>();
  for (const row of metrics.rows) {
    const key = `${row.campaign_code}:${row.post_code}`;
    const items = metricsByPost.get(key) ?? [];
    items.push(mapPostMetricRow(row));
    metricsByPost.set(key, items);
  }

  return campaigns.map((campaign) => ({
    ...campaign,
    posts: campaign.posts.map((post) => ({
      ...post,
      metrics: metricsByPost.get(`${campaign.campaignCode}:${post.postCode}`) ?? [],
    })),
  }));
}

export async function updateMarketingPost(
  campaignCode: string,
  postCode: string,
  input: MarketingPostUpdateInput,
): Promise<MarketingPostPayload> {
  await ensureDefaultCampaign();

  const existing = await pool.query<PostRow>(
    `SELECT mp.*
       FROM marketing_posts mp
       JOIN marketing_campaigns mc ON mc.marketing_campaign_id = mp.marketing_campaign_id
      WHERE mc.campaign_code = $1
        AND mp.post_code = $2
      LIMIT 1`,
    [campaignCode, postCode],
  );

  const current = existing.rows[0];
  if (!current) {
    throw new HttpError(404, 'marketing_post_not_found', 'Marketing post not found.');
  }

  const nextStatus = input.status ?? current.status;
  const now = new Date();
  const approvedAt = nextStatus === 'approved' && current.status !== 'approved'
    ? now
    : current.approved_at;
  const rejectedAt = nextStatus === 'rejected' && current.status !== 'rejected'
    ? now
    : current.rejected_at;

  const result = await pool.query<PostRow>(
    `UPDATE marketing_posts
        SET status = $3,
            hook = $4,
            caption = $5,
            hypothesis = $6,
            target_metric = $7,
            tracking_url = $8,
            asset_urls = $9::jsonb,
            agent_notes = $10,
            decision_note = $11,
            rejection_reason = $12,
            scheduled_at = $13,
            approved_at = $14,
            rejected_at = $15,
            updated_at = now()
      WHERE marketing_post_id = $1
        AND post_code = $2
      RETURNING *`,
    [
      current.marketing_post_id,
      postCode,
      nextStatus,
      input.hook ?? current.hook,
      input.caption ?? current.caption,
      input.hypothesis ?? current.hypothesis,
      input.targetMetric ?? current.target_metric,
      input.trackingUrl ?? current.tracking_url,
      JSON.stringify(input.assetUrls ?? normalizeAssets(current.asset_urls)),
      input.agentNotes ?? current.agent_notes,
      input.decisionNote ?? current.decision_note,
      input.rejectionReason ?? current.rejection_reason,
      input.scheduledAt === undefined ? current.scheduled_at : input.scheduledAt,
      approvedAt,
      rejectedAt,
    ],
  );

  return mapPostRow(result.rows[0]);
}

async function ensureDefaultCampaign() {
  const result = await pool.query<{ marketing_campaign_id: string }>(
    `INSERT INTO marketing_campaigns (period_key, campaign_code, title, objective, status, strategy_summary, source_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (campaign_code) DO UPDATE
       SET title = EXCLUDED.title,
           strategy_summary = CASE
             WHEN marketing_campaigns.strategy_summary = '' THEN EXCLUDED.strategy_summary
             ELSE marketing_campaigns.strategy_summary
           END,
           source_context = marketing_campaigns.source_context || EXCLUDED.source_context,
           updated_at = now()
     RETURNING marketing_campaign_id`,
    [
      DEFAULT_CAMPAIGN.periodKey,
      DEFAULT_CAMPAIGN.campaignCode,
      DEFAULT_CAMPAIGN.title,
      DEFAULT_CAMPAIGN.objective,
      DEFAULT_CAMPAIGN.status,
      DEFAULT_CAMPAIGN.strategySummary,
      JSON.stringify(DEFAULT_CAMPAIGN.sourceContext),
    ],
  );

  const campaignId = result.rows[0].marketing_campaign_id;

  for (const post of DEFAULT_CAMPAIGN.posts) {
    await pool.query(
      `INSERT INTO marketing_posts (
         marketing_campaign_id, post_code, platform, format, status, hook, caption, hypothesis,
         target_metric, tracking_url, asset_urls, scheduled_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       ON CONFLICT (marketing_campaign_id, post_code) DO NOTHING`,
      [
        campaignId,
        post.postCode,
        post.platform,
        post.format,
        post.status,
        post.hook,
        post.caption,
        post.hypothesis,
        post.targetMetric,
        post.trackingUrl,
        JSON.stringify(post.assetUrls),
        post.scheduledAt,
      ],
    );
  }
}

type CampaignRow = {
  marketing_campaign_id: string;
  period_key: string;
  campaign_code: string;
  title: string;
  objective: string;
  status: string;
  strategy_summary: string;
  source_context: unknown;
  updated_at: string | Date;
};

type PostRow = {
  marketing_post_id: string;
  marketing_campaign_id: string;
  post_code: string;
  platform: string;
  format: string;
  status: MarketingPostStatus;
  hook: string;
  caption: string;
  hypothesis: string;
  target_metric: string;
  tracking_url: string;
  asset_urls: unknown;
  agent_notes: string;
  decision_note: string;
  rejection_reason: string;
  scheduled_at: string | Date | null;
  approved_at: string | Date | null;
  rejected_at: string | Date | null;
  published_at: string | Date | null;
  measured_at: string | Date | null;
  updated_at: string | Date;
};

type PostMetricRow = {
  campaign_code: string;
  post_code: string;
  source: string;
  period_start: string | Date;
  period_end: string | Date;
  impressions: number;
  reach: number;
  clicks: number;
  sessions: number;
  landing_cta_clicks: number;
  signups: number;
  dashboard_views: number;
  leads: number;
  notes: string;
  imported_at: string | Date;
};

function mapPostRow(row: PostRow): MarketingPostPayload {
  return {
    postCode: row.post_code,
    platform: row.platform,
    format: row.format,
    status: row.status,
    hook: row.hook,
    caption: row.caption,
    hypothesis: row.hypothesis,
    targetMetric: row.target_metric,
    trackingUrl: row.tracking_url,
    assetUrls: normalizeAssets(row.asset_urls),
    agentNotes: row.agent_notes,
    decisionNote: row.decision_note,
    rejectionReason: row.rejection_reason,
    scheduledAt: toIsoOrNull(row.scheduled_at),
    approvedAt: toIsoOrNull(row.approved_at),
    rejectedAt: toIsoOrNull(row.rejected_at),
    publishedAt: toIsoOrNull(row.published_at),
    measuredAt: toIsoOrNull(row.measured_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapPostMetricRow(row: PostMetricRow): MarketingPostMetricPayload {
  return {
    source: row.source,
    periodStart: toDateOnly(row.period_start),
    periodEnd: toDateOnly(row.period_end),
    impressions: Number(row.impressions),
    reach: Number(row.reach),
    clicks: Number(row.clicks),
    sessions: Number(row.sessions),
    landingCtaClicks: Number(row.landing_cta_clicks),
    signups: Number(row.signups),
    dashboardViews: Number(row.dashboard_views),
    leads: Number(row.leads),
    notes: row.notes,
    importedAt: toIso(row.imported_at),
  };
}

function normalizeAssets(value: unknown): MarketingAssetPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((asset): asset is Record<string, unknown> => Boolean(asset) && typeof asset === 'object')
    .map((asset) => {
      const file = String(asset.file ?? '');

      return {
        file,
        title: String(asset.title ?? asset.file ?? ''),
        type: typeof asset.type === 'string' ? asset.type : undefined,
        url: resolveMarketingAssetUrl(file, typeof asset.url === 'string' ? asset.url : undefined),
        previewUrl: resolveMarketingAssetPreviewUrl(
          file,
          typeof asset.previewUrl === 'string' ? asset.previewUrl : undefined,
          typeof asset.url === 'string' ? asset.url : undefined,
          typeof asset.sourceUrl === 'string' ? asset.sourceUrl : undefined,
        ),
        sourceUrl: typeof asset.sourceUrl === 'string' ? asset.sourceUrl : undefined,
        selected: typeof asset.selected === 'boolean' ? asset.selected : true,
      };
    })
    .filter((asset) => asset.file);
}

function resolveMarketingAssetPreviewUrl(
  file: string,
  previewUrl: string | undefined,
  url: string | undefined,
  sourceUrl: string | undefined,
) {
  if (previewUrl?.trim()) {
    return previewUrl.trim();
  }

  const sourceDriveId = extractDriveFileId(String(sourceUrl ?? ''));
  if (sourceDriveId) {
    return `https://drive.google.com/thumbnail?id=${sourceDriveId}&sz=w1200`;
  }

  return resolveMarketingAssetUrl(file, url);
}

function resolveMarketingAssetUrl(file: string, url: string | undefined) {
  const trimmedUrl = String(url ?? '').trim();
  const driveId = extractDriveFileId(trimmedUrl);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
  }

  if (trimmedUrl) {
    return trimmedUrl;
  }

  if (/^post-\d{3}-.+\.png$/i.test(file)) {
    return `${CAMPAIGN_ASSET_BASE_URL}/${encodeURIComponent(file)}`;
  }

  const campaignAssetUrl = CAMPAIGN_ASSET_URLS[file.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')];
  return campaignAssetUrl || undefined;
}

function extractDriveFileId(url: string) {
  if (!url.includes('drive.google.com')) {
    return null;
  }

  return url.match(/\/d\/([^/]+)/)?.[1] ?? url.match(/[?&]id=([^&]+)/)?.[1] ?? null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: string | Date | null): string | null {
  return value ? toIso(value) : null;
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}
