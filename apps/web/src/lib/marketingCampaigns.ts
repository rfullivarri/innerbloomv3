import { apiAuthorizedFetch } from './api';

export type MarketingPostStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'measured'
  | 'archived';

export type MarketingAssetRecord = {
  file: string;
  title: string;
  type?: string;
  url?: string;
  previewUrl?: string;
  sourceUrl?: string;
  selected?: boolean;
};

export type MarketingPostRecord = {
  postCode: string;
  platform: string;
  format: string;
  status: MarketingPostStatus;
  hook: string;
  caption: string;
  hypothesis: string;
  targetMetric: string;
  trackingUrl: string;
  assetUrls: MarketingAssetRecord[];
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

export type MarketingCampaignRecord = {
  id: string;
  periodKey: string;
  campaignCode: string;
  title: string;
  objective: string;
  status: string;
  strategySummary: string;
  sourceContext: Record<string, unknown>;
  posts: MarketingPostRecord[];
  updatedAt: string;
};

export type MarketingPostUpdate = Partial<Pick<
  MarketingPostRecord,
  | 'status'
  | 'hook'
  | 'caption'
  | 'hypothesis'
  | 'targetMetric'
  | 'trackingUrl'
  | 'assetUrls'
  | 'agentNotes'
  | 'decisionNote'
  | 'rejectionReason'
  | 'scheduledAt'
>>;

const MAX_PERSISTED_ASSET_URL_LENGTH = 2000;

export async function fetchMarketingCampaigns() {
  const response = await apiAuthorizedFetch('/admin/marketing/campaigns', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Marketing campaigns request failed with HTTP ${response.status}`);
  return response.json() as Promise<{ ok: boolean; campaigns: MarketingCampaignRecord[] }>;
}

export async function updateMarketingCampaignPost(campaignCode: string, postCode: string, payload: MarketingPostUpdate) {
  const response = await apiAuthorizedFetch(
    `/admin/marketing/campaigns/${encodeURIComponent(campaignCode)}/posts/${encodeURIComponent(postCode)}`,
    {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeMarketingPostUpdate(payload)),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Marketing post update failed with HTTP ${response.status}: ${body}`);
  }
  return response.json() as Promise<{ ok: boolean; post: MarketingPostRecord }>;
}

export async function saveMarketingCampaignBulk(
  campaignCode: string,
  updates: Array<{ postCode: string; changes: MarketingPostUpdate }>,
) {
  if (!updates.length) return { ok: true, posts: [] as MarketingPostRecord[] };
  const response = await apiAuthorizedFetch(
    `/admin/marketing/campaigns/${encodeURIComponent(campaignCode)}/posts/bulk-save`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: updates.map((item) => ({
          postCode: item.postCode,
          changes: sanitizeMarketingPostUpdate(item.changes),
        })),
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Marketing campaign bulk save failed with HTTP ${response.status}: ${body}`);
  }
  return response.json() as Promise<{ ok: boolean; posts: MarketingPostRecord[] }>;
}

function sanitizeMarketingPostUpdate(payload: MarketingPostUpdate): MarketingPostUpdate {
  if (!payload.assetUrls) return payload;
  return {
    ...payload,
    assetUrls: payload.assetUrls.map((asset) => ({
      ...asset,
      url: persistableAssetUrl(asset.url),
      previewUrl: persistableAssetUrl(asset.previewUrl),
      sourceUrl: persistableAssetUrl(asset.sourceUrl),
    })),
  };
}

function persistableAssetUrl(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || /^(data|blob):/i.test(normalized) || normalized.length > MAX_PERSISTED_ASSET_URL_LENGTH) return undefined;
  return normalized;
}
