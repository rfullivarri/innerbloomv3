import type { CurrentUserProfile } from './api';
import { resolveAvatarOption } from './avatarCatalog';
import {
  resolveAssetPathByTier,
  resolveSurfaceAssetTier,
  type AvatarAssetPayload,
} from './avatarAssetContract';

export type AvatarRhythm = 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE';

export type AvatarThemeTokens = {
  accent: string;
  chip: string;
};

export type AvatarMediaSurface = 'profile-card' | 'dashboard-menu' | 'onboarding' | 'missions' | 'chip';

export type AvatarMedia = {
  videoUrl: string | null;
  imageUrl: string | null;
  alt: string;
  isPlaceholder: boolean;
};

export type AvatarProfile = {
  avatarId: number | null;
  avatarCode: string;
  avatarName: string;
  theme: AvatarThemeTokens;
  isLegacyFallback: boolean;
  fallbackReason: 'none' | 'missing-avatar-payload';
  assetPayload: AvatarAssetPayload | null;
};

type DefaultAvatarFallback = {
  avatarCode: string;
  avatarName: string;
  avatarId: number;
  theme: AvatarThemeTokens;
  mediaByAvatarCode: Record<string, AvatarMedia>;
};

const LEGACY_MEDIA_BY_AVATAR_CODE: Record<string, AvatarMedia> = {
  RED_CAT: {
    videoUrl: '/avatars/low-basic.mp4',
    imageUrl: '/LowMood.jpg',
    alt: 'Legacy Red Cat avatar expression.',
    isPlaceholder: true,
  },
  GREEN_BEAR: {
    videoUrl: '/avatars/chill-basic.mp4',
    imageUrl: '/Chill-Mood.jpg',
    alt: 'Legacy Green Bear avatar expression.',
    isPlaceholder: true,
  },
  BLUE_AMPHIBIAN: {
    videoUrl: '/avatars/flow-basic.mp4',
    imageUrl: '/FlowMood.jpg',
    alt: 'Legacy Blue Amphibian avatar expression.',
    isPlaceholder: true,
  },
  VIOLET_OWL: {
    videoUrl: '/avatars/evolve-basic.mp4',
    imageUrl: '/Evolve-Mood.jpg',
    alt: 'Legacy Violet Owl avatar expression.',
    isPlaceholder: true,
  },
};

const DEFAULT_AVATAR_FALLBACK: DefaultAvatarFallback = {
  avatarId: 1,
  avatarCode: 'BLUE_AMPHIBIAN',
  avatarName: 'Blue Amphibian',
  theme: { accent: '#00C2FF', chip: 'aqua' },
  mediaByAvatarCode: LEGACY_MEDIA_BY_AVATAR_CODE,
};

const DEFAULT_RHYTHM: AvatarRhythm = 'FLOW';

function normalizeRhythm(value: string | null | undefined): AvatarRhythm {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'LOW' || normalized === 'CHILL' || normalized === 'FLOW' || normalized === 'EVOLVE') {
    return normalized;
  }

  return DEFAULT_RHYTHM;
}

function normalizeThemeTokens(raw: Record<string, unknown> | null): AvatarThemeTokens | null {
  if (!raw) {
    return null;
  }

  const accent = typeof raw.accent === 'string' ? raw.accent : null;
  const chip = typeof raw.chip === 'string' ? raw.chip : null;

  if (!accent || !chip) {
    return null;
  }

  return { accent, chip };
}

function resolveAssetPayload(profile: CurrentUserProfile): AvatarAssetPayload | null {
  return profile.avatar_assets ?? null;
}

export function resolveAvatarProfile(profile: CurrentUserProfile | null): AvatarProfile | null {
  if (!profile) {
    return null;
  }

  const hasAvatarCode = typeof profile.avatar_code === 'string' && profile.avatar_code.trim().length > 0;
  const hasAvatarName = typeof profile.avatar_name === 'string' && profile.avatar_name.trim().length > 0;
  const hasAvatarId = typeof profile.avatar_id === 'number';
  const shouldFallbackIdentity = !hasAvatarCode && !hasAvatarId;
  const canonicalOption = resolveAvatarOption({
    avatarId: hasAvatarId ? profile.avatar_id : null,
    avatarCode: hasAvatarCode ? profile.avatar_code!.trim() : DEFAULT_AVATAR_FALLBACK.avatarCode,
    avatarName: hasAvatarName ? profile.avatar_name!.trim() : DEFAULT_AVATAR_FALLBACK.avatarName,
    theme: DEFAULT_AVATAR_FALLBACK.theme,
    isLegacyFallback: false,
    fallbackReason: 'none',
    assetPayload: null,
  });
  const apiTheme = normalizeThemeTokens(profile.avatar_theme_tokens);

  return {
    avatarId: hasAvatarId ? profile.avatar_id : DEFAULT_AVATAR_FALLBACK.avatarId,
    avatarCode: hasAvatarCode ? profile.avatar_code!.trim() : DEFAULT_AVATAR_FALLBACK.avatarCode,
    avatarName: hasAvatarName ? profile.avatar_name!.trim() : DEFAULT_AVATAR_FALLBACK.avatarName,
    theme: {
      accent: canonicalOption.accent,
      chip: apiTheme?.chip ?? canonicalOption.chip,
    },
    isLegacyFallback: shouldFallbackIdentity,
    fallbackReason: shouldFallbackIdentity ? 'missing-avatar-payload' : 'none',
    assetPayload: resolveAssetPayload(profile),
  };
}

export function resolveAvatarTheme(profile: AvatarProfile | null): AvatarThemeTokens {
  if (!profile) {
    return DEFAULT_AVATAR_FALLBACK.theme;
  }

  const canonicalOption = resolveAvatarOption(profile);
  return {
    accent: canonicalOption.accent,
    chip: profile.theme?.chip ?? canonicalOption.chip,
  };
}

function resolveImageForSurface(profile: AvatarProfile | null, rhythm: AvatarRhythm): string | null {
  if (!profile) {
    return null;
  }

  const tier = resolveSurfaceAssetTier('dashboard-profile-rich');
  return resolveAssetPathByTier({
    avatarCode: profile.avatarCode,
    rhythm,
    tier,
    apiAssets: profile.assetPayload,
  });
}

export function resolveAvatarMedia(
  profile: AvatarProfile | null,
  options?: {
    rhythm?: string | null;
    surface?: AvatarMediaSurface;
  },
): AvatarMedia {
  const rhythm = normalizeRhythm(options?.rhythm);
  const selectedAvatarCode = resolveAvatarOption(profile).code;
  const fallbackMedia =
    DEFAULT_AVATAR_FALLBACK.mediaByAvatarCode[selectedAvatarCode] ??
    DEFAULT_AVATAR_FALLBACK.mediaByAvatarCode.BLUE_AMPHIBIAN;

  if (!profile) {
    return fallbackMedia;
  }

  const resolvedImage = resolveImageForSurface(profile, rhythm);

  return {
    ...fallbackMedia,
    imageUrl: resolvedImage ?? fallbackMedia.imageUrl,
    alt: `${profile.avatarName} expression for ${rhythm.toLowerCase()} rhythm`,
    isPlaceholder: profile.isLegacyFallback || Boolean(profile.assetPayload == null),
  };
}
