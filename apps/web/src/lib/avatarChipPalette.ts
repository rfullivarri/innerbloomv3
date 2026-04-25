import { resolveAvatarOption, type AvatarOption } from './avatarCatalog';
import type { AvatarProfile } from './avatarProfile';

const AVATAR_CHIP_PALETTE: Record<AvatarOption['code'], string> = {
  RED_CAT: '#F56767',
  GREEN_BEAR: '#38CC76',
  BLUE_AMPHIBIAN: '#32AEE4',
  VIOLET_OWL: '#9B82EE',
};

export function resolveAvatarChipColor(avatarProfile: AvatarProfile | null | undefined): string {
  const avatarCode = resolveAvatarOption(avatarProfile ?? null).code;
  return AVATAR_CHIP_PALETTE[avatarCode];
}
