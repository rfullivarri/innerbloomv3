import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db.js';

type SuppliedStory = {
  post_code: string;
  source_drive_file_id: string;
  source_file_name: string;
  visible_copy: { headline: string; cta: string };
  caption: string;
  hypothesis: string;
  target_metric: string;
  tracking_url: string;
  scheduled_at: string;
};

export type SuppliedStoryCampaign = {
  campaign: {
    campaign_code: string;
    title: string;
    period_key?: string;
    objective?: string;
    strategy_summary?: string;
    source_campaign_code: string;
    source_drive_folder_id: string;
    brand_logo_drive_file_id: string;
  };
  stories: SuppliedStory[];
};

const importedCampaignCodes = new Set<string>();

/**
 * Imports campaign JSONs created by the supplied-asset Codex task.  This runs
 * inside the production API so it uses Railway's existing database credentials;
 * it deliberately never uploads an asset to R2 or overwrites Admin edits.
 */
export async function syncSuppliedStoryCampaignsFromRepository(): Promise<void> {
  const directory = await findSuppliedCampaignDirectory();
  if (!directory) return;

  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const campaignPath = path.join(directory, entry, 'campaign.json');
    let campaign: SuppliedStoryCampaign;
    try {
      campaign = await readSuppliedStoryCampaign(campaignPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      console.error('Unable to read supplied marketing campaign configuration', { campaignPath, error });
      continue;
    }

    if (importedCampaignCodes.has(campaign.campaign.campaign_code)) continue;

    try {
      await importSuppliedStoryCampaign(campaign, { preserveExisting: true });
      importedCampaignCodes.add(campaign.campaign.campaign_code);
    } catch (error) {
      // A broken config must not make the complete Admin campaign list unavailable.
      console.error('Unable to sync supplied marketing campaign into Admin', {
        campaignCode: campaign.campaign.campaign_code,
        error,
      });
    }
  }
}

export async function readSuppliedStoryCampaign(campaignPath: string): Promise<SuppliedStoryCampaign> {
  const parsed = JSON.parse(await fs.readFile(campaignPath, 'utf8')) as SuppliedStoryCampaign;
  if (!parsed.campaign?.campaign_code || !parsed.campaign.title || !Array.isArray(parsed.stories) || parsed.stories.length === 0) {
    throw new Error('Invalid supplied Story campaign configuration.');
  }
  return parsed;
}

export async function importSuppliedStoryCampaign(
  data: SuppliedStoryCampaign,
  options: { preserveExisting?: boolean } = {},
): Promise<{ imported: boolean; storyCount: number }> {
  const campaign = data.campaign;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const campaignResult = await client.query<{ marketing_campaign_id: string }>(
      `INSERT INTO marketing_campaigns
        (period_key, campaign_code, title, objective, status, strategy_summary, source_context)
       VALUES ($1, $2, $3, $4, 'needs_review', $5, $6::jsonb)
       ON CONFLICT (campaign_code) ${options.preserveExisting ? 'DO NOTHING' : `DO UPDATE SET
         title = EXCLUDED.title,
         objective = EXCLUDED.objective,
         status = EXCLUDED.status,
         strategy_summary = EXCLUDED.strategy_summary,
         source_context = EXCLUDED.source_context,
         updated_at = now()`}
       RETURNING marketing_campaign_id`,
      [
        campaign.period_key ?? new Date().toISOString().slice(0, 7),
        campaign.campaign_code,
        campaign.title,
        campaign.objective ?? 'Supplied visual-base Story campaign',
        campaign.strategy_summary ?? '',
        JSON.stringify({
          pipeline_kind: 'supplied_asset_campaign',
          source_campaign_code: campaign.source_campaign_code,
          source_drive_folder_id: campaign.source_drive_folder_id,
          brand_logo_drive_file_id: campaign.brand_logo_drive_file_id,
          renderer_version: 'supplied-story-v1',
          storage_status: 'pending_admin_upload',
        }),
      ],
    );

    const campaignId = campaignResult.rows[0]?.marketing_campaign_id;
    if (!campaignId) {
      await client.query('COMMIT');
      return { imported: false, storyCount: 0 };
    }

    for (const story of data.stories) {
      const sourceUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(story.source_drive_file_id)}`;
      await client.query(
        `INSERT INTO marketing_posts
          (marketing_campaign_id, post_code, platform, format, status, hook, caption, hypothesis, target_metric, tracking_url, asset_urls, agent_notes, scheduled_at)
         VALUES ($1, $2, 'instagram', 'story', 'needs_review', $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
        [
          campaignId,
          story.post_code,
          story.visible_copy.headline,
          story.caption,
          story.hypothesis,
          story.target_metric,
          story.tracking_url,
          JSON.stringify([{
            file: story.source_file_name,
            title: story.visible_copy.headline,
            type: 'story',
            url: sourceUrl,
            previewUrl: sourceUrl,
            sourceUrl,
            driveFileId: story.source_drive_file_id,
            selected: true,
          }]),
          `Supplied Drive base. Story copy: ${story.visible_copy.cta}. R2 upload remains blocked until Admin approval.`,
          story.scheduled_at,
        ],
      );
    }

    await client.query('COMMIT');
    console.info('Imported supplied Story campaign into Admin', {
      campaignCode: campaign.campaign_code,
      storyCount: data.stories.length,
    });
    return { imported: true, storyCount: data.stories.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findSuppliedCampaignDirectory(): Promise<string | null> {
  const candidates = [
    path.resolve(process.cwd(), 'marketing', 'supplied-campaigns'),
    path.resolve(process.cwd(), '..', '..', 'marketing', 'supplied-campaigns'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next runtime working-directory layout.
    }
  }

  return null;
}
