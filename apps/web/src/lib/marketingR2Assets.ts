import { apiAuthorizedFetch } from './api';
import type { MarketingAsset } from '../content/marketingAdminSeed';

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

type UploadAssetInput = {
  asset: MarketingAsset;
  campaignCode: string;
  postId: string;
};

type UploadMarketingAssetsResponse = {
  ok: boolean;
  assets: UploadedMarketingAsset[];
};

export function buildMarketingAssetKey({
  campaignCode,
  postId,
  file,
}: {
  campaignCode: string;
  postId: string;
  file: string;
}) {
  const safeCampaign = toSafeSegment(campaignCode);
  const safePost = toSafeSegment(postId);
  const safeFile = file.split('/').pop() ?? file;

  return `campaigns/${safeCampaign}/${safePost}/${safeFile}`;
}

export async function fetchMarketingR2Status() {
  const response = await apiAuthorizedFetch(`${getR2RoutePrefix()}/status`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`R2 status request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<MarketingR2Status>;
}

export async function uploadMarketingAssetsToR2(inputs: UploadAssetInput[]) {
  const assets = await Promise.all(
    inputs.map(async ({ asset, campaignCode, postId }) => {
      const fetchedAsset = await fetchAssetAsBase64(asset.url);
      return {
        key: buildMarketingAssetKey({
          campaignCode,
          postId,
          file: asset.file,
        }),
        contentBase64: fetchedAsset.contentBase64,
        contentType: fetchedAsset.contentType,
      };
    }),
  );

  const response = await apiAuthorizedFetch(`${getR2RoutePrefix()}/assets`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assets }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`R2 upload failed with HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<UploadMarketingAssetsResponse>;
}

async function fetchAssetAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Asset fetch failed with HTTP ${response.status}: ${url}`);
  }

  const blob = await response.blob();
  const contentType = blob.type || 'application/octet-stream';
  const contentBase64 = await blobToBase64(blob);

  return { contentBase64, contentType };
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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

function getR2RoutePrefix() {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';

  return `${origin}/api/admin/marketing/r2`;
}
