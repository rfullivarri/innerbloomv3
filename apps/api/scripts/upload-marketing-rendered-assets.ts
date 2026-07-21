import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadDriveImage } from '../src/services/marketingGoogleDriveService.js';

const [renderDir, outputPath] = process.argv.slice(2);
const folderId = String(process.env.MARKETING_DRIVE_STAGING_FOLDER_ID ?? '').trim();
if (!renderDir || !outputPath) {
  throw new Error('Usage: tsx scripts/upload-marketing-rendered-assets.ts <render-dir> <output-manifest.json>');
}
if (!folderId) throw new Error('MARKETING_DRIVE_STAGING_FOLDER_ID is required to upload rendered previews.');

const files = (await fs.readdir(renderDir)).filter((file) => /\.png$/i.test(file)).sort();
if (!files.length) throw new Error(`No PNG files found in ${renderDir}`);

const assets = [];
for (const file of files) {
  const bytes = await fs.readFile(path.join(renderDir, file));
  const uploaded = await uploadDriveImage({
    name: file,
    bytes,
    contentType: 'image/png',
    parentFolderId: folderId,
  });
  assets.push({
    file,
    drive_file_id: uploaded.id,
    source_url: `https://drive.google.com/uc?export=download&id=${uploaded.id}`,
    preview_url: uploaded.thumbnailLink ?? `https://drive.google.com/thumbnail?id=${uploaded.id}&sz=w1200`,
    web_view_url: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
  });
  console.log(`uploaded ${file}`);
}
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), assets }, null, 2));
