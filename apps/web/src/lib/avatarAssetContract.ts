import type { AvatarRhythm } from './avatarProfile';

export type AvatarAssetSurface =
  | 'avatar-picker'
  | 'rhythm-picker'
  | 'onboarding-rhythm'
  | 'dashboard-profile-rich'
  | 'profile-fallback';

export type AvatarAssetTier = 'avatar-base' | 'rhythm-placeholder' | 'avatar-rhythm-matrix' | 'avatar-rhythm-motion';

export type AvatarAssetFormat = 'png' | 'mp4';

export type AvatarAssetMatrixRecord = Partial<Record<AvatarRhythm, string | null>>;

export type AvatarAssetPayload = {
  base_image_url?: string | null;
  rhythm_placeholders?: AvatarAssetMatrixRecord | null;
  matrix_images?: AvatarAssetMatrixRecord | null;
  matrix_motion?: AvatarAssetMatrixRecord | null;
};

const ASSET_ROOT = '/avatars/v1';

function slugifyAssetToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeAvatarAssetCode(avatarCode: string | null | undefined): string {
  const normalized = slugifyAssetToken(avatarCode ?? '');
  return normalized || 'legacy-chill';
}

function normalizeRhythmToken(rhythm: AvatarRhythm): 'low' | 'chill' | 'flow' | 'evolve' {
  return rhythm.toLowerCase() as 'low' | 'chill' | 'flow' | 'evolve';
}

export function buildAvatarBaseStillPath(avatarCode: string): string {
  return `${ASSET_ROOT}/identity-base/avatar-${normalizeAvatarAssetCode(avatarCode)}-base.png`;
}

export function buildRhythmPlaceholderPath(rhythm: AvatarRhythm): string {
  return `${ASSET_ROOT}/rhythm-placeholder/rhythm-${normalizeRhythmToken(rhythm)}-placeholder.png`;
}

export function buildAvatarRhythmMatrixPath(avatarCode: string, rhythm: AvatarRhythm): string {
  return `${ASSET_ROOT}/matrix-image/avatar-${normalizeAvatarAssetCode(avatarCode)}-${normalizeRhythmToken(rhythm)}.png`;
}

export function buildAvatarRhythmMotionPath(avatarCode: string, rhythm: AvatarRhythm): string {
  return `${ASSET_ROOT}/matrix-motion/avatar-${normalizeAvatarAssetCode(avatarCode)}-${normalizeRhythmToken(rhythm)}.mp4`;
}

export function resolveSurfaceAssetTier(surface: AvatarAssetSurface): AvatarAssetTier {
  switch (surface) {
    case 'avatar-picker':
    case 'profile-fallback':
      return 'avatar-base';
    case 'rhythm-picker':
    case 'onboarding-rhythm':
      return 'rhythm-placeholder';
    case 'dashboard-profile-rich':
      return 'avatar-rhythm-matrix';
    default:
      return 'avatar-base';
  }
}

export function resolveAssetPathByTier(options: {
  avatarCode: string;
  rhythm: AvatarRhythm;
  tier: AvatarAssetTier;
  format?: AvatarAssetFormat;
  apiAssets?: AvatarAssetPayload | null;
}): string | null {
  const { avatarCode, rhythm, tier, format = 'png', apiAssets } = options;

  if (tier === 'avatar-base') {
    return apiAssets?.base_image_url ?? buildAvatarBaseStillPath(avatarCode);
  }

  if (tier === 'rhythm-placeholder') {
    return apiAssets?.rhythm_placeholders?.[rhythm] ?? buildRhythmPlaceholderPath(rhythm);
  }

  if (tier === 'avatar-rhythm-matrix') {
    return apiAssets?.matrix_images?.[rhythm] ?? buildAvatarRhythmMatrixPath(avatarCode, rhythm);
  }

  if (tier === 'avatar-rhythm-motion') {
    return apiAssets?.matrix_motion?.[rhythm] ?? (format === 'mp4' ? buildAvatarRhythmMotionPath(avatarCode, rhythm) : null);
  }

  return null;
}

export const AVATAR_ASSET_FOLDERS = {
  root: ASSET_ROOT,
  identityBase: `${ASSET_ROOT}/identity-base`,
  rhythmPlaceholder: `${ASSET_ROOT}/rhythm-placeholder`,
  matrixImage: `${ASSET_ROOT}/matrix-image`,
  matrixMotion: `${ASSET_ROOT}/matrix-motion`,
} as const;
