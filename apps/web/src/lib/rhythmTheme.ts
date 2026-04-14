import { getOnboardingRhythmTheme } from '../onboarding/utils/onboardingRhythmTheme';
import { normalizeGameModeValue, type GameMode } from './gameMode';

type OnboardingRhythmMode = 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE';

const ONBOARDING_RHYTHM_BY_GAME_MODE: Record<GameMode, OnboardingRhythmMode> = {
  Low: 'LOW',
  Chill: 'CHILL',
  Flow: 'FLOW',
  Evolve: 'EVOLVE',
};

export function resolveRhythmTheme(mode?: string | null) {
  const normalizedMode = normalizeGameModeValue(mode) ?? 'Flow';
  const onboardingMode = ONBOARDING_RHYTHM_BY_GAME_MODE[normalizedMode];
  return getOnboardingRhythmTheme(onboardingMode);
}
