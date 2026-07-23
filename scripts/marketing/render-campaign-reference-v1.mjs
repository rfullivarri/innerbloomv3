#!/usr/bin/env node
/**
 * Compiles approved visual references into concrete creative directions and then
 * delegates final geometry/collision handling to render-campaign-phase1.mjs.
 * visible_copy is copied byte-for-byte from the source campaign object.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  applyReferenceSpecification,
  loadLayoutSpecifications,
  resolveReferenceCandidates,
} from "./layout-reference-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const phase1Renderer = path.join(__dirname, "render-campaign-phase1.mjs");
const defaultSpecPath = path.join(repoRoot, "marketing/layout-references/innerbloom-layout-specifications-v1.json");
const [campaignArg, ...args] = process.argv.slice(2);
if (!campaignArg) throw new Error("Usage: render-campaign-reference-v1 <campaign.json> --asset-dir <dir> --out <dir> [--post-limit N] [--pilot-scenes] [--layout-spec <json>]");

function arg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}
function withoutPair(values, name) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === name) { index += 1; continue; }
    result.push(values[index]);
  }
  return result;
}
function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: repoRoot, env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function main() {
  const campaignPath = path.resolve(campaignArg);
  const specificationPath = path.resolve(arg("--layout-spec", defaultSpecPath));
  const specifications = await loadLayoutSpecifications(specificationPath);
  const campaign = JSON.parse(await fs.readFile(campaignPath, "utf8"));
  const jobs = campaign.image_generation?.jobs || [];
  if (!jobs.length) throw new Error("Campaign has no image jobs");

  const usage = new Map();
  const compiledJobs = jobs.map(job => {
    const cloned = structuredClone(job);
    cloned.visible_copy = structuredClone(job.visible_copy || {});
    const candidates = resolveReferenceCandidates(job, specifications);
    if (!candidates.length) return cloned;

    // Prefer the least-used compatible reference to create controlled variety.
    const selected = [...candidates].sort((a, b) => {
      const usageDelta = (usage.get(a.layout_key) || 0) - (usage.get(b.layout_key) || 0);
      if (usageDelta !== 0) return usageDelta;
      return a.layout_key.localeCompare(b.layout_key);
    })[0];
    usage.set(selected.layout_key, (usage.get(selected.layout_key) || 0) + 1);
    const pose = specifications.poses.get(selected.device_pose) || null;
    cloned.creative_direction = applyReferenceSpecification(job.creative_direction, selected, pose);
    cloned.creative_direction.reference_contract = {
      specification_version: specifications.document.schema_version,
      layout_key: selected.layout_key,
      reference_key: selected.reference_key,
      status: selected.status,
      copy_locked: true,
      real_ui_required: true,
    };
    return cloned;
  });

  const compiledCampaign = {
    ...campaign,
    image_generation: { ...(campaign.image_generation || {}), jobs: compiledJobs },
    layout_reference_plan: {
      specification_key: specifications.document.spec_key,
      specification_path: path.relative(repoRoot, specificationPath),
      compiled_at: new Date().toISOString(),
      copy_preserved: true,
      real_innerbloom_assets_only: true,
      selected_layout_counts: Object.fromEntries(usage),
    },
  };

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "innerbloom-layout-reference-"));
  const tempCampaignPath = path.join(tempDir, "campaign.reference-compiled.json");
  try {
    await fs.writeFile(tempCampaignPath, `${JSON.stringify(compiledCampaign, null, 2)}\n`);
    const forwardedArgs = withoutPair(args, "--layout-spec");
    await run(process.execPath, [phase1Renderer, tempCampaignPath, ...forwardedArgs]);

    const outputArg = arg("--out", null);
    if (outputArg) {
      const outputDir = path.resolve(outputArg);
      await fs.writeFile(
        path.join(outputDir, "layout-reference-plan-v1.json"),
        `${JSON.stringify(compiledCampaign.layout_reference_plan, null, 2)}\n`,
      );
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
