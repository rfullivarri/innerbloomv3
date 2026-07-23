import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { HttpError } from '../lib/http-error.js';

export type MarketingR2AssetUpload = {
  key: string;
  contentBase64?: string;
  sourceUrl?: string;
  contentType?: string;
};

export type MarketingR2UploadedAsset = {
  key: string;
  size: number;
  url: string;
};

export type MarketingR2AssetValidation = {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: number | null;
  reason: string | null;
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  configured: boolean;
  missing: string[];
};

let r2Client: S3Client | null = null;

export function getMarketingR2Status() {
  const config = getR2Config();

  return {
    configured: config.configured,
    missing: config.missing,
    bucket: config.bucket || null,
    publicBaseUrl: config.publicBaseUrl || null,
  };
}

export async function uploadMarketingR2Assets(assets: MarketingR2AssetUpload[]) {
  if (assets.length === 0 || assets.length > 10) {
    throw new HttpError(400, 'invalid_assets', 'Expected 1-10 assets.');
  }

  const config = getR2Config();
  if (!config.configured) {
    throw new HttpError(503, 'r2_not_configured', 'R2 is not configured.', {
      missing: config.missing,
    });
  }

  const client = getR2Client(config);
  const uploaded: MarketingR2UploadedAsset[] = [];

  for (const asset of assets) {
    const key = sanitizeAssetKey(asset.key);
    const source = await readAssetBytes(asset);
    const bytes = source.bytes;

    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      throw new HttpError(400, 'invalid_asset_size', `Invalid asset size for ${key}.`);
    }

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: normalizeContentType(asset.contentType ?? source.contentType),
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    uploaded.push({
      key,
      size: bytes.length,
      url: `${config.publicBaseUrl}/${key}`,
    });
  }

  return uploaded;
}

export async function validateMarketingR2AssetUrls(urls: string[]) {
  const uniqueUrls = [...new Set(urls.map((value) => String(value || '').trim()).filter(Boolean))];
  if (uniqueUrls.length === 0 || uniqueUrls.length > 100) {
    throw new HttpError(400, 'invalid_asset_urls', 'Expected 1-100 asset URLs.');
  }

  const config = getR2Config();
  const results: MarketingR2AssetValidation[] = [];

  for (let start = 0; start < uniqueUrls.length; start += 8) {
    const batch = uniqueUrls.slice(start, start + 8);
    results.push(...await Promise.all(batch.map((url) => validatePublicAssetUrl(url, config.publicBaseUrl))));
  }

  return results;
}

async function validatePublicAssetUrl(urlValue: string, expectedBaseUrl: string): Promise<MarketingR2AssetValidation> {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return invalidValidation(urlValue, 'invalid_url');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return invalidValidation(urlValue, 'unsupported_protocol');
  }

  if (expectedBaseUrl && !url.toString().startsWith(`${expectedBaseUrl}/`)) {
    return invalidValidation(urlValue, 'not_r2_public_url');
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1023',
        Accept: 'image/*',
        'User-Agent': 'Innerbloom-Metricool-Media-Validator/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get('content-type');
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    const statusOk = response.status === 200 || response.status === 206;
    const typeOk = isSupportedImageContentType(contentType ?? undefined);
    const lengthOk = contentLength === null || (Number.isFinite(contentLength) && contentLength > 0);

    // Consume only the small range response so the connection closes cleanly.
    await response.arrayBuffer();

    return {
      url: urlValue,
      ok: statusOk && typeOk && lengthOk,
      status: response.status,
      contentType,
      contentLength,
      reason: !statusOk ? `http_${response.status}` : !typeOk ? 'not_an_image' : !lengthOk ? 'empty_asset' : null,
    };
  } catch (error) {
    return {
      url: urlValue,
      ok: false,
      status: null,
      contentType: null,
      contentLength: null,
      reason: error instanceof Error ? error.message : 'asset_fetch_failed',
    };
  }
}

function invalidValidation(url: string, reason: string): MarketingR2AssetValidation {
  return {
    url,
    ok: false,
    status: null,
    contentType: null,
    contentLength: null,
    reason,
  };
}

function getR2Config(): R2Config {
  const config = {
    accountId: readEnv('R2_ACCOUNT_ID'),
    accessKeyId: readEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: readEnv('R2_SECRET_ACCESS_KEY'),
    bucket: readEnv('R2_BUCKET'),
    publicBaseUrl: normalizeBaseUrl(readEnv('R2_PUBLIC_BASE_URL')),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    ...config,
    configured: missing.length === 0,
    missing,
  };
}

function getR2Client(config: R2Config) {
  if (!r2Client) {
    r2Client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      region: 'auto',
    });
  }

  return r2Client;
}

function readEnv(key: string) {
  return String(process.env[key] || '').trim();
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function sanitizeAssetKey(value: string) {
  const key = String(value || '').trim().replace(/^\/+/, '');

  if (
    !key
    || key.includes('..')
    || key.length > 240
    || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key)
  ) {
    throw new HttpError(400, 'invalid_asset_key', `Invalid asset key: ${value}`);
  }

  return key;
}

function parseBase64Asset(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/^data:([^;,]+);base64,(.+)$/);
  const base64 = match ? match[2] : text;

  try {
    return Buffer.from(base64, 'base64');
  } catch {
    throw new HttpError(400, 'invalid_asset_content', 'Invalid base64 asset content.');
  }
}

async function readAssetBytes(asset: MarketingR2AssetUpload) {
  if (asset.contentBase64) {
    return {
      bytes: parseBase64Asset(asset.contentBase64),
      contentType: asset.contentType,
    };
  }

  if (!asset.sourceUrl) {
    throw new HttpError(400, 'invalid_asset_content', 'contentBase64 or sourceUrl is required.');
  }

  const url = normalizeSourceUrl(asset.sourceUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new HttpError(400, 'asset_source_fetch_failed', `Asset fetch failed with HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') ?? asset.contentType;
  if (!isSupportedImageContentType(contentType)) {
    throw new HttpError(400, 'invalid_asset_source_type', `Asset source did not return an image. Content-Type: ${contentType || 'unknown'}.`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    bytes: Buffer.from(arrayBuffer),
    contentType,
  };
}

function normalizeSourceUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, 'invalid_asset_source_url', 'Invalid asset source URL.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new HttpError(400, 'invalid_asset_source_url', 'Asset source URL must be HTTP or HTTPS.');
  }

  const driveFileId = extractGoogleDriveFileId(url);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}`;
  }

  return url.toString();
}

function extractGoogleDriveFileId(url: URL) {
  const host = url.hostname.toLowerCase();
  if (!host.endsWith('drive.google.com')) {
    return null;
  }

  const idParam = url.searchParams.get('id');
  if (idParam) {
    return idParam;
  }

  const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (filePathMatch?.[1]) {
    return filePathMatch[1];
  }

  const directPathMatch = url.pathname.match(/\/d\/([^/]+)/);
  if (directPathMatch?.[1]) {
    return directPathMatch[1];
  }

  return null;
}

function isSupportedImageContentType(value: string | undefined) {
  const contentType = String(value || '').split(';')[0].trim().toLowerCase();
  return contentType.startsWith('image/');
}

function normalizeContentType(value: string | undefined) {
  const contentType = String(value || 'application/octet-stream').trim().toLowerCase();

  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) {
    return 'application/octet-stream';
  }

  return contentType;
}
