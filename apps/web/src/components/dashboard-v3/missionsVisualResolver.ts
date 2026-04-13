import { resolveAvatarMedia, type AvatarProfile } from '../../lib/avatarProfile';

type MissionArtSlot = 'main' | 'hunt' | 'skill' | 'boss';

const DEFAULT_MISSION_ART_BY_SLOT: Record<MissionArtSlot, string> = {
  main: '/missions/missions_main_flow.png',
  hunt: '/missions/missions_hunt_flow.png',
  skill: '/missions/missions_skill_flow.png',
  boss: '/missions/missions_boss_flow.png',
};

export function resolveMissionsArt(
  slot: MissionArtSlot,
  options: {
    avatarProfile?: AvatarProfile | null;
    rhythm?: string | null;
  },
): string {
  const avatarMedia = resolveAvatarMedia(options.avatarProfile ?? null, {
    rhythm: options.rhythm,
    surface: 'missions',
  });

  if (typeof avatarMedia.imageUrl === 'string' && avatarMedia.imageUrl.length > 0) {
    return avatarMedia.imageUrl;
  }

  return DEFAULT_MISSION_ART_BY_SLOT[slot];
}
