import { useEffect, useMemo } from 'react';
import { useRequest, type AsyncStatus } from './useRequest';
import { getJourneyGenerationStatus, getUserJourney, getUserTasks, type UserJourneySummary } from '../lib/api';
import { clearJourneyGenerationPending, isJourneyGenerationPending } from '../lib/journeyGeneration';
import { useOnboardingProgress } from './useOnboardingProgress';

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
  taskgenInProgress: boolean;
  taskgenTimedOutWithError: boolean;
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
  const onboardingProgress = useOnboardingProgress();
  const TASKGEN_WAIT_WINDOW_MS = 8 * 60 * 1000;
  const { data: tasks, status: tasksStatus, reload: reloadTasks } = useRequest(() => getUserTasks(userId), [userId], {
    enabled,
  });
  const hasTasks = useMemo(() => (tasks?.length ?? 0) > 0, [tasks]);
  const { data: generationState } = useRequest(() => getJourneyGenerationStatus(), [userId], {
    enabled,
  });

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

  const taskgenInProgress = useMemo(() => {
    if (hasTasks) return false;
    const generatedAt = onboardingProgress.progress?.tasks_generated_at;
    if (!generatedAt) return false;

    const generatedAtTs = Date.parse(generatedAt);
    if (Number.isNaN(generatedAtTs)) return false;

    return Date.now() - generatedAtTs <= TASKGEN_WAIT_WINDOW_MS;
  }, [hasTasks, onboardingProgress.progress?.tasks_generated_at]);

  const taskgenTimedOutWithError = useMemo(() => {
    if (hasTasks || taskgenInProgress) return false;
    const generatedAt = onboardingProgress.progress?.tasks_generated_at;
    if (!generatedAt) return false;

    const generatedAtTs = Date.parse(generatedAt);
    if (Number.isNaN(generatedAtTs)) return false;

    const timedOut = Date.now() - generatedAtTs > TASKGEN_WAIT_WINDOW_MS;
    const reason = generationState?.state?.failure_reason?.toUpperCase() ?? '';
    const hasRecoverableError = reason === 'VALIDATION_FAILED' || reason === 'OPENAI_FAILED';
    return timedOut && hasRecoverableError;
  }, [generationState?.state?.failure_reason, hasTasks, onboardingProgress.progress?.tasks_generated_at, taskgenInProgress]);

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

  const firstTasksConfirmed = Boolean(journey?.first_tasks_confirmed || onboardingProgress.progress?.first_task_edited_at);
  const completedFirstDailyQuest = Boolean(journey?.completed_first_daily_quest || onboardingProgress.progress?.first_daily_quest_completed_at);
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
    taskgenInProgress,
    taskgenTimedOutWithError,
    tasksStatus,
    journeyStatus,
    journey,
    reload,
  };
}
