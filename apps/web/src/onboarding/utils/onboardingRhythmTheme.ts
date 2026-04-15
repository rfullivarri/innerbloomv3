import type { GameMode } from '../state';

export type OnboardingRhythmTheme = {
  accent: string;
  border: string;
  glow: string;
  softTint: string;
  badgeAccent: string;
};

const SHARED_ONBOARDING_RHYTHM_THEME: OnboardingRhythmTheme = {
  accent: 'rgb(199, 139, 243)',
  border: 'rgba(207, 139, 243, 0.44)',
  glow: 'rgba(167, 112, 239, 0.34)',
  softTint: 'rgba(191, 143, 239, 0.2)',
  badgeAccent: 'rgba(207, 139, 243, 0.28)',
};

export const ONBOARDING_RHYTHM_THEME: Record<GameMode, OnboardingRhythmTheme> = {
  LOW: SHARED_ONBOARDING_RHYTHM_THEME,
  CHILL: SHARED_ONBOARDING_RHYTHM_THEME,
  FLOW: SHARED_ONBOARDING_RHYTHM_THEME,
  EVOLVE: SHARED_ONBOARDING_RHYTHM_THEME,
};

export function getOnboardingRhythmTheme(mode: GameMode): OnboardingRhythmTheme {
  return ONBOARDING_RHYTHM_THEME[mode];
}
