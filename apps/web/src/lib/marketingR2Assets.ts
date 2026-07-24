import { apiAuthorizedFetch } from './api';
import type { MarketingAsset } from '../content/marketingAdminSeed';

const R2_UPLOAD_BATCH_SIZE = 10;

export type MarketingR2Status = {
  ok: boolean;
  configured: boolean;
  missing: string[];
  bucket: string | null;
  publicBaseUrl: string | null;
};

export type UploadedMarketingAsset = {
  key: string;
  size: number;
  url: string;
};

export type MarketingMediaValidation = {
  url: string;
  ok: boolean;
  status?: number;
  contentType?: string;
  reason?: string;
};

type UploadAssetInput = { asset: MarketingAsset; campaignCode: string; postId: string };
type UploadMarketingAssetsResponse = { ok: boolean; assets: UploadedMarketingAsset[] };
type PreparedMarketingAsset = { key: string; sourceUrl?: string; contentBase64?: string; contentType?: string };

export function buildMarketingAssetKey({ campaignCode, postId, file }: { campaignCode: string; postId: string; file: string }) {
  const safeCampaign = toSafeSegment(campaignCode);
  const safePost = toSafeSegment(postId);
  const safeFile = file.split('/').pop() ?? file;
  return `campaigns/${safeCampaign}/${safePost}/${safeFile}`;
}

export async function fetchMarketingR2Status() {
  const response = await apiAuthorizedFetch('/admin/marketing/r2/status', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`R2 status request failed with HTTP ${response.status}`);
  return response.json() as Promise<MarketingR2Status>;
}

export async function validateMarketingMedia(urls: string[]) {
  const response = await apiAuthorizedFetch('/admin/marketing/r2/validate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Media validation failed with HTTP ${response.status}: ${body}`);
  }
  return response.json() as Promise<{ ok: boolean; assets: MarketingMediaValidation[] }>;
}

export async function uploadMarketingAssetsToR2(inputs: UploadAssetInput[]) {
  if (inputs.length === 0) return { ok: true, assets: [] } satisfies UploadMarketingAssetsResponse;
  const uploadedAssets: UploadedMarketingAsset[] = [];
  for (let start = 0; start < inputs.length; start += R2_UPLOAD_BATCH_SIZE) {
    const batchInputs = inputs.slice(start, start + R2_UPLOAD_BATCH_SIZE);
    const assets = await Promise.all(batchInputs.map(prepareMarketingAsset));
    const batchNumber = Math.floor(start / R2_UPLOAD_BATCH_SIZE) + 1;
    const batchCount = Math.ceil(inputs.length / R2_UPLOAD_BATCH_SIZE);
    const response = await apiAuthorizedFetch('/admin/marketing/r2/assets', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`R2 upload batch ${batchNumber}/${batchCount} failed with HTTP ${response.status}: ${body}`);
    }
    const result = await response.json() as UploadMarketingAssetsResponse;
    uploadedAssets.push(...result.assets);
  }
  return { ok: true, assets: uploadedAssets } satisfies UploadMarketingAssetsResponse;
}

export function isMarketingAssetStoredOnR2(assetUrl: string, publicBaseUrl: string | null | undefined) {
  const normalizedBaseUrl = String(publicBaseUrl ?? '').trim().replace(/\/+$/, '');
  return Boolean(normalizedBaseUrl && assetUrl.trim().startsWith(`${normalizedBaseUrl}/`));
}

async function prepareMarketingAsset({ asset, campaignCode, postId }: UploadAssetInput): Promise<PreparedMarketingAsset> {
  const basePayload = { key: buildMarketingAssetKey({ campaignCode, postId, file: asset.file }) };
  const sourceUrl = asset.sourceUrl || asset.url;
  if (/^https?:\/\//i.test(sourceUrl)) return { ...basePayload, sourceUrl };
  const fetchedAsset = await fetchAssetAsBase64(sourceUrl);
  return { ...basePayload, contentBase64: fetchedAsset.contentBase64, contentType: fetchedAsset.contentType };
}

async function fetchAssetAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset fetch failed with HTTP ${response.status}: ${url}`);
  const blob = await response.blob();
  return { contentBase64: await blobToBase64(blob), contentType: blob.type || 'application/octet-stream' };
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read asset.'));
    reader.readAsDataURL(blob);
  });
}

function toSafeSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
}
