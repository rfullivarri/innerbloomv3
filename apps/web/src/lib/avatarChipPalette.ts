import { resolveAvatarOption, type AvatarOption } from './avatarCatalog';
import type { AvatarProfile } from './avatarProfile';

const AVATAR_CHIP_PALETTE: Record<AvatarOption['code'], string> = {
  RED_CAT: '#F87171',
  GREEN_BEAR: '#4ADE80',
  BLUE_AMPHIBIAN: '#38BDF8',
  VIOLET_OWL: '#A78BFA',
};

export function resolveAvatarChipColor(avatarProfile: AvatarProfile | null | undefined): string {
  const avatarCode = resolveAvatarOption(avatarProfile ?? null).code;
  return AVATAR_CHIP_PALETTE[avatarCode];
}
