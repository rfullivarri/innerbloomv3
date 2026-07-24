import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const [campaignPath, renderDir, outputPath, runIdArg] = process.argv.slice(2);
if (!campaignPath || !renderDir || !outputPath || !runIdArg) {
  throw new Error('Usage: node upload-rendered-assets-to-r2.mjs <campaign.json> <render-dir> <output.json> <run-id>');
}

const cleanEnv = (key, { compact = false } = {}) => {
  const raw = String(process.env[key] || '').trim();
  const value = compact ? raw.replace(/[\r\n\t ]+/g, '') : raw.replace(/[\r\n]+/g, '').trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const accountId = cleanEnv('R2_ACCOUNT_ID', { compact: true });
const accessKeyId = cleanEnv('R2_ACCESS_KEY_ID', { compact: true });
const secretAccessKey = cleanEnv('R2_SECRET_ACCESS_KEY', { compact: true });
const bucket = cleanEnv('R2_BUCKET');
const publicBaseUrl = cleanEnv('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
const runId = safeSegment(runIdArg);

const campaignDocument = JSON.parse(await fs.readFile(campaignPath, 'utf8'));
const campaignCode = safeSegment(campaignDocument?.campaign?.campaign_code || campaignDocument?.campaign_code);
if (!campaignCode) throw new Error(`campaign_code is missing from ${campaignPath}`);

const files = (await fs.readdir(renderDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();
if (!files.length) throw new Error(`No rendered PNG/JPEG/WebP files found in ${renderDir}`);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const assets = [];
for (const file of files) {
  const filePath = path.join(renderDir, file);
  const bytes = await fs.readFile(filePath);
  const contentType = detectMime(bytes);
  if (!contentType) throw new Error(`${file} is not a valid PNG, JPEG, or WebP image`);
  if (bytes.length > 12 * 1024 * 1024) throw new Error(`${file} exceeds the 12 MB upload limit`);

  const postCode = postCodeFromFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `marketing-renders/${campaignCode}/${runId}/${postCode}/${safeFileName(file)}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    ContentLength: bytes.length,
    CacheControl: 'public, max-age=31536000, immutable',
    ContentDisposition: `inline; filename="${safeFileName(file)}"`,
    Metadata: {
      campaign: campaignCode,
      post: postCode,
      run: runId,
      sha256,
    },
  }));

  const publicUrl = `${publicBaseUrl}/${key}?v=${sha256.slice(0, 16)}`;
  const verification = await verifyPublicImage(publicUrl, sha256);
  assets.push({
    file,
    post_code: postCode,
    r2_key: key,
    public_url: publicUrl,
    mime_type: contentType,
    size_bytes: bytes.length,
    sha256,
    storage_status: 'verified',
    verified_at: verification.verifiedAt,
  });
  console.log(`uploaded and verified ${file}: ${publicUrl}`);
}

const manifest = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  campaign_code: campaignCode,
  github_run_id: runIdArg,
  storage_provider: 'cloudflare_r2',
  public_base_url: publicBaseUrl,
  asset_count: assets.length,
  assets,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Created verified R2 manifest with ${assets.length} assets at ${outputPath}`);

async function verifyPublicImage(url, expectedSha256) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: { Accept: 'image/png,image/jpeg,image/webp,*/*;q=0.1' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const mime = detectMime(bytes);
      const declared = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!mime) throw new Error(`public response is not an image (${declared || 'missing content-type'})`);
      if (!declared.startsWith('image/')) throw new Error(`public content-type is ${declared || 'missing'}`);
      const actualSha256 = createHash('sha256').update(bytes).digest('hex');
      if (actualSha256 !== expectedSha256) throw new Error('public checksum does not match uploaded file');
      return { verifiedAt: new Date().toISOString() };
    } catch (error) {
      lastError = error;
      if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw new Error(`R2 public verification failed for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function detectMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function postCodeFromFile(file) {
  const match = file.match(/(?:^|_)(post_\d+)(?:_|\.)/i);
  if (!match) throw new Error(`Cannot derive post code from rendered filename: ${file}`);
  return safeSegment(match[1]);
}

function safeSegment(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeFileName(value) {
  const name = path.basename(String(value || '')).replace(/[^a-zA-Z0-9._-]+/g, '-');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|webp)$/i.test(name)) {
    throw new Error(`Unsafe rendered filename: ${value}`);
  }
  return name;
}
