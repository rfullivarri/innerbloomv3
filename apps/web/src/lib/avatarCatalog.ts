import type { AvatarProfile } from './avatarProfile';

export type AvatarOption = {
  avatarId: number;
  code: 'LEGACY_LOW' | 'LEGACY_CHILL' | 'LEGACY_FLOW' | 'LEGACY_EVOLVE';
  name: string;
  accent: string;
  chip: 'leaf' | 'aqua' | 'violet' | 'ember';
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { avatarId: 1, code: 'LEGACY_LOW', name: 'Legacy Low', accent: '#58CC02', chip: 'leaf' },
  { avatarId: 2, code: 'LEGACY_CHILL', name: 'Legacy Chill', accent: '#00C2FF', chip: 'aqua' },
  { avatarId: 3, code: 'LEGACY_FLOW', name: 'Legacy Flow', accent: '#A855F7', chip: 'violet' },
  { avatarId: 4, code: 'LEGACY_EVOLVE', name: 'Legacy Evolve', accent: '#FF6A00', chip: 'ember' },
];

const DEFAULT_AVATAR_OPTION: AvatarOption = AVATAR_OPTIONS[1];

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
    const byCode = AVATAR_OPTIONS.find((option) => option.code === avatarProfile.avatarCode);
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
