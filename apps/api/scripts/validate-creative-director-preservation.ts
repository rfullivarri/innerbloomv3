import { readFile } from 'node:fs/promises';
import process from 'node:process';

const readArg = (name: string): string | null => {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const stable = (value: unknown): string => JSON.stringify(value);

function editorialPost(post: any): Record<string, unknown> {
  return {
    post_code: post.post_code,
    sequence_number: post.sequence_number,
    platform: post.platform,
    format: post.format,
    status: post.status,
    scheduled_at: post.scheduled_at,
    content_pillar: post.content_pillar,
    funnel_stage: post.funnel_stage,
    experiment_code: post.experiment_code,
    audience_tension: post.audience_tension,
    product_truth_anchor: post.product_truth_anchor,
    hook: post.hook,
    caption: post.caption,
    cta: post.cta,
    hypothesis: post.hypothesis,
    primary_metric: post.primary_metric,
    tracking_url: post.tracking_url,
    utm: post.utm,
    visible_copy_plan: post.visible_copy_plan,
    accessibility: post.accessibility,
    carousel: post.carousel,
  };
}

function assetCodes(campaign: any): Set<string> {
  const codes = new Set<string>();
  for (const post of Array.isArray(campaign?.posts) ? campaign.posts : []) {
    for (const asset of Array.isArray(post?.assets) ? post.assets : []) {
      if (typeof asset?.asset_code === 'string') codes.add(asset.asset_code);
    }
    for (const slot of Array.isArray(post?.asset_slots) ? post.asset_slots : []) {
      if (typeof slot?.asset_code === 'string') codes.add(slot.asset_code);
    }
  }
  for (const job of Array.isArray(campaign?.image_jobs) ? campaign.image_jobs : []) {
    if (typeof job?.asset_code === 'string') codes.add(job.asset_code);
  }
  return codes;
}

async function main(): Promise<void> {
  const draftPath = readArg('draft');
  const campaignPath = readArg('campaign');
  const contextPath = readArg('context');
  if (!draftPath || !campaignPath || !contextPath) {
    throw new Error('Usage: tsx apps/api/scripts/validate-creative-director-preservation.ts --draft=<campaign-draft.json> --campaign=<campaign.json> --context=<creative-context.json>');
  }

  const [draft, campaign, context] = await Promise.all(
    [draftPath, campaignPath, contextPath].map(async (path) => JSON.parse(await readFile(path, 'utf8')) as any),
  );

  assert(draft.period_key === campaign.period_key, 'campaign period differs from draft');
  assert(context.period_key === draft.period_key, 'creative context period differs from draft');
  assert(campaign.campaign?.status === 'review', 'campaign must remain review');

  const campaignFields = [
    'campaign_code', 'title', 'objective', 'status', 'strategy_summary', 'language', 'platforms', 'formats',
    'target_post_count', 'publishing_start_date', 'publishing_end_date',
  ];
  for (const field of campaignFields) {
    assert(stable(campaign.campaign?.[field]) === stable(draft.campaign?.[field]), `campaign.${field} differs from draft`);
  }

  assert(Array.isArray(campaign.posts), 'campaign posts are missing');
  assert(campaign.posts.length === draft.posts.length, 'campaign post count differs from draft');
  const campaignPosts = new Map(campaign.posts.map((post: any) => [post.post_code, post]));
  for (const draftPost of draft.posts) {
    const outputPost = campaignPosts.get(draftPost.post_code);
    assert(outputPost, `campaign is missing ${draftPost.post_code}`);
    assert(stable(editorialPost(outputPost)) === stable(editorialPost(draftPost)), `${draftPost.post_code} editorial content differs from draft`);
  }

  const outputAssetCodes = assetCodes(campaign);
  for (const post of draft.posts) {
    for (const slot of post.asset_slots) {
      assert(outputAssetCodes.has(slot.asset_code), `campaign is missing renderer job or asset for ${slot.asset_code}`);
    }
  }

  const registeredAssets = new Set(
    (Array.isArray(context?.current_assets?.assets) ? context.current_assets.assets : [])
      .map((asset: any) => asset?.asset_key)
      .filter((value: unknown): value is string => typeof value === 'string'),
  );
  const selectedKeys: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'selected_asset_keys' && Array.isArray(child)) {
        selectedKeys.push(...child.filter((item): item is string => typeof item === 'string'));
      }
      walk(child);
    }
  };
  walk(campaign);
  assert(selectedKeys.length > 0, 'campaign has no selected_asset_keys');
  for (const key of selectedKeys) assert(registeredAssets.has(key), `campaign selects unregistered asset ${key}`);

  console.log(`Validated Creative Director preservation and registered assets: ${campaignPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown Creative Director preservation error');
  process.exitCode = 1;
});
