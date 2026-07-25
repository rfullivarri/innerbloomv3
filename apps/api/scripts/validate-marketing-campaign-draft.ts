import { readFile } from 'node:fs/promises';
import process from 'node:process';

const readArg = (name: string): string | null => {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const normalize = (value: string): string => value.toLocaleLowerCase('en').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

function countBy(values: any[], key: string): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    const item = String(value[key]);
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

function equalCounts(actual: Record<string, number>, expected: Record<string, number>): boolean {
  return [...new Set([...Object.keys(actual), ...Object.keys(expected)])]
    .every((key) => (actual[key] ?? 0) === (expected[key] ?? 0));
}

function postCopy(post: any): string {
  const slides = Array.isArray(post.carousel?.slides)
    ? post.carousel.slides.flatMap((slide: any) => [slide.visible_copy?.headline, slide.visible_copy?.supporting_text, slide.product_truth_anchor])
    : [];
  return [post.hook, post.caption, post.product_truth_anchor, post.visible_copy_plan?.headline, post.visible_copy_plan?.supporting_text, ...slides]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

function knownAssetReferences(context: any): Set<string> {
  const refs = new Set<string>();
  for (const collection of Object.values(context?.available_assets ?? {})) {
    if (!Array.isArray(collection)) continue;
    for (const asset of collection) {
      if (!asset || typeof asset !== 'object') continue;
      for (const value of [(asset as any).asset_id, (asset as any).label]) {
        if (typeof value === 'string' && value) refs.add(value);
      }
    }
  }
  return refs;
}

async function main(): Promise<void> {
  const inputPath = readArg('input');
  const contextPath = readArg('content-context');
  const strategyPath = readArg('cmo-strategy');
  if (!inputPath || !contextPath || !strategyPath) {
    throw new Error('Usage: tsx apps/api/scripts/validate-marketing-campaign-draft.ts --input=<campaign-draft.json> --content-context=<content-context.json> --cmo-strategy=<cmo-strategy.json>');
  }

  const [draft, context, strategy] = await Promise.all(
    [inputPath, contextPath, strategyPath].map(async (path) => JSON.parse(await readFile(path, 'utf8')) as any),
  );
  const { campaign, posts, campaign_execution_summary: summary, asset_requirements: requirements, provenance } = draft;

  assert(Array.isArray(posts) && posts.length > 0, 'posts must be a non-empty array');
  assert(posts.length === campaign.target_post_count, 'post count does not match campaign target');
  assert(summary.post_count === posts.length, 'execution summary post_count does not match posts');

  const code = /^ib_(\d{4})(0[1-9]|1[0-2])$/.exec(campaign.campaign_code);
  assert(code, 'campaign.campaign_code must use ib_YYYYMM');
  assert(draft.period_key === `${code[1]}-${code[2]}`, 'period_key does not match campaign_code');
  assert(provenance.source_branch === `automation/marketing-cycle-${draft.period_key}`, 'source_branch does not match period');
  assert(provenance.content_context_path === `marketing/agent-inputs/${draft.period_key}/content-context.json`, 'content_context_path does not match period');
  assert(provenance.cmo_strategy_path === `marketing/agent-outputs/${draft.period_key}/cmo-strategy.json`, 'cmo_strategy_path does not match period');

  assert(context?.period?.period_key === draft.period_key, 'content context period does not match draft');
  assert(strategy?.period === draft.period_key, 'CMO strategy period does not match draft');
  assert(context?.strategy?.cmo_output?.period === strategy.period, 'embedded CMO strategy period differs from original');
  assert(context.period.campaign_code === campaign.campaign_code, 'campaign_code differs from content context');
  assert(context.period.target_post_count === campaign.target_post_count, 'target_post_count differs from content context');
  assert(context.period.timezone === campaign.timezone, 'timezone differs from content context');
  assert(context.period.publishing_start_date === campaign.publishing_start_date, 'publishing start differs from content context');
  assert(context.period.publishing_end_date === campaign.publishing_end_date, 'publishing end differs from content context');
  assert(campaign.objective === strategy?.strategy?.primary_objective, 'campaign objective differs from CMO primary objective');

  const platforms = new Set(strings(context?.operational_constraints?.platforms));
  const formats = new Set(strings(context?.operational_constraints?.formats));
  assert(campaign.platforms.every((value: string) => platforms.has(value)), 'campaign contains unsupported platform');
  assert(campaign.formats.every((value: string) => formats.has(value)), 'campaign contains unsupported format');

  const pillars = new Set<string>();
  for (const pillar of Array.isArray(strategy?.strategy?.content_pillars) ? strategy.strategy.content_pillars : []) {
    if (typeof pillar?.pillar_code === 'string' && pillar.pillar_code) pillars.add(pillar.pillar_code);
  }
  const experiments = new Map<string, any>();
  for (const experiment of Array.isArray(strategy?.experiments) ? strategy.experiments : []) {
    if (typeof experiment?.experiment_code === 'string' && experiment.experiment_code) {
      experiments.set(experiment.experiment_code, experiment);
    }
  }
  assert(pillars.size > 0, 'CMO strategy has no pillar codes');
  assert(experiments.size > 0, 'CMO strategy has no experiment codes');

  const truthRefs = new Set<string>();
  for (const truth of Array.isArray(context?.product_context?.approved_product_truths) ? context.product_context.approved_product_truths : []) {
    if (typeof truth?.truth_ref === 'string' && truth.truth_ref) truthRefs.add(truth.truth_ref);
  }
  assert(truthRefs.size > 0, 'content context has no approved product truth references');
  const assetRefs = knownAssetReferences(context);

  const forbiddenClaims = [
    ...strings(strategy?.messaging_guidelines?.messages_to_avoid),
    ...strings(strategy?.messaging_guidelines?.claims_to_avoid),
  ].map(normalize).filter((value) => value.length >= 4);
  const hardBlocks: Array<[RegExp, string]> = [
    [/\b(guaranteed?|guarantees?|guarantee)\b/i, 'guaranteed outcome'],
    [/\b(cure|cures|cured|treat|treats|treatment|diagnose|diagnosis)\b/i, 'medical claim'],
    [/\bfully automatic\b|\bon autopilot\b/i, 'unsupported automatic capability'],
    [/\bproven results?\b/i, 'unsupported proven result'],
  ];

  const postCodes = posts.map((post: any) => post.post_code);
  assert(new Set(postCodes).size === postCodes.length, 'post_code values must be unique');
  const sequences = posts.map((post: any) => post.sequence_number).sort((a: number, b: number) => a - b);
  assert(sequences.every((value: number, index: number) => value === index + 1), 'sequence numbers must be contiguous');
  const start = Date.parse(`${campaign.publishing_start_date}T00:00:00Z`);
  const end = Date.parse(`${campaign.publishing_end_date}T23:59:59Z`);

  for (const post of posts) {
    const scheduled = Date.parse(post.scheduled_at);
    assert(scheduled >= start && scheduled <= end, `${post.post_code} is outside the publishing window`);
    assert(post.status === 'needs_review', `${post.post_code} must remain needs_review`);
    assert(platforms.has(post.platform), `${post.post_code} uses unsupported platform ${post.platform}`);
    assert(formats.has(post.format), `${post.post_code} uses unsupported format ${post.format}`);
    assert(pillars.has(post.content_pillar), `${post.post_code} references unknown CMO pillar ${post.content_pillar}`);

    const experiment = experiments.get(post.experiment_code);
    assert(experiment, `${post.post_code} references unknown CMO experiment ${post.experiment_code}`);
    const experimentPillars = strings(experiment.content_pillars);
    if (experimentPillars.length > 0) {
      assert(experimentPillars.includes(post.content_pillar), `${post.post_code} maps its experiment to an unsupported pillar`);
    }
    if (typeof experiment.primary_metric === 'string' && experiment.primary_metric.trim()) {
      assert(post.primary_metric === experiment.primary_metric, `${post.post_code} primary metric differs from its experiment`);
    }

    const evidence = strings(post.visual_strategy?.product_evidence);
    assert(evidence.length > 0, `${post.post_code} must cite an approved product truth`);
    for (const ref of evidence) assert(truthRefs.has(ref), `${post.post_code} references unknown product truth ${ref}`);

    const copy = postCopy(post);
    const normalizedCopy = normalize(copy);
    for (const blocked of forbiddenClaims) {
      assert(!normalizedCopy.includes(blocked), `${post.post_code} contains CMO-forbidden message: ${blocked}`);
    }
    for (const [pattern, label] of hardBlocks) assert(!pattern.test(copy), `${post.post_code} contains ${label}`);

    assert(post.utm.utm_campaign === campaign.campaign_code, `${post.post_code} has invalid utm_campaign`);
    assert(post.utm.utm_content === post.post_code, `${post.post_code} has invalid utm_content`);
    assert(Array.isArray(post.asset_slots) && post.asset_slots.length > 0, `${post.post_code} needs at least one asset slot`);
    for (const slot of post.asset_slots) {
      assert(slot.post_code === post.post_code, `${slot.asset_code} has wrong owner post`);
      for (const ref of strings(slot.semantic_source_references)) {
        assert(assetRefs.has(ref), `${slot.asset_code} references unknown source asset ${ref}`);
      }
    }
    if (post.format === 'carousel') {
      assert(post.carousel.slides.length === post.carousel.slide_count, `${post.post_code} carousel slide count mismatch`);
      assert(post.asset_slots.length === post.carousel.slide_count, `${post.post_code} needs one asset slot per slide`);
      const slideNumbers = post.carousel.slides.map((slide: any) => slide.slide_number).sort((a: number, b: number) => a - b);
      assert(slideNumbers.every((value: number, index: number) => value === index + 1), `${post.post_code} slide numbers must be contiguous`);
      const slotCodes = new Set(post.asset_slots.map((slot: any) => slot.asset_code));
      assert(post.carousel.slides.every((slide: any) => slotCodes.has(slide.asset_code)), `${post.post_code} slide references unknown asset slot`);
    }
  }

  const trackingUrls = posts.map((post: any) => post.tracking_url).filter(Boolean);
  assert(new Set(trackingUrls).size === trackingUrls.length, 'tracking URLs must be unique');
  assert(new Set(posts.map((post: any) => post.utm.utm_content)).size === posts.length, 'utm_content values must be unique');
  assert(new Set(posts.map((post: any) => post.utm.ib_post)).size === posts.length, 'ib_post values must be unique');

  const slots = posts.flatMap((post: any) => post.asset_slots);
  const assetCodes = slots.map((slot: any) => slot.asset_code);
  assert(new Set(assetCodes).size === assetCodes.length, 'asset codes must be globally unique');
  assert(summary.asset_slot_count === slots.length, 'asset slot summary does not match posts');
  assert(equalCounts(summary.format_counts, countBy(posts, 'format')), 'format counts do not match posts');
  assert(equalCounts(summary.pillar_counts, countBy(posts, 'content_pillar')), 'pillar counts do not match posts');
  assert(equalCounts(summary.funnel_counts, countBy(posts, 'funnel_stage')), 'funnel counts do not match posts');

  const postSet = new Set(postCodes);
  const assetSet = new Set(assetCodes);
  const requirementCodes = requirements.map((requirement: any) => requirement.requirement_code);
  assert(new Set(requirementCodes).size === requirementCodes.length, 'requirement codes must be unique');
  for (const requirement of requirements) {
    assert(requirement.related_post_codes.every((code: string) => postSet.has(code)), `${requirement.requirement_code} references unknown post`);
    assert(requirement.related_asset_codes.every((code: string) => assetSet.has(code)), `${requirement.requirement_code} references unknown asset slot`);
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

  for (const check of ['schema_ready', 'strategy_fidelity', 'claim_safety', 'tracking_integrity', 'calendar_integrity', 'editorial_diversity', 'visual_brief_completeness']) {
    assert(draft.campaign_quality_report[check] === true, `campaign_quality_report.${check} must be true`);
  }

  console.log(`Validated campaign draft strategy and product fidelity: ${inputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown campaign draft validation error');
  process.exitCode = 1;
});
