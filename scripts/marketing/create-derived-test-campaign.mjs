import fs from 'node:fs/promises';
import path from 'node:path';

const [configPath, outputPath] = process.argv.slice(2);
if (!configPath || !outputPath) throw new Error('Usage: node create-derived-test-campaign.mjs <config.json> <output.json>');

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const sourcePath = String(config.source_campaign_path || '').trim();
const campaignCode = String(config.campaign_code || '').trim();
const periodKey = String(config.period_key || '').trim();
const postCount = Number(config.post_count);
if (!sourcePath || !campaignCode || !/^\d{4}-\d{2}$/.test(periodKey)) throw new Error('Invalid test campaign config');
if (!Number.isInteger(postCount) || postCount < 1 || postCount > 10) throw new Error('post_count must be between 1 and 10');

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const selectedPosts = (source.posts || []).slice(0, postCount);
if (selectedPosts.length !== postCount) throw new Error('Source campaign does not contain enough posts');

const selectedPostCodes = new Set(selectedPosts.map((post) => post.post_code));
const selectedAssetCodes = new Set(selectedPosts.flatMap((post) => (post.assets || []).map((asset) => asset.asset_code).filter(Boolean)));
const targetMonth = periodKey.slice(0, 7);
const sourceCampaignCode = source.campaign?.campaign_code || '';
const sourcePeriodKey = source.period_key || '';

const derived = filterDocument(structuredClone(source));
derived.period_key = periodKey;
derived.generated_at = new Date().toISOString();
derived.campaign = {
  ...derived.campaign,
  campaign_code: campaignCode,
  title: `${derived.campaign?.title || 'Innerbloom campaign'} — test`,
  target_post_count: postCount,
  publishing_start_date: `${targetMonth}-01`,
  publishing_end_date: `${targetMonth}-31`,
};
derived.posts = selectedPosts.map((post, index) => {
  const copy = structuredClone(post);
  const day = String(4 + index * 2).padStart(2, '0');
  copy.sequence_number = index + 1;
  copy.scheduled_at = `${targetMonth}-${day}T10:00:00+02:00`;
  return copy;
});

if (derived.campaign_execution_summary) {
  const staticCount = derived.posts.filter((post) => post.format !== 'carousel').length;
  const carouselCount = derived.posts.filter((post) => post.format === 'carousel').length;
  const imageCount = derived.posts.reduce((sum, post) => sum + (post.assets?.length || 0), 0);
  derived.campaign_execution_summary = {
    ...derived.campaign_execution_summary,
    post_count: postCount,
    static_count: staticCount,
    carousel_count: carouselCount,
    image_job_count: imageCount,
    batch_count: Math.ceil(imageCount / Number(derived.campaign_execution_summary.batch_size || 10)),
    notes: [`Derived test campaign from ${sourcePath}; source campaign was not modified.`],
  };
}

rewriteStrings(derived);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(derived, null, 2)}\n`);
console.log(`Created ${campaignCode} with ${postCount} posts at ${outputPath}`);

function filterDocument(value) {
  if (Array.isArray(value)) {
    if (value.length && value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      if (value.every((item) => 'post_code' in item)) return value.filter((item) => selectedPostCodes.has(item.post_code)).map(filterDocument);
      if (value.every((item) => 'asset_code' in item)) return value.filter((item) => selectedAssetCodes.has(item.asset_code)).map(filterDocument);
    }
    return value.map(filterDocument);
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, filterDocument(child)]));
  return value;
}

function rewriteStrings(value) {
  if (Array.isArray(value)) return value.forEach(rewriteStrings);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') {
      value[key] = child.replaceAll(sourceCampaignCode, campaignCode).replaceAll(sourcePeriodKey, periodKey).replace(/2026-07-(\d{2})/g, `${targetMonth}-$1`);
    } else rewriteStrings(child);
  }
}
