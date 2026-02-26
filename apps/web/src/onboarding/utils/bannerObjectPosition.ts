import type { GameMode } from '../state';

export const BANNER_OBJECT_POSITION: Record<GameMode, string> = {
  FLOW: '70% 45%',
  CHILL: '60% 45%',
  LOW: '65% 45%',
  EVOLVE: '65% 50%',
};

export function getBannerObjectPosition(mood: GameMode): string {
  return BANNER_OBJECT_POSITION[mood];
}
