import type { CurrentUserProfile } from './api';

export type AvatarThemeTokens = {
  accent: string;
  chip: string;
};

export type AvatarProfile = {
  avatarId: number | null;
  avatarCode: string;
  avatarName: string;
  theme: AvatarThemeTokens;
  isLegacyFallback: boolean;
};

const LEGACY_AVATAR_FALLBACK_BY_GAME_MODE: Record<string, Omit<AvatarProfile, 'avatarId' | 'isLegacyFallback'>> = {
  LOW: {
    avatarCode: 'LEGACY_LOW',
    avatarName: 'Legacy Low',
    theme: { accent: '#58CC02', chip: 'leaf' },
  },
  CHILL: {
    avatarCode: 'LEGACY_CHILL',
    avatarName: 'Legacy Chill',
    theme: { accent: '#00C2FF', chip: 'aqua' },
  },
  FLOW: {
    avatarCode: 'LEGACY_FLOW',
    avatarName: 'Legacy Flow',
    theme: { accent: '#A855F7', chip: 'violet' },
  },
  EVOLVE: {
    avatarCode: 'LEGACY_EVOLVE',
    avatarName: 'Legacy Evolve',
    theme: { accent: '#FF6A00', chip: 'ember' },
  },
};

const DEFAULT_LEGACY_AVATAR = LEGACY_AVATAR_FALLBACK_BY_GAME_MODE.CHILL;

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

  const apiTheme = normalizeThemeTokens(profile.avatar_theme_tokens);
  const modeKey = (profile.game_mode ?? '').toUpperCase();
  const legacyFallback = LEGACY_AVATAR_FALLBACK_BY_GAME_MODE[modeKey] ?? DEFAULT_LEGACY_AVATAR;

  const avatarCode = profile.avatar_code ?? legacyFallback.avatarCode;
  const avatarName = profile.avatar_name ?? legacyFallback.avatarName;
  const theme = apiTheme ?? legacyFallback.theme;

  return {
    avatarId: profile.avatar_id,
    avatarCode,
    avatarName,
    theme,
    isLegacyFallback: profile.avatar_id == null,
  };
}

export function resolveAvatarTheme(profile: AvatarProfile | null): AvatarThemeTokens {
  return profile?.theme ?? DEFAULT_LEGACY_AVATAR.theme;
}

export function resolveAvatarMedia(_profile: AvatarProfile | null): { videoUrl: string | null; imageUrl: string | null } {
  return {
    videoUrl: null,
    imageUrl: null,
  };
}
