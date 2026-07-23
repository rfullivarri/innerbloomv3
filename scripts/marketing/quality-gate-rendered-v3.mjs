#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const manifestArg = process.argv[2];
if (!manifestArg) throw new Error("Usage: quality-gate-rendered-v3 <render-manifest-v3.json>");

const manifestPath = path.resolve(manifestArg);
const outputDir = path.dirname(manifestPath);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const assets = manifest.assets || [];
const errors = [];
const checks = [];

const APPROVED_PHASE1_LAYOUTS = new Set([
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

if (!assets.length) errors.push("render manifest contains no assets");

const seenHashes = new Map();
for (const asset of assets) {
  const code = asset.asset_code || "unknown";
  const pngPath = path.join(outputDir, `${code}.png`);
  let bytes;
  try {
    bytes = await fs.readFile(pngPath);
  } catch {
    errors.push(`${code}: PNG is missing`);
    continue;
  }

  const png = bytes.length >= 24 && bytes.subarray(1, 4).toString() === "PNG";
  const width = png ? bytes.readUInt32BE(16) : 0;
  const height = png ? bytes.readUInt32BE(20) : 0;
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  const quality = asset.quality || {};

  if (seenHashes.has(hash)) errors.push(`${code}: exact visual duplicate of ${seenHashes.get(hash)}`);
  else seenHashes.set(hash, code);
  if (!png || width !== 1080 || height !== 1080) errors.push(`${code}: expected a 1080×1080 PNG, got ${width}×${height}`);
  if (bytes.length < 45_000) errors.push(`${code}: PNG is suspiciously small (${bytes.length} bytes)`);
  if (!APPROVED_PHASE1_LAYOUTS.has(asset.layout_variant)) errors.push(`${code}: layout ${asset.layout_variant} is outside the Phase 1 production set`);
  if (quality.copy_exact !== true) errors.push(`${code}: rendered copy differs from campaign JSON`);
  if (quality.support_safe_area !== true) errors.push(`${code}: supporting visual failed the 24px safe area`);
  if (quality.copy_safe_area !== true) errors.push(`${code}: copy failed the 24px safe area`);
  if (Number(quality.copy_support_overlap_px || 0) > MAX_COPY_SUPPORT_OVERLAP_PX) errors.push(`${code}: supporting visual overlaps copy (${quality.copy_support_overlap_px}px²)`);
  if (Number(quality.copy_product_overlap_px || 0) > MAX_COPY_PRODUCT_OVERLAP_PX) errors.push(`${code}: product overlaps copy (${quality.copy_product_overlap_px}px²)`);
  if (quality.clipped_text !== false) errors.push(`${code}: visible copy is clipped`);
  if (quality.material_scene_present !== true) errors.push(`${code}: registered scene plate did not render`);
  if (quality.brand_present !== true) errors.push(`${code}: approved brand asset did not render`);
  if (quality.screen_fit_contain !== true) errors.push(`${code}: registered UI is cropped inside the device`);
  if (manifest.schema_version === "3.1-phase1" && quality.phase1_collision_pass !== true) errors.push(`${code}: Phase 1 collision retry did not certify the frame`);

  checks.push({
    asset_code: code,
    png: path.basename(pngPath),
    bytes: bytes.length,
    width,
    height,
    sha256: hash,
    requested_layout_variant: asset.requested_layout_variant || null,
    effective_layout_variant: asset.layout_variant || null,
    quality,
    passed: !errors.some(error => error.startsWith(`${code}:`)),
  });
}

if (assets.length >= 12) {
  const layouts = new Set(assets.map(asset => asset.layout_variant));
  if (layouts.size < 4) errors.push(`Phase 1 campaign output needs at least four proven layouts; found ${layouts.size}`);

  let longestRun = 0;
  let currentRun = 0;
  let previous = null;
  for (const asset of assets) {
    if (asset.layout_variant === previous) currentRun += 1;
    else {
      previous = asset.layout_variant;
      currentRun = 1;
    }
    longestRun = Math.max(longestRun, currentRun);
  }
  if (longestRun > 4) errors.push(`Phase 1 campaign repeats one layout ${longestRun} times consecutively; maximum is four`);
}

const report = {
  schema_version: "2.0-phase1",
  gate: "rendered_creative_v3_phase1",
  passed: errors.length === 0,
  asset_count: assets.length,
  thresholds: {
    copy_product_overlap_px: MAX_COPY_PRODUCT_OVERLAP_PX,
    copy_support_overlap_px: MAX_COPY_SUPPORT_OVERLAP_PX,
  },
  checks,
  errors,
};
await fs.writeFile(path.join(outputDir, "quality-report-v3.json"), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Phase 1 rendered creative quality passed: ${assets.length} PNG${assets.length === 1 ? "" : "s"}.`);
