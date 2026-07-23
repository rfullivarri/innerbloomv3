import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadDriveFile } from '../src/services/marketingGoogleDriveService.js';

type RegistryAsset = {
  asset_key: string;
  drive_file_id: string;
  original_file_name?: string;
  mime_type?: string;
  status?: string;
};
type Job = { creative_direction?: { selected_asset_keys?: string[]; art_direction?: { scene_asset_key?: string } } };

const [campaignPath, registryPath, outputDir] = process.argv.slice(2);
if (!campaignPath || !registryPath || !outputDir) {
  throw new Error('Usage: tsx scripts/stage-marketing-drive-assets.ts <campaign.json> <asset-registry.json> <output-dir>');
}

const [campaign, registry] = await Promise.all([
  readJson<{ image_generation?: { jobs?: Job[] } }>(campaignPath),
  readJson<{ assets?: RegistryAsset[] }>(registryPath),
]);
const requiredKeys = new Set<string>(['brand_logo_512', 'brand_logo_full']);
for (const job of campaign.image_generation?.jobs ?? []) {
  for (const key of job.creative_direction?.selected_asset_keys ?? []) requiredKeys.add(key);
  const sceneKey = job.creative_direction?.art_direction?.scene_asset_key;
  if (sceneKey) requiredKeys.add(sceneKey);
}

// Phase 1 pilots are allowed to test the complete curated scene pack without
// rewriting campaign.json. Only approved/current scene plates are staged.
for (const asset of registry.assets ?? []) {
  if (asset.asset_key.startsWith('scene_') && (!asset.status || asset.status === 'approved_current')) {
    requiredKeys.add(asset.asset_key);
  }
}

if (requiredKeys.size <= 2) {
  throw new Error('No creative selected_asset_keys were found. Run the Creative Director before staging.');
}

const byKey = new Map((registry.assets ?? []).map((asset) => [asset.asset_key, asset]));
const missing = [...requiredKeys].filter((key) => !byKey.has(key));
if (missing.length) throw new Error(`Asset registry is missing: ${missing.join(', ')}`);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
const staged: Array<{ asset_key: string; file: string; drive_file_id: string; content_type: string }> = [];
for (const key of [...requiredKeys].sort()) {
  const asset = byKey.get(key)!;
  const result = await downloadDriveFile(asset.drive_file_id);
  const extension = extensionFor(asset.original_file_name ?? key, asset.mime_type ?? result.contentType);
  const file = `${safeName(key)}${extension}`;
  await fs.writeFile(path.join(outputDir, file), result.bytes);
  staged.push({ asset_key: key, file, drive_file_id: asset.drive_file_id, content_type: result.contentType });
  console.log(`staged ${key} -> ${file}`);
}
await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({ generated_at: new Date().toISOString(), assets: staged }, null, 2));

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T;
}
function safeName(value: string) { return value.replace(/[^a-z0-9._-]+/gi, '_'); }
function extensionFor(file: string, contentType: string) {
  const fromFile = path.extname(file);
  if (fromFile) return fromFile;
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('jpeg')) return '.jpg';
  if (contentType.includes('webp')) return '.webp';
  return '.bin';
}
