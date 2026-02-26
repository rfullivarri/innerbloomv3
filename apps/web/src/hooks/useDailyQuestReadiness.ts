import { useEffect, useMemo } from 'react';
import { useRequest, type AsyncStatus } from './useRequest';
import { getUserJourney, getUserTasks, type UserJourneySummary } from '../lib/api';
import { clearJourneyGenerationPending, isJourneyGenerationPending } from '../lib/journeyGeneration';

type UseDailyQuestReadinessOptions = {
  enabled?: boolean;
  isJourneyGenerating?: boolean;
};

export type DailyQuestReadiness = {
  hasTasks: boolean;
  baseConfirmed: boolean;
  canShowDailyQuestPopup: boolean;
  showOnboardingGuidance: boolean;
  showJourneyPreparing: boolean;
  tasksStatus: AsyncStatus;
  journeyStatus: AsyncStatus;
  journey: UserJourneySummary | null;
};

export function useDailyQuestReadiness(
  userId: string,
  options: UseDailyQuestReadinessOptions = {},
): DailyQuestReadiness {
  const { enabled = true, isJourneyGenerating = false } = options;
  const { data: tasks, status: tasksStatus } = useRequest(() => getUserTasks(userId), [userId], { enabled });
  const hasTasks = useMemo(() => (tasks?.length ?? 0) > 0, [tasks]);

  const pendingJourneyGeneration = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const clerkUserId = window.localStorage.getItem('clerk_uid');
    return isJourneyGenerationPending(clerkUserId);
  }, []);

  const showJourneyPreparing = useMemo(
    () => !hasTasks && (isJourneyGenerating || pendingJourneyGeneration),
    [hasTasks, isJourneyGenerating, pendingJourneyGeneration],
  );

  useEffect(() => {
    if (hasTasks) {
      clearJourneyGenerationPending();
    }
  }, [hasTasks]);

  const shouldLoadJourney = enabled && (tasksStatus === 'success' ? hasTasks : tasksStatus === 'error');

  const {
    data: journey,
    status: journeyStatus,
  } = useRequest(() => getUserJourney(userId), [userId], { enabled: shouldLoadJourney });

  const baseConfirmed = (journey?.quantity_daily_logs ?? 0) > 0;
  const canShowDailyQuestPopup = hasTasks && baseConfirmed;
  const showOnboardingGuidance = !hasTasks || !baseConfirmed;

  return {
    hasTasks,
    baseConfirmed,
    canShowDailyQuestPopup,
    showOnboardingGuidance,
    showJourneyPreparing,
    tasksStatus,
    journeyStatus,
    journey,
  };
}

