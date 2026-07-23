#!/usr/bin/env node
/**
 * Phase 1 campaign renderer.
 *
 * The Creative Director chooses semantic evidence and a preferred visual role.
 * This orchestrator owns final geometry: it retries a small set of proven v3
 * layouts until copy, product and supporting evidence occupy safe zones.
 * Existing visible_copy is never modified.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const legacyRenderer = path.join(__dirname, "render-campaign-v3.mjs");

const [campaignArg, ...args] = process.argv.slice(2);
if (!campaignArg) {
  throw new Error("Usage: render-campaign-phase1 <campaign.json> --asset-dir <directory> --out <directory> [--limit N]");
}

function arg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const campaignPath = path.resolve(campaignArg);
const assetDir = path.resolve(arg("--asset-dir", path.join(path.dirname(campaignPath), "staged-assets")));
const outputDir = path.resolve(arg("--out", path.join(repoRoot, "marketing/generated")));
const limit = Number.parseInt(arg("--limit", "0"), 10) || 0;

const APPROVED_LAYOUTS = new Set([
  "editorial_material_scene",
  "split_device_right",
  "split_device_left",
  "storefront_feature_stage",
  "storefront_metric_overlay",
  "carousel_proof_focus",
  "carousel_cta_close",
]);

const MAX_COPY_PRODUCT_OVERLAP_PX = 240;
const MAX_COPY_SUPPORT_OVERLAP_PX = 240;

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with ${code}`));
    });
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isMobileKey(key = "") {
  return key.startsWith("mobile_");
}

function isModuleKey(key = "") {
  return key.startsWith("module_");
}

function copyWeight(job) {
  const headline = String(job.visible_copy?.headline || "");
  const support = String(job.visible_copy?.supporting_text || "");
  return headline.length * 1.8 + support.length;
}

function candidateLayouts(job, previousLayout) {
  const direction = job.creative_direction || {};
  const preferred = APPROVED_LAYOUTS.has(direction.layout_variant) ? direction.layout_variant : null;
  const keys = direction.selected_asset_keys || [];
  const primary = keys[0] || "";
  const detail = keys[1] || "";
  const scene = direction.art_direction?.scene_asset_key;
  const heavyCopy = copyWeight(job) > 165;
  const slide = Number(job.slide_number || 0);

  const candidates = [];
  if (scene && isMobileKey(primary)) candidates.push("editorial_material_scene");
  if (preferred) candidates.push(preferred);

  if (slide >= 5) candidates.push("carousel_cta_close");
  if (isModuleKey(detail)) candidates.push("storefront_metric_overlay");
  if (slide > 1 && slide < 5) candidates.push("carousel_proof_focus");

  if (!heavyCopy && isMobileKey(primary)) candidates.push("storefront_feature_stage");
  candidates.push("split_device_right", "split_device_left");
  if (isMobileKey(primary)) candidates.push("carousel_proof_focus", "storefront_feature_stage");
  else candidates.push("carousel_cta_close");

  const ordered = unique(candidates).filter(layout => APPROVED_LAYOUTS.has(layout));
  if (previousLayout && ordered[0] === previousLayout && ordered.length > 1) {
    ordered.push(ordered.shift());
  }
  return ordered;
}

function normalizedDirection(job, layout) {
  const original = structuredClone(job.creative_direction || {});
  const keys = original.selected_asset_keys || [];
  const detailKey = keys[1] || "";

  original.layout_variant = layout;
  original.screen_fit = "contain";

  // Exact geometry belongs to the renderer, not the agent.
  delete original.device_presentation;
  delete original.focus_y;

  if (original.art_direction) {
    const angle = Number(original.art_direction.device_angle_deg || 0);
    original.art_direction.device_angle_deg = Math.max(-6, Math.min(6, angle));
  }

  if (layout === "storefront_metric_overlay" && isModuleKey(detailKey)) {
    original.supporting_treatment = "focus_crop";
  } else if (!["storefront_metric_overlay"].includes(layout)) {
    original.supporting_treatment = "none";
  }

  return original;
}

function qualityPasses(record) {
  const quality = record?.quality || {};
  return quality.copy_safe_area === true
    && quality.support_safe_area === true
    && quality.clipped_text === false
    && Number(quality.copy_product_overlap_px || 0) <= MAX_COPY_PRODUCT_OVERLAP_PX
    && Number(quality.copy_support_overlap_px || 0) <= MAX_COPY_SUPPORT_OVERLAP_PX
    && quality.screen_fit_contain === true
    && quality.brand_present === true;
}

async function renderAttempt(campaign, job, layout, tempRoot, attemptIndex) {
  const attemptDir = path.join(tempRoot, `attempt-${attemptIndex}-${layout}`);
  await fs.mkdir(attemptDir, { recursive: true });

  const normalizedJob = structuredClone(job);
  normalizedJob.visible_copy = structuredClone(job.visible_copy || {});
  normalizedJob.creative_direction = normalizedDirection(job, layout);

  const attemptCampaign = {
    ...campaign,
    image_generation: {
      ...(campaign.image_generation || {}),
      jobs: [normalizedJob],
    },
  };
  const tempCampaignPath = path.join(attemptDir, "campaign.json");
  await fs.writeFile(tempCampaignPath, `${JSON.stringify(attemptCampaign, null, 2)}\n`);

  try {
    await run(process.execPath, [
      legacyRenderer,
      tempCampaignPath,
      "--asset-dir", assetDir,
      "--out", attemptDir,
      "--limit", "1",
    ]);
    const manifest = JSON.parse(await fs.readFile(path.join(attemptDir, "render-manifest-v3.json"), "utf8"));
    const record = manifest.assets?.[0];
    return {
      passed: qualityPasses(record),
      record,
      pngPath: path.join(attemptDir, `${job.asset_code}.png`),
      error: null,
    };
  } catch (error) {
    return { passed: false, record: null, pngPath: null, error: error.message };
  }
}

async function main() {
  const campaign = JSON.parse(await fs.readFile(campaignPath, "utf8"));
  const allJobs = campaign.image_generation?.jobs || [];
  const jobs = limit ? allJobs.slice(0, limit) : allJobs;
  if (!jobs.length) throw new Error("Campaign has no image jobs");

  await fs.mkdir(outputDir, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "innerbloom-phase1-"));
  const records = [];
  let previousLayout = null;

  try {
    for (const job of jobs) {
      const keys = job.creative_direction?.selected_asset_keys || [];
      if (!keys.length) throw new Error(`${job.asset_code}: selected_asset_keys is empty`);

      const attempts = [];
      let accepted = null;
      const candidates = candidateLayouts(job, previousLayout);

      for (let index = 0; index < candidates.length; index += 1) {
        const layout = candidates[index];
        const result = await renderAttempt(campaign, job, layout, tempRoot, index + 1);
        attempts.push({
          layout,
          passed: result.passed,
          error: result.error,
          quality: result.record?.quality || null,
        });
        if (result.passed) {
          accepted = { ...result, layout };
          break;
        }
      }

      if (!accepted) {
        const detail = attempts.map(item => `${item.layout}: ${item.error || JSON.stringify(item.quality)}`).join("\n");
        throw new Error(`${job.asset_code}: no Phase 1 layout passed collision and safe-area checks.\n${detail}`);
      }

      const filename = `${job.asset_code}.png`;
      await fs.copyFile(accepted.pngPath, path.join(outputDir, filename));
      previousLayout = accepted.layout;
      records.push({
        ...accepted.record,
        filename,
        requested_layout_variant: job.creative_direction?.layout_variant || null,
        layout_variant: accepted.layout,
        phase1_attempts: attempts,
        quality: {
          ...(accepted.record?.quality || {}),
          phase1_collision_pass: true,
          max_copy_product_overlap_px: MAX_COPY_PRODUCT_OVERLAP_PX,
          max_copy_support_overlap_px: MAX_COPY_SUPPORT_OVERLAP_PX,
        },
      });
      console.log(`${job.asset_code}: accepted ${accepted.layout} after ${attempts.length} attempt(s)`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  const manifest = {
    schema_version: "3.1-phase1",
    campaign_path: campaignPath,
    rendered_at: new Date().toISOString(),
    policy: {
      approved_layouts: [...APPROVED_LAYOUTS],
      copy_preserved: true,
      renderer_owns_geometry: true,
      collision_retry_enabled: true,
    },
    assets: records,
  };
  await fs.writeFile(path.join(outputDir, "render-manifest-v3.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Rendered ${jobs.length} campaign PNGs with the Phase 1 collision-aware policy.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
