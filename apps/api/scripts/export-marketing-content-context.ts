import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const readArg = (name: string): string | null => {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
};

const hasFlag = (name: string): boolean => process.argv.slice(2).includes(`--${name}`);
const sha256 = (value: string): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;

function monthEnd(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

async function loadJson(path: string): Promise<{ raw: string; value: any }> {
  const raw = await readFile(path, 'utf8');
  return { raw, value: JSON.parse(raw) };
}

async function main(): Promise<void> {
  const period = readArg('period');
  const force = hasFlag('force');
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Usage: --period=YYYY-MM --approve-strategy [--force]');
  if (!hasFlag('approve-strategy')) throw new Error('Explicit human approval is required');

  const root = process.cwd();
  const contextPath = resolve(root, `marketing/agent-inputs/${period}/cmo-context.json`);
  const strategyPath = resolve(root, `marketing/agent-outputs/${period}/cmo-strategy.json`);
  const outputPath = resolve(root, `marketing/agent-inputs/${period}/content-context.json`);

  if (!force) {
    try {
      await readFile(outputPath, 'utf8');
      console.log(JSON.stringify({ status: 'already_exists', outputPath }, null, 2));
      return;
    } catch {}
  }

  const [{ raw: contextRaw, value: context }, { raw: strategyRaw, value: strategy }] = await Promise.all([
    loadJson(contextPath),
    loadJson(strategyPath),
  ]);

  if (context?.period?.current_period !== period || strategy?.period !== period) throw new Error('Period mismatch');
  if (!['draft', 'approved'].includes(strategy?.review_status)) throw new Error('Strategy is not eligible for approval');

  const campaignCode = `ib_${period.replace('-', '')}`;
  const supported = context.operational_constraints?.supported_formats ?? [];
  const formats = supported.map((value: string) => value.includes('carousel') ? 'carousel' : value.includes('static') ? 'static' : value);
  const primaryUrl = context.available_assets?.existing_visuals?.find((asset: any) => asset.label === 'primaryUrl')?.url ?? 'https://innerbloomjourney.org/';
  const now = new Date().toISOString();

  const output = {
    schema_version: '1.0',
    period: {
      period_key: period,
      campaign_code: campaignCode,
      timezone: context.period.timezone,
      target_post_count: context.period.target_post_count,
      publishing_start_date: `${period}-01`,
      publishing_end_date: monthEnd(period),
    },
    strategy: {
      review_status: 'approved',
      approval_authority: 'human_workflow_dispatch',
      approval_recorded_at: now,
      original_cmo_review_status: strategy.review_status,
      cmo_output_path: `marketing/agent-outputs/${period}/cmo-strategy.json`,
      cmo_output: strategy,
    },
    brand: {
      objective: context.business_context?.current_marketing_objective,
      positioning: context.strategy_memory?.current_positioning ?? [],
      content_rules: context.strategy_memory?.content_rules ?? [],
      language: context.strategy_memory?.campaign_defaults?.default_language ?? 'English',
      human_approval: true,
    },
    product_context: {
      stage: context.business_context?.product_stage,
      known_product_changes: context.business_context?.known_product_changes ?? [],
      product_pages: context.analytics?.product_pages ?? [],
      product_totals: context.analytics?.product_totals ?? {},
      approved_claim_source: strategy.messaging_guidelines ?? {},
    },
    available_assets: context.available_assets ?? {},
    operational_constraints: {
      platforms: context.operational_constraints?.platforms ?? ['instagram'],
      formats,
      max_carousel_slides: 10,
      max_assets_per_post: 10,
      publishing_method: context.operational_constraints?.publishing ?? 'Metricool CSV after approval',
      public_asset_store: context.operational_constraints?.public_storage ?? 'Cloudflare R2',
      review_required: true,
      calendar_rules: ['Use dates inside the publishing window', 'Use contiguous sequence numbers', 'Do not publish or approve posts'],
    },
    tracking: {
      base_url: primaryUrl,
      utm_source: 'instagram',
      utm_medium: 'social',
      campaign_code: campaignCode,
      additional_parameters: { utm_content: 'post_code', ib_post: 'sequence_number' },
    },
    source_manifest: [
      ...(Array.isArray(context.source_manifest) ? context.source_manifest : []),
      { source_type: 'repo_file', source_path_or_id: `marketing/agent-inputs/${period}/cmo-context.json`, captured_at: now, checksum: sha256(contextRaw) },
      { source_type: 'approved_strategy', source_path_or_id: `marketing/agent-outputs/${period}/cmo-strategy.json`, captured_at: now, checksum: sha256(strategyRaw) },
      { source_type: 'human_approval', source_path_or_id: 'workflow_dispatch:approve_strategy', captured_at: now, checksum: sha256(`${period}:${campaignCode}:approved`) },
    ],
  };

  await mkdir(dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await rename(tempPath, outputPath);
  console.log(JSON.stringify({ status: 'written', outputPath, period, campaignCode }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown content context export error');
  process.exitCode = 1;
});
