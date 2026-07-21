import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, endPool } from '../src/db.js';

type Campaign = {
  period_key: string;
  campaign: { campaign_code: string; title: string; objective: string; status: string; strategy_summary: string };
  posts: Array<Record<string, any>>;
};
type StagingManifest = { assets: Array<{ file: string; source_url: string; preview_url: string; web_view_url: string }> };

const [campaignPath, manifestPath] = process.argv.slice(2);
if (!campaignPath || !manifestPath) {
  throw new Error('Usage: tsx scripts/import-marketing-campaign.ts <campaign.json> <drive-staging-manifest.json>');
}
const campaign = JSON.parse(await fs.readFile(campaignPath, 'utf8')) as Campaign;
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as StagingManifest;
const assetByFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));

try {
  const campaignResult = await pool.query<{ marketing_campaign_id: string }>(
    `INSERT INTO marketing_campaigns (period_key, campaign_code, title, objective, status, strategy_summary, source_context)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     ON CONFLICT (campaign_code) DO UPDATE SET
       period_key=EXCLUDED.period_key,title=EXCLUDED.title,objective=EXCLUDED.objective,status=EXCLUDED.status,
       strategy_summary=EXCLUDED.strategy_summary,source_context=EXCLUDED.source_context,updated_at=now()
     RETURNING marketing_campaign_id`,
    [
      campaign.period_key,
      campaign.campaign.campaign_code,
      campaign.campaign.title,
      campaign.campaign.objective,
      campaign.campaign.status,
      campaign.campaign.strategy_summary,
      JSON.stringify({
        campaignJsonPath: campaignPath,
        driveStagingManifestPath: manifestPath,
        pipeline: {
          creativeDirection: 'complete',
          renderedAt: new Date().toISOString(),
          renderedAssetCount: manifest.assets.length,
          currentStep: 'review',
        },
      }),
    ],
  );
  const campaignId = campaignResult.rows[0].marketing_campaign_id;

  for (const post of campaign.posts) {
    const postAssets = (post.assets ?? []).map((planned: any) => {
      const filename = planned.asset_code ? `${planned.asset_code}.png` : planned.filename;
      const staged = assetByFile.get(filename);
      if (!staged) throw new Error(`Rendered Drive asset missing for ${post.post_code}: ${filename}`);
      return {
        file: filename,
        title: post.visible_copy_plan?.headline ?? post.hook ?? filename,
        type: planned.asset_kind ?? post.format,
        url: staged.source_url,
        previewUrl: staged.preview_url,
        sourceUrl: staged.web_view_url,
        selected: true,
      };
    });
    await pool.query(
      `INSERT INTO marketing_posts (
         marketing_campaign_id,post_code,platform,format,status,hook,caption,hypothesis,target_metric,tracking_url,
         asset_urls,agent_notes,scheduled_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
       ON CONFLICT (marketing_campaign_id,post_code) DO UPDATE SET
         platform=EXCLUDED.platform,format=EXCLUDED.format,status=EXCLUDED.status,hook=EXCLUDED.hook,
         caption=EXCLUDED.caption,hypothesis=EXCLUDED.hypothesis,target_metric=EXCLUDED.target_metric,
         tracking_url=EXCLUDED.tracking_url,asset_urls=EXCLUDED.asset_urls,agent_notes=EXCLUDED.agent_notes,
         scheduled_at=EXCLUDED.scheduled_at,updated_at=now()`,
      [
        campaignId, post.post_code, post.platform ?? 'instagram', post.format ?? 'static', 'needs_review',
        post.hook ?? '', post.caption ?? '', post.hypothesis ?? '', post.primary_metric ?? '',
        post.tracking_url ?? '', JSON.stringify(postAssets),
        `Imported deterministically from ${path.basename(campaignPath)}; visual direction was resolved before rendering.`,
        post.scheduled_at ?? null,
      ],
    );
  }
  console.log(`Imported ${campaign.posts.length} posts into Admin for ${campaign.campaign.campaign_code}.`);
} finally {
  await endPool();
}
