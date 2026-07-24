import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import type { MarketingPostPayload, MarketingPostStatus, MarketingPostUpdateInput } from './marketingCampaignService.js';

export type MarketingCampaignBulkUpdate = {
  postCode: string;
  changes: MarketingPostUpdateInput;
};

export async function updateMarketingCampaignPostsBulk(
  campaignCode: string,
  updates: MarketingCampaignBulkUpdate[],
): Promise<MarketingPostPayload[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const posts: MarketingPostPayload[] = [];
    for (const update of updates) {
      posts.push(await updateOne(client, campaignCode, update.postCode, update.changes));
    }
    await client.query('COMMIT');
    return posts;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateOne(
  client: PoolClient,
  campaignCode: string,
  postCode: string,
  input: MarketingPostUpdateInput,
): Promise<MarketingPostPayload> {
  const existing = await client.query<any>(
    `SELECT mp.*
       FROM marketing_posts mp
       JOIN marketing_campaigns mc ON mc.marketing_campaign_id = mp.marketing_campaign_id
      WHERE mc.campaign_code = $1 AND mp.post_code = $2
      LIMIT 1`,
    [campaignCode, postCode],
  );
  const current = existing.rows[0];
  if (!current) throw new HttpError(404, 'marketing_post_not_found', `Marketing post ${postCode} not found.`);

  const nextStatus = (input.status ?? current.status) as MarketingPostStatus;
  const now = new Date();
  const approvedAt = nextStatus === 'approved' && current.status !== 'approved' ? now : current.approved_at;
  const rejectedAt = nextStatus === 'rejected' && current.status !== 'rejected' ? now : current.rejected_at;

  const result = await client.query<any>(
    `UPDATE marketing_posts
        SET status = $3, hook = $4, caption = $5, hypothesis = $6, target_metric = $7,
            tracking_url = $8, asset_urls = $9::jsonb, agent_notes = $10, decision_note = $11,
            rejection_reason = $12, scheduled_at = $13, approved_at = $14, rejected_at = $15,
            updated_at = now()
      WHERE marketing_post_id = $1 AND post_code = $2
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
  return mapRow(result.rows[0]);
}

function normalizeAssets(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function mapRow(row: any): MarketingPostPayload {
  const iso = (value: unknown) => value ? new Date(value as string | number | Date).toISOString() : null;
  return {
    postCode: row.post_code,
    platform: row.platform,
    format: row.format,
    status: row.status,
    hook: row.hook ?? '',
    caption: row.caption ?? '',
    hypothesis: row.hypothesis ?? '',
    targetMetric: row.target_metric ?? '',
    trackingUrl: row.tracking_url ?? '',
    assetUrls: normalizeAssets(row.asset_urls),
    agentNotes: row.agent_notes ?? '',
    decisionNote: row.decision_note ?? '',
    rejectionReason: row.rejection_reason ?? '',
    scheduledAt: iso(row.scheduled_at),
    approvedAt: iso(row.approved_at),
    rejectedAt: iso(row.rejected_at),
    publishedAt: iso(row.published_at),
    measuredAt: iso(row.measured_at),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}
