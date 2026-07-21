#!/usr/bin/env node
/**
 * Mechanical guard for the Creative Director handoff.
 * It rejects creative choices that do not use the campaign's already approved
 * source assets, before any renderer or storage job runs.
 */
import fs from "node:fs/promises";

const input = process.argv[2];
if (!input) throw new Error("Usage: validate-creative-direction <campaign.json>");
const campaign = JSON.parse(await fs.readFile(input, "utf8"));
const families = new Set(["product_hero_scene","product_angle","product_depth","module_spotlight","editorial_statement","proof_sequence","supporting_visual_scene"]);
const modes = new Set(["light","dark"]);
const errors = [];

for (const job of campaign.image_generation?.jobs || []) {
  const d = job.creative_direction;
  if (!d) { errors.push(job.asset_code + ": missing creative_direction"); continue; }
  if (!families.has(d.visual_family)) errors.push(job.asset_code + ": unknown visual_family");
  if (!modes.has(d.mode)) errors.push(job.asset_code + ": unknown mode");
  if (d.wordmark_treatment !== "canonical_innerbloom_lockup") errors.push(job.asset_code + ": must use canonical wordmark");
  const allowed = new Set((job.source_assets || []).map(asset => asset.asset_key));
  for (const key of d.selected_asset_keys || []) if (!allowed.has(key)) errors.push(job.asset_code + ": " + key + " is not an approved source asset for this job");
  if (!Array.isArray(d.acceptance_criteria) || d.acceptance_criteria.length < 3) errors.push(job.asset_code + ": needs at least three acceptance criteria");
  if (d.supporting_visual?.required === true && !d.supporting_visual.brief) errors.push(job.asset_code + ": supporting visual requires a brief");
  if (d.status === "blocked" && !d.blocking_reason) errors.push(job.asset_code + ": blocked jobs require a reason");
}
if (!campaign.image_generation?.jobs?.length) errors.push("campaign has no image jobs");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Creative direction validation passed for " + campaign.image_generation.jobs.length + " image jobs.");
