import { useEffect, useRef, useState } from 'react';
import type { OnboardingProgress } from '../../../lib/api';

const ONBOARDING_WELCOME_STORAGE_PREFIX = 'innerbloom.innerbloom2.onboardingWelcomeSeen.v2';

export function buildOnboardingWelcomeStorageKey(
  progress: OnboardingProgress | null | undefined,
  fallbackUserId?: string | null,
): string | undefined {
  const identity = progress?.onboarding_session_id ?? progress?.user_id ?? fallbackUserId;
  return identity ? `${ONBOARDING_WELCOME_STORAGE_PREFIX}:${identity}` : undefined;
}

export function isOnboardingComplete(progress: OnboardingProgress | null | undefined): boolean {
  return Boolean(
    progress
      && (
        progress.onboarding_completed_at
        || progress.state === 'completed'
        || (
          progress.tasks_generated_at
          && progress.first_task_edited_at
          && progress.first_daily_quest_completed_at
          && progress.daily_quest_scheduled_at
        )
      ),
  );
}

export function useOnboardingWelcome(
  progress: OnboardingProgress | null | undefined,
  fallbackUserId?: string | null,
) {
  const storageKey = buildOnboardingWelcomeStorageKey(progress, fallbackUserId);
  const completed = isOnboardingComplete(progress);
  const trackerRef = useRef<{ identity: string | null; completed: boolean | null }>({
    identity: null,
    completed: null,
  });
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false);

  useEffect(() => {
    if (!progress || !storageKey) {
      return;
    }

    const tracker = trackerRef.current;
    if (tracker.identity !== storageKey) {
      trackerRef.current = { identity: storageKey, completed };
      setShouldShowWelcome(false);
      return;
    }

    const completedNow = tracker.completed === false && completed;
    tracker.completed = completed;

    if (!completed) {
      setShouldShowWelcome(false);
    } else if (completedNow) {
      setShouldShowWelcome(true);
    }
  }, [completed, progress, storageKey]);

  return { shouldShowWelcome, storageKey };
}
