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

function stringValues(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalized(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

function combinedPostCopy(post: any): string {
  const slideCopy = Array.isArray(post.carousel?.slides)
    ? post.carousel.slides.flatMap((slide: any) => [slide.visible_copy?.headline, slide.visible_copy?.supporting_text, slide.product_truth_anchor])
    : [];
  return [
    post.hook,
    post.caption,
    post.product_truth_anchor,
    post.visible_copy_plan?.headline,
    post.visible_copy_plan?.supporting_text,
    ...slideCopy,
  ].filter((value): value is string => typeof value === 'string').join(' ');
}

async function main(): Promise<void> {
  const inputPath = readArg('input');
  const contentContextPath = readArg('content-context');
  const cmoStrategyPath = readArg('cmo-strategy');
  if (!inputPath || !contentContextPath || !cmoStrategyPath) {
    throw new Error('Usage: tsx apps/api/scripts/validate-marketing-campaign-draft.ts --input=<campaign-draft.json> --content-context=<content-context.json> --cmo-strategy=<cmo-strategy.json>');
  }

  const [draft, contentContext, cmoStrategy] = await Promise.all([
    readFile(inputPath, 'utf8').then((value) => JSON.parse(value) as any),
    readFile(contentContextPath, 'utf8').then((value) => JSON.parse(value) as any),
    readFile(cmoStrategyPath, 'utf8').then((value) => JSON.parse(value) as any),
  ]);
  const { campaign, posts, campaign_execution_summary: summary, asset_requirements: requirements, provenance } = draft;

  assert(Array.isArray(posts) && posts.length > 0, 'posts must be a non-empty array');
  assert(posts.length === campaign.target_post_count, `post count ${posts.length} does not match campaign.target_post_count ${campaign.target_post_count}`);
  assert(summary.post_count === posts.length, 'campaign_execution_summary.post_count does not match posts length');
  const campaignCodeMatch = /^ib_(\d{4})(0[1-9]|1[0-2])$/.exec(campaign.campaign_code);
  assert(campaignCodeMatch, 'campaign.campaign_code must use canonical ib_YYYYMM format');
  const campaignPeriod = `${campaignCodeMatch[1]}-${campaignCodeMatch[2]}`;
  assert(draft.period_key === campaignPeriod, 'period_key does not match canonical campaign_code');
  assert(provenance.source_branch === `automation/marketing-cycle-${draft.period_key}`, 'provenance.source_branch does not match period_key');
  assert(provenance.content_context_path === `marketing/agent-inputs/${draft.period_key}/content-context.json`, 'content_context_path does not match period_key');
  assert(provenance.cmo_strategy_path === `marketing/agent-outputs/${draft.period_key}/cmo-strategy.json`, 'cmo_strategy_path does not match period_key');

  assert(contentContext?.period?.period_key === draft.period_key, 'content context period does not match campaign draft');
  assert(cmoStrategy?.period === draft.period_key, 'CMO strategy period does not match campaign draft');
  assert(contentContext?.strategy?.cmo_output?.period === cmoStrategy.period, 'embedded CMO strategy period does not match original strategy');
  assert(contentContext?.period?.campaign_code === campaign.campaign_code, 'campaign_code differs from content context');
  assert(contentContext?.period?.target_post_count === campaign.target_post_count, 'target_post_count differs from content context');
  assert(contentContext?.period?.timezone === campaign.timezone, 'campaign timezone differs from content context');
  assert(contentContext?.period?.publishing_start_date === campaign.publishing_start_date, 'publishing_start_date differs from content context');
  assert(contentContext?.period?.publishing_end_date === campaign.publishing_end_date, 'publishing_end_date differs from content context');
  assert(campaign.objective === cmoStrategy?.strategy?.primary_objective, 'campaign objective differs from CMO primary objective');

  const allowedPlatforms = new Set(stringValues(contentContext?.operational_constraints?.platforms));
  const allowedFormats = new Set(stringValues(contentContext?.operational_constraints?.formats));
  assert(campaign.platforms.every((value: string) => allowedPlatforms.has(value)), 'campaign contains a platform not allowed by content context');
  assert(campaign.formats.every((value: string) => allowedFormats.has(value)), 'campaign contains a format not allowed by content context');

  const pillarCodes = new Set(
    (Array.isArray(cmoStrategy?.strategy?.content_pillars) ? cmoStrategy.strategy.content_pillars : [])
      .map((pillar: any) => pillar?.pillar_code)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0),
  );
  const experiments = new Map<string, any>(
    (Array.isArray(cmoStrategy?.experiments) ? cmoStrategy.experiments : [])
      .filter((experiment: any) => typeof experiment?.experiment_code === 'string')
      .map((experiment: any) => [experiment.experiment_code, experiment]),
  );
  assert(pillarCodes.size > 0, 'CMO strategy has no valid pillar_code values');
  assert(experiments.size > 0, 'CMO strategy has no valid experiment_code values');

  const approvedTruths = Array.isArray(contentContext?.product_context?.approved_product_truths)
    ? contentContext.product_context.approved_product_truths
    : [];
  const truthRefs = new Set(
    approvedTruths.map((truth: any) => truth?.truth_ref).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0),
  );
  assert(truthRefs.size > 0, 'content context has no approved product truth references');

  const forbiddenClaims = [
    ...stringValues(cmoStrategy?.messaging_guidelines?.messages_to_avoid),
    ...stringValues(cmoStrategy?.messaging_guidelines?.claims_to_avoid),
  ].map(normalized).filter((value) => value.length >= 4);
  const hardBlockedClaims: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(guaranteed?|guarantees?|guarantee)\b/i, label: 'guaranteed outcome' },
    { pattern: /\b(cure|cures|cured|treat|treats|treatment|diagnose|diagnosis)\b/i, label: 'medical claim' },
    { pattern: /\bfully automatic\b|\bon autopilot\b/i, label: 'unsupported automatic capability' },
    { pattern: /\bproven results?\b/i, label: 'unsupported proven result' },
  ];

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
    assert(allowedPlatforms.has(post.platform), `${post.post_code} uses unsupported platform ${post.platform}`);
    assert(allowedFormats.has(post.format), `${post.post_code} uses unsupported format ${post.format}`);
    assert(pillarCodes.has(post.content_pillar), `${post.post_code} references unknown CMO pillar ${post.content_pillar}`);
    const experiment = experiments.get(post.experiment_code);
    assert(experiment, `${post.post_code} references unknown CMO experiment ${post.experiment_code}`);
    const experimentPillars = stringValues(experiment.content_pillars);
    if (experimentPillars.length > 0) {
      assert(experimentPillars.includes(post.content_pillar), `${post.post_code} maps experiment ${post.experiment_code} to an unsupported pillar`);
    }
    if (typeof experiment.primary_metric === 'string' && experiment.primary_metric.trim()) {
      assert(post.primary_metric === experiment.primary_metric, `${post.post_code} primary_metric differs from experiment ${post.experiment_code}`);
    }

    const evidenceRefs = stringValues(post.visual_strategy?.product_evidence);
    assert(evidenceRefs.length > 0, `${post.post_code} must cite at least one approved product truth reference`);
    for (const truthRef of evidenceRefs) {
      assert(truthRefs.has(truthRef), `${post.post_code} references unknown product truth ${truthRef}`);
    }

    const copy = combinedPostCopy(post);
    const normalizedCopy = normalized(copy);
    for (const blocked of forbiddenClaims) {
      assert(!normalizedCopy.includes(blocked), `${post.post_code} contains a CMO-forbidden claim or message: ${blocked}`);
    }
    for (const blocked of hardBlockedClaims) {
      assert(!blocked.pattern.test(copy), `${post.post_code} contains ${blocked.label}`);
    }

    assert(post.utm.utm_campaign === campaign.campaign_code, `${post.post_code} utm_campaign must equal campaign_code`);
    assert(post.utm.utm_content === post.post_code, `${post.post_code} utm_content must equal post_code`);
    assert(post.asset_slots.length >= 1, `${post.post_code} must define at least one asset slot`);
    for (const slot of post.asset_slots) {
      assert(slot.post_code === post.post_code, `${slot.asset_code} post_code does not match owner post`);
      for (const reference of stringValues(slot.semantic_source_references)) {
        const knownAssetReference = Object.values(contentContext.available_assets ?? {})
          .flatMap((values: any) => Array.isArray(values) ? values : [])
          .some((asset: any) => [asset?.asset_id, asset?.label].includes(reference));
        assert(knownAssetReference, `${slot.asset_code} references unknown source asset ${reference}`);
      }
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

  const requiredQualityChecks = [
    'schema_ready',
    'strategy_fidelity',
    'claim_safety',
    'tracking_integrity',
    'calendar_integrity',
    'editorial_diversity',
    'visual_brief_completeness',
  ];
  for (const check of requiredQualityChecks) {
    assert(draft.campaign_quality_report[check] === true, `campaign_quality_report.${check} must be true for a successful draft`);
  }

  console.log(`Validated campaign draft strategy and product fidelity: ${inputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown campaign draft validation error');
  process.exitCode = 1;
});