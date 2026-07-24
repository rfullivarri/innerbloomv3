import { readFile } from 'node:fs/promises';
import process from 'node:process';

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    const name = key(value);
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
}

function equalCountMaps(actual: Record<string, number>, expected: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  return [...keys].every((key) => (actual[key] ?? 0) === (expected[key] ?? 0));
}

async function main(): Promise<void> {
  const inputPath = readArg('input');
  if (!inputPath) throw new Error('Usage: tsx apps/api/scripts/validate-marketing-campaign-draft.ts --input=<campaign-draft.json>');

  const draft = JSON.parse(await readFile(inputPath, 'utf8')) as any;
  const { campaign, posts, campaign_execution_summary: summary, asset_requirements: requirements, provenance } = draft;

  assert(Array.isArray(posts) && posts.length > 0, 'posts must be a non-empty array');
  assert(posts.length === campaign.target_post_count, `post count ${posts.length} does not match campaign.target_post_count ${campaign.target_post_count}`);
  assert(summary.post_count === posts.length, 'campaign_execution_summary.post_count does not match posts length');
  assert(draft.period_key === campaign.campaign_code.slice(3, 7) + '-' + campaign.campaign_code.slice(7, 9), 'period_key does not match canonical campaign_code ib_YYYYMM');
  assert(provenance.source_branch === `automation/marketing-cycle-${draft.period_key}`, 'provenance.source_branch does not match period_key');
  assert(provenance.content_context_path === `marketing/agent-inputs/${draft.period_key}/content-context.json`, 'content_context_path does not match period_key');
  assert(provenance.cmo_strategy_path === `marketing/agent-outputs/${draft.period_key}/cmo-strategy.json`, 'cmo_strategy_path does not match period_key');

  const postCodes = posts.map((post: any) => post.post_code);
  assert(new Set(postCodes).size === postCodes.length, 'post_code values must be unique');
  const sequenceNumbers = posts.map((post: any) => post.sequence_number).sort((a: number, b: number) => a - b);
  assert(sequenceNumbers.every((value: number, index: number) => value === index + 1), 'sequence_number values must be contiguous from 1');

  const start = Date.parse(`${campaign.publishing_start_date}T00:00:00Z`);
  const end = Date.parse(`${campaign.publishing_end_date}T23:59:59Z`);
  for (const post of posts) {
    const scheduled = Date.parse(post.scheduled_at);
    assert(scheduled >= start && scheduled <= end, `${post.post_code} scheduled_at is outside the publishing window`);
    assert(post.status === 'needs_review', `${post.post_code} must remain needs_review`);
    assert(post.utm.utm_campaign === campaign.campaign_code, `${post.post_code} utm_campaign must equal campaign_code`);
    assert(post.utm.utm_content === post.post_code, `${post.post_code} utm_content must equal post_code`);
    assert(post.asset_slots.length >= 1, `${post.post_code} must define at least one asset slot`);
    for (const slot of post.asset_slots) {
      assert(slot.post_code === post.post_code, `${slot.asset_code} post_code does not match owner post`);
    }
    if (post.format === 'carousel') {
      assert(post.carousel.slides.length === post.carousel.slide_count, `${post.post_code} carousel slide_count mismatch`);
      assert(post.asset_slots.length === post.carousel.slide_count, `${post.post_code} carousel must have one asset slot per slide`);
      const slideNumbers = post.carousel.slides.map((slide: any) => slide.slide_number).sort((a: number, b: number) => a - b);
      assert(slideNumbers.every((value: number, index: number) => value === index + 1), `${post.post_code} carousel slide numbers must be contiguous`);
      const slotCodes = new Set(post.asset_slots.map((slot: any) => slot.asset_code));
      assert(post.carousel.slides.every((slide: any) => slotCodes.has(slide.asset_code)), `${post.post_code} carousel slide references an unknown asset slot`);
    }
  }

  const trackingUrls = posts.map((post: any) => post.tracking_url).filter(Boolean);
  assert(new Set(trackingUrls).size === trackingUrls.length, 'non-null tracking_url values must be unique');
  const utmContents = posts.map((post: any) => post.utm.utm_content);
  assert(new Set(utmContents).size === utmContents.length, 'utm_content values must be unique');
  const ibPosts = posts.map((post: any) => post.utm.ib_post);
  assert(new Set(ibPosts).size === ibPosts.length, 'ib_post values must be unique');

  const allSlots = posts.flatMap((post: any) => post.asset_slots);
  const assetCodes = allSlots.map((slot: any) => slot.asset_code);
  assert(new Set(assetCodes).size === assetCodes.length, 'asset_code values must be globally unique');
  assert(summary.asset_slot_count === allSlots.length, 'campaign_execution_summary.asset_slot_count does not match asset slots');

  assert(equalCountMaps(summary.format_counts, countBy(posts, (post: any) => post.format)), 'format_counts do not match posts');
  assert(equalCountMaps(summary.pillar_counts, countBy(posts, (post: any) => post.content_pillar)), 'pillar_counts do not match posts');
  assert(equalCountMaps(summary.funnel_counts, countBy(posts, (post: any) => post.funnel_stage)), 'funnel_counts do not match posts');

  const postCodeSet = new Set(postCodes);
  const assetCodeSet = new Set(assetCodes);
  const requirementCodes = requirements.map((requirement: any) => requirement.requirement_code);
  assert(new Set(requirementCodes).size === requirementCodes.length, 'requirement_code values must be unique');
  for (const requirement of requirements) {
    assert(requirement.related_post_codes.every((code: string) => postCodeSet.has(code)), `${requirement.requirement_code} references an unknown post`);
    assert(requirement.related_asset_codes.every((code: string) => assetCodeSet.has(code)), `${requirement.requirement_code} references an unknown asset slot`);
  }

  const forbiddenRendererFields = new Set([
    'layout_variant', 'selected_asset_keys', 'creative_direction', 'art_direction', 'visual_family',
    'device_presentation', 'supporting_treatment', 'generation_order', 'batch_number', 'local_staging_path',
  ]);
  const walk = (value: unknown, path = '$'): void => {
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${path}[${index}]`));
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assert(!forbiddenRendererFields.has(key), `renderer-owned field ${key} is forbidden in campaign draft at ${path}`);
      walk(child, `${path}.${key}`);
    }
  };
  walk(draft);

  assert(Object.values(draft.campaign_quality_report).slice(0, 7).every((value) => value === true), 'all campaign quality booleans must be true for a successful draft');
  console.log(`Validated campaign draft business invariants: ${inputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown campaign draft validation error');
  process.exitCode = 1;
});
