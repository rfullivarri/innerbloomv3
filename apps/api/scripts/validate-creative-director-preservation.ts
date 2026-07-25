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
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

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
  assert(campaign.agent === 'innerbloom_creative_director', 'campaign agent must be innerbloom_creative_director');
  assert(campaign.campaign?.status === 'review', 'campaign must remain review');

  const campaignFields = [
    'campaign_code', 'title', 'objective', 'status', 'strategy_summary', 'language', 'platforms', 'formats',
    'target_post_count', 'timezone', 'publishing_start_date', 'publishing_end_date',
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

  const jobs = campaign?.image_generation?.jobs;
  assert(Array.isArray(jobs) && jobs.length > 0, 'campaign.image_generation.jobs must be a non-empty array');
  const draftSlots = draft.posts.flatMap((post: any) => post.asset_slots.map((slot: any) => ({ ...slot, owner_format: post.format })));
  assert(jobs.length === draftSlots.length, `campaign must contain exactly one image_generation job per asset slot; expected ${draftSlots.length}, found ${jobs.length}`);

  const jobsByAssetCode = new Map<string, any>();
  for (const job of jobs) {
    assert(typeof job.asset_code === 'string' && job.asset_code.length > 0, 'renderer job is missing asset_code');
    assert(!jobsByAssetCode.has(job.asset_code), `duplicate renderer job for ${job.asset_code}`);
    jobsByAssetCode.set(job.asset_code, job);
  }

  const registeredAssetMap = new Map<string, any>(
    (Array.isArray(context?.current_assets?.assets) ? context.current_assets.assets : [])
      .filter((asset: any) => typeof asset?.asset_key === 'string')
      .map((asset: any) => [asset.asset_key, asset]),
  );
  const rendererLayouts = new Set(
    (Array.isArray(context?.renderer_capabilities?.layouts) ? context.renderer_capabilities.layouts : [])
      .map((layout: any) => layout?.renderer_layout)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0),
  );
  assert(registeredAssetMap.size > 0, 'creative context has no registered assets');
  assert(rendererLayouts.size > 0, 'creative context has no renderer_layout values');

  for (const slot of draftSlots) {
    const job = jobsByAssetCode.get(slot.asset_code);
    assert(job, `campaign is missing renderer job for ${slot.asset_code}`);
    assert(job.post_code === slot.post_code, `${slot.asset_code} renderer job owner differs from draft`);
    assert(job.asset_kind === slot.asset_kind, `${slot.asset_code} asset_kind differs from draft`);
    if (slot.slide_number !== undefined) assert(job.slide_number === slot.slide_number, `${slot.asset_code} slide_number differs from draft`);
    assert(job.format === slot.owner_format, `${slot.asset_code} format differs from owning post`);
    assert(job.expected_output?.filename === `${slot.asset_code}.png`, `${slot.asset_code} expected_output.filename must be canonical`);
    assert(job.expected_output?.local_staging_path === `marketing/agent-outputs/${draft.period_key}/generated-assets/${slot.asset_code}.png`, `${slot.asset_code} local_staging_path must be canonical`);
    assert(job.expected_output?.mime_type === 'image/png' && job.expected_output?.width === 1080 && job.expected_output?.height === 1080, `${slot.asset_code} expected output must be 1080x1080 PNG`);

    const direction = job.creative_direction;
    assert(direction && rendererLayouts.has(direction.layout_variant), `${slot.asset_code} layout_variant must equal a declared renderer_layout`);
    const sourceAssets = Array.isArray(job.source_assets) ? job.source_assets : [];
    const sourceKeys = new Set(sourceAssets.map((asset: any) => asset?.asset_key).filter(Boolean));
    assert(sourceKeys.size > 0, `${slot.asset_code} source_assets must be non-empty`);
    for (const source of sourceAssets) {
      const registered = registeredAssetMap.get(source.asset_key);
      assert(registered, `${slot.asset_code} includes unregistered source asset ${source.asset_key}`);
      assert(stable(source) === stable(registered), `${slot.asset_code} source asset ${source.asset_key} metadata differs from registry`);
    }
    const selectedKeys = strings(direction.selected_asset_keys);
    assert(selectedKeys.length > 0, `${slot.asset_code} selected_asset_keys must be non-empty`);
    for (const key of selectedKeys) assert(sourceKeys.has(key), `${slot.asset_code} selects ${key} outside job.source_assets`);
  }

  console.log(`Validated renderer-ready Creative Director output: ${jobs.length} exact jobs preserved from ${draftPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown Creative Director preservation error');
  process.exitCode = 1;
});
