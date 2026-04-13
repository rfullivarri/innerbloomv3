import type { CurrentUserProfile } from './api';

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
};

type DefaultAvatarFallback = {
  avatarCode: string;
  avatarName: string;
  avatarId: number;
  theme: AvatarThemeTokens;
  media: Record<AvatarRhythm, AvatarMedia>;
};

const LEGACY_MEDIA_BY_RHYTHM: Record<AvatarRhythm, AvatarMedia> = {
  LOW: {
    videoUrl: '/avatars/low-basic.mp4',
    imageUrl: '/LowMood.jpg',
    alt: 'Legacy avatar expression for Low rhythm.',
    isPlaceholder: true,
  },
  CHILL: {
    videoUrl: '/avatars/chill-basic.mp4',
    imageUrl: '/Chill-Mood.jpg',
    alt: 'Legacy avatar expression for Chill rhythm.',
    isPlaceholder: true,
  },
  FLOW: {
    videoUrl: '/avatars/flow-basic.mp4',
    imageUrl: '/FlowMood.jpg',
    alt: 'Legacy avatar expression for Flow rhythm.',
    isPlaceholder: true,
  },
  EVOLVE: {
    videoUrl: '/avatars/evolve-basic.mp4',
    imageUrl: '/Evolve-Mood.jpg',
    alt: 'Legacy avatar expression for Evolve rhythm.',
    isPlaceholder: true,
  },
};

const DEFAULT_AVATAR_FALLBACK: DefaultAvatarFallback = {
  avatarId: 1,
  avatarCode: 'BLUE_AMPHIBIAN',
  avatarName: 'Blue Amphibian',
  theme: { accent: '#00C2FF', chip: 'aqua' },
  media: LEGACY_MEDIA_BY_RHYTHM,
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

export function resolveAvatarProfile(profile: CurrentUserProfile | null): AvatarProfile | null {
  if (!profile) {
    return null;
  }

  const hasAvatarCode = typeof profile.avatar_code === 'string' && profile.avatar_code.trim().length > 0;
  const hasAvatarName = typeof profile.avatar_name === 'string' && profile.avatar_name.trim().length > 0;
  const hasAvatarId = typeof profile.avatar_id === 'number';
  const shouldFallbackIdentity = !hasAvatarCode && !hasAvatarId;
  const apiTheme = normalizeThemeTokens(profile.avatar_theme_tokens);

  return {
    avatarId: hasAvatarId ? profile.avatar_id : DEFAULT_AVATAR_FALLBACK.avatarId,
    avatarCode: hasAvatarCode ? profile.avatar_code!.trim() : DEFAULT_AVATAR_FALLBACK.avatarCode,
    avatarName: hasAvatarName ? profile.avatar_name!.trim() : DEFAULT_AVATAR_FALLBACK.avatarName,
    theme: apiTheme ?? DEFAULT_AVATAR_FALLBACK.theme,
    isLegacyFallback: shouldFallbackIdentity,
    fallbackReason: shouldFallbackIdentity ? 'missing-avatar-payload' : 'none',
  };
}

export function resolveAvatarTheme(profile: AvatarProfile | null): AvatarThemeTokens {
  return profile?.theme ?? DEFAULT_AVATAR_FALLBACK.theme;
}

export function resolveAvatarMedia(
  profile: AvatarProfile | null,
  options?: {
    rhythm?: string | null;
    surface?: AvatarMediaSurface;
  },
): AvatarMedia {
  const rhythm = normalizeRhythm(options?.rhythm);
  const fallbackMedia = LEGACY_MEDIA_BY_RHYTHM[rhythm];

  if (!profile) {
    return fallbackMedia;
  }

  // Phase-safe behavior: until avatar asset catalogs are wired into API,
  // always return deterministic placeholder-safe media keyed by rhythm.
  // This keeps visual reads centralized while avoiding hard asset dependency.
  return {
    ...fallbackMedia,
    alt: `${profile.avatarName} expression for ${rhythm.toLowerCase()} rhythm`,
    isPlaceholder: profile.isLegacyFallback,
  };
}
