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
};

type LegacyAvatarFallback = {
  avatarCode: string;
  avatarName: string;
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

const LEGACY_AVATAR_FALLBACK_BY_GAME_MODE: Record<AvatarRhythm, LegacyAvatarFallback> = {
  LOW: {
    avatarCode: 'LEGACY_LOW',
    avatarName: 'Legacy Low',
    theme: { accent: '#58CC02', chip: 'leaf' },
    media: LEGACY_MEDIA_BY_RHYTHM,
  },
  CHILL: {
    avatarCode: 'LEGACY_CHILL',
    avatarName: 'Legacy Chill',
    theme: { accent: '#00C2FF', chip: 'aqua' },
    media: LEGACY_MEDIA_BY_RHYTHM,
  },
  FLOW: {
    avatarCode: 'LEGACY_FLOW',
    avatarName: 'Legacy Flow',
    theme: { accent: '#A855F7', chip: 'violet' },
    media: LEGACY_MEDIA_BY_RHYTHM,
  },
  EVOLVE: {
    avatarCode: 'LEGACY_EVOLVE',
    avatarName: 'Legacy Evolve',
    theme: { accent: '#FF6A00', chip: 'ember' },
    media: LEGACY_MEDIA_BY_RHYTHM,
  },
};

const DEFAULT_RHYTHM: AvatarRhythm = 'FLOW';
const DEFAULT_LEGACY_AVATAR = LEGACY_AVATAR_FALLBACK_BY_GAME_MODE.CHILL;

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

  const modeKey = normalizeRhythm(profile.game_mode);
  const legacyFallback = LEGACY_AVATAR_FALLBACK_BY_GAME_MODE[modeKey] ?? DEFAULT_LEGACY_AVATAR;
  const apiTheme = normalizeThemeTokens(profile.avatar_theme_tokens);

  return {
    avatarId: profile.avatar_id,
    avatarCode: profile.avatar_code ?? legacyFallback.avatarCode,
    avatarName: profile.avatar_name ?? legacyFallback.avatarName,
    theme: apiTheme ?? legacyFallback.theme,
    isLegacyFallback: profile.avatar_id == null,
  };
}

export function resolveAvatarTheme(profile: AvatarProfile | null): AvatarThemeTokens {
  return profile?.theme ?? DEFAULT_LEGACY_AVATAR.theme;
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

export function resolveLegacyAvatarFallback(gameMode: string | null | undefined): LegacyAvatarFallback {
  const rhythm = normalizeRhythm(gameMode);
  return LEGACY_AVATAR_FALLBACK_BY_GAME_MODE[rhythm] ?? DEFAULT_LEGACY_AVATAR;
}
