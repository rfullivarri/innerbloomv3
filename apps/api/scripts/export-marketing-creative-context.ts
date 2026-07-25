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

async function loadJson(path: string): Promise<{ raw: string; value: any }> {
  const raw = await readFile(path, 'utf8');
  return { raw, value: JSON.parse(raw) };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const period = readArg('period');
  const force = hasFlag('force');
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error('Usage: --period=YYYY-MM [--force]');
  }

  const root = process.cwd();
  const draftPath = resolve(root, `marketing/agent-outputs/${period}/campaign-draft.json`);
  const strategyPath = resolve(root, `marketing/agent-outputs/${period}/cmo-strategy.json`);
  const contentContextPath = resolve(root, `marketing/agent-inputs/${period}/content-context.json`);
  const visualSystemPath = resolve(root, 'prompts/marketing/agent-system/brand/innerbloom-visual-system-v1.json');
  const assetRegistryPath = resolve(root, 'marketing/asset-registry/innerbloom-drive-assets-v1.json');
  const layoutSpecPath = resolve(root, 'marketing/layout-references/innerbloom-layout-specifications-v1.json');
  const outputPath = resolve(root, `marketing/agent-inputs/${period}/creative-context.json`);

  if (!force) {
    try {
      await readFile(outputPath, 'utf8');
      console.log(JSON.stringify({ status: 'already_exists', outputPath }, null, 2));
      return;
    } catch {}
  }

  const [draft, strategy, contentContext, visualSystem, assetRegistry, layoutSpec] = await Promise.all([
    loadJson(draftPath),
    loadJson(strategyPath),
    loadJson(contentContextPath),
    loadJson(visualSystemPath),
    loadJson(assetRegistryPath),
    loadJson(layoutSpecPath),
  ]);

  assert(draft.value?.period_key === period, 'Campaign draft period mismatch');
  assert(strategy.value?.period === period, 'CMO strategy period mismatch');
  assert(contentContext.value?.period?.period_key === period, 'Content context period mismatch');
  assert(draft.value?.campaign?.status === 'review', 'Campaign draft must remain review');
  assert(Array.isArray(draft.value?.posts) && draft.value.posts.length === draft.value.campaign.target_post_count, 'Campaign draft post count mismatch');

  const approvedAssets = (Array.isArray(assetRegistry.value?.assets) ? assetRegistry.value.assets : [])
    .filter((asset: any) => asset?.status === 'approved_current')
    .map((asset: any) => ({
      asset_key: asset.asset_key,
      kind: asset.kind,
      module: asset.module,
      mode: asset.mode,
      surface: asset.surface,
      composition_profile: asset.composition_profile ?? null,
      composition_slots: asset.composition_slots ?? null,
      allowed_operations: asset.allowed_operations ?? [],
    }));

  const layouts = (Array.isArray(layoutSpec.value?.layouts) ? layoutSpec.value.layouts : []).map((layout: any) => ({
    layout_key: layout.layout_key,
    status: layout.status,
    renderer_layout: layout.renderer_layout,
    copy_role: layout.copy_role,
    copy_zone: layout.copy_zone,
    product_zone: layout.product_zone,
    device_pose: layout.device_pose,
    min_mobile_assets: layout.min_mobile_assets ?? 0,
    max_mobile_assets: layout.max_mobile_assets ?? 0,
    min_module_assets: layout.min_module_assets ?? 0,
    allowed_backgrounds: layout.allowed_backgrounds ?? [],
    required_support_assets: layout.required_support_assets ?? [],
    fallback_layouts: layout.fallback_layouts ?? [],
  }));

  assert(approvedAssets.length > 0, 'No approved current assets are available');
  assert(layouts.some((layout: any) => layout.status === 'executable'), 'No executable renderer layouts are available');

  const generatedAt = new Date().toISOString();
  const output = {
    schema_version: '1.0',
    context_type: 'innerbloom_creative_director_input',
    period_key: period,
    generated_at: generatedAt,
    provenance: {
      source_branch: `automation/marketing-cycle-${period}`,
      campaign_draft_path: `marketing/agent-outputs/${period}/campaign-draft.json`,
      campaign_draft_sha256: sha256(draft.raw),
      cmo_strategy_path: `marketing/agent-outputs/${period}/cmo-strategy.json`,
      cmo_strategy_sha256: sha256(strategy.raw),
      content_context_path: `marketing/agent-inputs/${period}/content-context.json`,
      content_context_sha256: sha256(contentContext.raw),
      visual_system_path: 'prompts/marketing/agent-system/brand/innerbloom-visual-system-v1.json',
      visual_system_sha256: sha256(visualSystem.raw),
      asset_registry_path: 'marketing/asset-registry/innerbloom-drive-assets-v1.json',
      asset_registry_sha256: sha256(assetRegistry.raw),
      layout_spec_path: 'marketing/layout-references/innerbloom-layout-specifications-v1.json',
      layout_spec_sha256: sha256(layoutSpec.raw),
      creative_director_contract_version: 'creative-director-v1',
    },
    immutable_editorial_source: draft.value,
    strategic_guardrails: {
      strategy: strategy.value,
      approved_product_truths: contentContext.value?.product_context?.approved_product_truths ?? [],
      approved_claim_source: contentContext.value?.product_context?.approved_claim_source ?? {},
    },
    visual_system: visualSystem.value,
    renderer_capabilities: {
      policy: layoutSpec.value?.policy ?? {},
      device_pose_presets: layoutSpec.value?.device_pose_presets ?? {},
      layouts,
      output_canvas: { width: 1080, height: 1080, format: 'png' },
    },
    current_assets: {
      registry_name: assetRegistry.value?.registry_name,
      selection_rules: assetRegistry.value?.selection_rules ?? [],
      assets: approvedAssets,
    },
    production_rules: {
      output_path: `marketing/agent-outputs/${period}/campaign.json`,
      failure_path: `marketing/agent-outputs/${period}/creative-director-failure.json`,
      preserve_editorial_fields: true,
      registered_assets_only: true,
      executable_layouts_only: true,
      allow_experimental_layout_only_with_required_support_assets: true,
      campaign_status: 'review',
      post_status: 'needs_review',
      renderer_validator: 'scripts/marketing/validate-creative-direction-v3.mjs',
      diversity_rules: {
        minimum_unique_layouts_full_campaign: 12,
        minimum_distinct_source_assets_full_campaign: 14,
        minimum_unique_layouts_per_carousel: 4,
        maximum_layout_share_percent: 20,
      },
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await rename(tempPath, outputPath);
  console.log(JSON.stringify({ status: 'written', outputPath, period, approvedAssetCount: approvedAssets.length, layoutCount: layouts.length }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown creative context export error');
  process.exitCode = 1;
});
