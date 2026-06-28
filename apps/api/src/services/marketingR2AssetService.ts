import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { HttpError } from '../lib/http-error.js';

export type MarketingR2AssetUpload = {
  key: string;
  contentBase64: string;
  contentType?: string;
};

export type MarketingR2UploadedAsset = {
  key: string;
  size: number;
  url: string;
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
    const bytes = parseBase64Asset(asset.contentBase64);

    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      throw new HttpError(400, 'invalid_asset_size', `Invalid asset size for ${key}.`);
    }

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: normalizeContentType(asset.contentType),
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

function normalizeContentType(value: string | undefined) {
  const contentType = String(value || 'application/octet-stream').trim().toLowerCase();

  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) {
    return 'application/octet-stream';
  }

  return contentType;
}
