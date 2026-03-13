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
  firstTasksConfirmed: boolean;
  completedFirstDailyQuest: boolean;
  canOpenDailyQuest: boolean;
  canShowDailyQuestPopup: boolean;
  canAutoOpenDailyQuestPopup: boolean;
  showOnboardingGuidance: boolean;
  showJourneyPreparing: boolean;
  tasksStatus: AsyncStatus;
  journeyStatus: AsyncStatus;
  journey: UserJourneySummary | null;
  reload: () => void;
};

export function useDailyQuestReadiness(
  userId: string,
  options: UseDailyQuestReadinessOptions = {},
): DailyQuestReadiness {
  const { enabled = true, isJourneyGenerating = false } = options;
  const { data: tasks, status: tasksStatus, reload: reloadTasks } = useRequest(() => getUserTasks(userId), [userId], {
    enabled,
  });
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
    reload: reloadJourney,
  } = useRequest(() => getUserJourney(userId), [userId], { enabled: shouldLoadJourney });

  const firstTasksConfirmed = Boolean(journey?.first_tasks_confirmed);
  const completedFirstDailyQuest = Boolean(journey?.completed_first_daily_quest);
  const canOpenDailyQuest = hasTasks && firstTasksConfirmed;
  const canShowDailyQuestPopup = canOpenDailyQuest;
  const canAutoOpenDailyQuestPopup = canOpenDailyQuest && completedFirstDailyQuest;
  const showOnboardingGuidance = !hasTasks || !firstTasksConfirmed;
  const reload = () => {
    reloadTasks();
    reloadJourney();
  };

  return {
    hasTasks,
    firstTasksConfirmed,
    completedFirstDailyQuest,
    canOpenDailyQuest,
    canShowDailyQuestPopup,
    canAutoOpenDailyQuestPopup,
    showOnboardingGuidance,
    showJourneyPreparing,
    tasksStatus,
    journeyStatus,
    journey,
    reload,
  };
}
