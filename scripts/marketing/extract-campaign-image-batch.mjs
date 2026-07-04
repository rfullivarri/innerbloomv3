#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const period = process.argv[2] || '2026-07';
const batch = Number(process.argv[3] || '1');

if (!Number.isInteger(batch) || batch < 1) {
  throw new Error(`Invalid batch number: ${process.argv[3]}`);
}

const campaignPath = path.join('marketing', 'agent-outputs', period, 'campaign.json');
const outDir = path.join('marketing', 'agent-outputs', period, 'image-batches');
const outPath = path.join(outDir, `batch-${String(batch).padStart(2, '0')}.json`);

const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const jobs = campaign.image_generation?.jobs?.filter((job) => job.batch_number === batch) || [];

if (!jobs.length) {
  throw new Error(`No image_generation.jobs found for period ${period} batch ${batch}`);
}

const postCodes = [...new Set(jobs.map((job) => job.post_code))];
const assetCodes = [...new Set(jobs.map((job) => job.asset_code))];
const sourceAssetKeys = [
  ...new Set(
    jobs.flatMap((job) => (job.source_assets || []).map((asset) => asset.asset_key).filter(Boolean)),
  ),
];

const posts = (campaign.posts || [])
  .filter((post) => postCodes.includes(post.post_code))
  .map((post) => ({
    post_code: post.post_code,
    format: post.format,
    status: post.status,
    content_pillar: post.content_pillar,
    funnel_stage: post.funnel_stage,
    hook: post.hook,
    visible_copy_plan: post.visible_copy_plan,
    visual_strategy: post.visual_strategy,
    carousel: post.carousel,
    assets: (post.assets || []).filter((asset) => assetCodes.includes(asset.asset_code)),
  }));

const output = {
  schema_version: 'asset_producer_batch_v1',
  period_key: campaign.period_key,
  campaign: campaign.campaign,
  batch_number: batch,
  batch_size: campaign.image_generation?.batch_size,
  staging_root: campaign.image_generation?.staging_root,
  source_asset_keys_needed: sourceAssetKeys,
  posts,
  jobs,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(outPath);
console.log(`jobs=${jobs.length}`);
console.log(`source_assets=${sourceAssetKeys.join(',') || 'none'}`);
