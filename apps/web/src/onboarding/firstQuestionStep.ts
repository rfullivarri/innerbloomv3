import type { GameMode, OnboardingPath, StepId } from './state';

const FIRST_TRADITIONAL_STEP: Record<GameMode, StepId> = {
  LOW: 'low-body',
  CHILL: 'chill-open',
  FLOW: 'flow-goal',
  EVOLVE: 'evolve-goal',
};

export function resolveFirstQuestionStep(mode: GameMode | null, onboardingPath: OnboardingPath | null): StepId | null {
  if (!mode || !onboardingPath) {
    return null;
  }

  if (onboardingPath === 'quick_start') {
    return 'quick-start-body';
  }

  return FIRST_TRADITIONAL_STEP[mode];
}

