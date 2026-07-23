import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const campaignCode = process.argv[2] || process.env.CAMPAIGN_CODE || 'ib_202607';
const artifactSourceDir = String(process.argv[3] || process.env.REPAIR_SOURCE_DIR || '').trim();

const required = [
  'DATABASE_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
];
for (const key of required) {
  if (!String(process.env[key] || '').trim()) throw new Error(`${key} is required`);
}

function cleanR2Value(key) {
  return String(process.env[key] || '').replace(/[\r\n\u2028\u2029]+/g, '').trim();
}

const r2AccountId = cleanR2Value('R2_ACCOUNT_ID');
const r2AccessKeyId = cleanR2Value('R2_ACCESS_KEY_ID');
const r2SecretAccessKey = cleanR2Value('R2_SECRET_ACCESS_KEY');
const r2Bucket = cleanR2Value('R2_BUCKET');
const publicBaseUrl = cleanR2Value('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');

for (const [name, value] of Object.entries({
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: r2AccessKeyId,
  R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
  R2_BUCKET: r2Bucket,
  R2_PUBLIC_BASE_URL: publicBaseUrl,
})) {
  if (!value) throw new Error(`${name} is empty after removing whitespace and line breaks`);
}

const artifactFiles = artifactSourceDir ? await indexArtifactFiles(artifactSourceDir) : new Map();
if (artifactSourceDir && artifactFiles.size === 0) {
  throw new Error(`No PNG/JPEG/WebP files were found in artifact source directory: ${artifactSourceDir}`);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  const result = await db.query(
    `SELECT mp.marketing_post_id, mp.post_code, mp.asset_urls
       FROM marketing_posts mp
       JOIN marketing_campaigns mc ON mc.marketing_campaign_id = mp.marketing_campaign_id
      WHERE mc.campaign_code = $1
        AND mp.status = 'approved'
      ORDER BY mp.post_code`,
    [campaignCode],
  );

  let repaired = 0;
  let skipped = 0;
  let restoredFromArtifact = 0;
  const failures = [];
  const warnings = [];

  for (const row of result.rows) {
    const assets = Array.isArray(row.asset_urls) ? row.asset_urls : [];
    const nextAssets = [];

    for (let index = 0; index < assets.length; index += 1) {
      const asset = { ...assets[index] };
      try {
        const fileName = chooseFileName(asset, row.post_code, index);
        const localFile = artifactFiles.get(fileName.toLowerCase());
        let image;

        if (localFile) {
          image = validateImage(await readFile(localFile), mimeFromExtension(fileName));
          restoredFromArtifact += 1;
        } else {
          const source = chooseSource(asset);
          if (!source) {
            warnings.push(`${row.post_code}[${index}]: File ${fileName} was not found in the render artifact and no recoverable source exists in Neon. Re-upload or remove this asset in Admin.`);
            nextAssets.push(asset);
            skipped += 1;
            continue;
          }
          image = await readImage(source);
        }

        const key = `campaigns/${safeSegment(campaignCode)}/${safeSegment(row.post_code)}/${fileName}`;
        await s3.send(new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Body: image.bytes,
          ContentType: image.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        const url = `${publicBaseUrl}/${key}`;
        nextAssets.push({
          ...asset,
          file: fileName,
          url,
          previewUrl: url,
          selected: asset.selected !== false,
        });
        repaired += 1;
        console.log(`repaired ${row.post_code} ${index + 1}/${assets.length}: ${url}`);
      } catch (error) {
        failures.push(`${row.post_code}[${index}]: ${error instanceof Error ? error.message : String(error)}`);
        nextAssets.push(asset);
        skipped += 1;
      }
    }

    await db.query(
      `UPDATE marketing_posts SET asset_urls = $2::jsonb, updated_at = NOW() WHERE marketing_post_id = $1`,
      [row.marketing_post_id, JSON.stringify(nextAssets)],
    );
  }

  console.log(JSON.stringify({
    campaignCode,
    posts: result.rowCount,
    artifactSourceDir: artifactSourceDir || null,
    artifactImagesIndexed: artifactFiles.size,
    restoredFromArtifact,
    repaired,
    skipped,
    warnings,
    failures,
  }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await db.end();
}

async function indexArtifactFiles(rootDir) {
  const files = new Map();
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
        const key = entry.name.toLowerCase();
        if (files.has(key)) throw new Error(`Duplicate artifact filename found: ${entry.name}`);
        files.set(key, fullPath);
      }
    }
  }
  await walk(rootDir);
  return files;
}

function chooseFileName(asset, postCode, index) {
  const candidates = [asset.file, filenameFromUrl(asset.url), filenameFromUrl(asset.previewUrl), filenameFromUrl(asset.sourceUrl)];
  for (const value of candidates) {
    const name = String(value || '').split('/').pop()?.trim();
    if (name && !name.startsWith('data:') && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|webp)$/i.test(name)) {
      return name;
    }
  }
  return `asset_${safeSegment(postCode)}_${String(index + 1).padStart(2, '0')}.png`;
}

function filenameFromUrl(value) {
  try { return new URL(String(value || '')).pathname.split('/').pop() || ''; } catch { return ''; }
}

function chooseSource(asset) {
  const values = [asset.previewUrl, asset.sourceUrl, asset.url];
  return values.find((value) => /^data:image\//i.test(String(value || '')))
    || values.find((value) => /^https?:\/\//i.test(String(value || '')) && !String(value).startsWith(`${publicBaseUrl}/`));
}

async function readImage(source) {
  const value = String(source);
  if (value.startsWith('data:')) {
    const match = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match) throw new Error('Unsupported data image');
    return validateImage(Buffer.from(match[2], 'base64'), normalizeMime(match[1]));
  }

  const response = await fetch(value, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return validateImage(Buffer.from(await response.arrayBuffer()), response.headers.get('content-type'));
}

function validateImage(bytes, declaredType) {
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error(`Invalid image size ${bytes.length}`);
  const detected = detectMime(bytes);
  if (!detected) throw new Error('Content is not PNG, JPEG, or WebP');
  return { bytes, contentType: detected || normalizeMime(declaredType) };
}

function detectMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function mimeFromExtension(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return '';
}

function normalizeMime(value) {
  const type = String(value || '').split(';')[0].trim().toLowerCase();
  return type === 'image/jpg' ? 'image/jpeg' : type;
}

function safeSegment(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
}
