import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadDriveFile } from '../src/services/marketingGoogleDriveService.js';
const [campaignPath, outputDir] = process.argv.slice(2);
if (!campaignPath || !outputDir) throw new Error('Usage: stage-supplied-marketing-drive-assets.ts <campaign.json> <output-dir>');
const campaign = JSON.parse(await fs.readFile(campaignPath, 'utf8')) as { campaign: { brand_logo_drive_file_id: string }; stories: Array<{ post_code: string; source_drive_file_id: string; source_file_name: string }> };
await fs.mkdir(outputDir, { recursive: true });
const assets: Array<{ post_code: string; source_file: string; logo_file: string }> = [];
const logo = await downloadDriveFile(campaign.campaign.brand_logo_drive_file_id);
await fs.writeFile(path.join(outputDir, 'brand-logo.png'), logo.bytes);
for (const story of campaign.stories) { const result = await downloadDriveFile(story.source_drive_file_id); const ext = path.extname(story.source_file_name) || (result.contentType.includes('png') ? '.png' : '.jpg'); const file = `${story.post_code}-base${ext}`; await fs.writeFile(path.join(outputDir, file), result.bytes); assets.push({ post_code: story.post_code, source_file: file, logo_file: 'brand-logo.png' }); }
await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({ assets }, null, 2));
