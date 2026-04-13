import type { AvatarProfile } from './avatarProfile';

export type AvatarOption = {
  avatarId: number;
  code: 'BLUE_AMPHIBIAN' | 'GREEN_BEAR' | 'RED_CAT' | 'VIOLET_OWL';
  name: string;
  accent: string;
  chip: 'leaf' | 'aqua' | 'violet' | 'ember';
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { avatarId: 1, code: 'BLUE_AMPHIBIAN', name: 'Blue Amphibian', accent: '#00C2FF', chip: 'aqua' },
  { avatarId: 2, code: 'GREEN_BEAR', name: 'Green Bear', accent: '#58CC02', chip: 'leaf' },
  { avatarId: 3, code: 'RED_CAT', name: 'Red Cat', accent: '#EF4444', chip: 'ember' },
  { avatarId: 4, code: 'VIOLET_OWL', name: 'Violet Owl', accent: '#A855F7', chip: 'violet' },
];

const LEGACY_CODE_ALIASES: Record<string, AvatarOption['code']> = {
  LEGACY_CHILL: 'BLUE_AMPHIBIAN',
  LEGACY_LOW: 'GREEN_BEAR',
  LEGACY_EVOLVE: 'RED_CAT',
  LEGACY_FLOW: 'VIOLET_OWL',
};

const DEFAULT_AVATAR_OPTION: AvatarOption = AVATAR_OPTIONS[0];

export function getAvatarOptionById(avatarId: number | null | undefined): AvatarOption | null {
  if (typeof avatarId !== 'number') return null;
  return AVATAR_OPTIONS.find((option) => option.avatarId === avatarId) ?? null;
}

export function resolveAvatarOption(
  avatarProfile: AvatarProfile | null,
): AvatarOption {
  if (typeof avatarProfile?.avatarId === 'number') {
    const byId = getAvatarOptionById(avatarProfile.avatarId);
    if (byId) return byId;
  }

  if (typeof avatarProfile?.avatarCode === 'string') {
    const normalizedCode = LEGACY_CODE_ALIASES[avatarProfile.avatarCode] ?? avatarProfile.avatarCode;
    const byCode = AVATAR_OPTIONS.find((option) => option.code === normalizedCode);
    if (byCode) return byCode;
  }

  return DEFAULT_AVATAR_OPTION;
}

export function buildAvatarPreviewProfile(option: AvatarOption): AvatarProfile {
  return {
    avatarId: option.avatarId,
    avatarCode: option.code,
    avatarName: option.name,
    theme: { accent: option.accent, chip: option.chip },
    isLegacyFallback: false,
    fallbackReason: 'none',
  };
}
