import type { GameMode } from '../state';

export type OnboardingRhythmTheme = {
  accent: string;
  border: string;
  glow: string;
  softTint: string;
  badgeDot: string;
  badgeAccent: string;
};

export const ONBOARDING_RHYTHM_THEME: Record<GameMode, OnboardingRhythmTheme> = {
  LOW: {
    accent: 'rgb(248, 113, 113)',
    border: 'rgba(248, 113, 113, 0.45)',
    glow: 'rgba(248, 113, 113, 0.32)',
    softTint: 'rgba(248, 113, 113, 0.2)',
    badgeDot: 'rgba(248, 113, 113, 0.96)',
    badgeAccent: 'rgba(248, 113, 113, 0.45)',
  },
  CHILL: {
    accent: 'rgb(74, 222, 128)',
    border: 'rgba(74, 222, 128, 0.4)',
    glow: 'rgba(74, 222, 128, 0.3)',
    softTint: 'rgba(74, 222, 128, 0.2)',
    badgeDot: 'rgba(74, 222, 128, 0.95)',
    badgeAccent: 'rgba(74, 222, 128, 0.4)',
  },
  FLOW: {
    accent: 'rgb(56, 189, 248)',
    border: 'rgba(56, 189, 248, 0.42)',
    glow: 'rgba(56, 189, 248, 0.32)',
    softTint: 'rgba(56, 189, 248, 0.2)',
    badgeDot: 'rgba(56, 189, 248, 0.95)',
    badgeAccent: 'rgba(56, 189, 248, 0.42)',
  },
  EVOLVE: {
    accent: 'rgb(167, 139, 250)',
    border: 'rgba(167, 139, 250, 0.44)',
    glow: 'rgba(167, 139, 250, 0.34)',
    softTint: 'rgba(167, 139, 250, 0.2)',
    badgeDot: 'rgba(167, 139, 250, 0.96)',
    badgeAccent: 'rgba(167, 139, 250, 0.44)',
  },
};

export function getOnboardingRhythmTheme(mode: GameMode): OnboardingRhythmTheme {
  return ONBOARDING_RHYTHM_THEME[mode];
}
