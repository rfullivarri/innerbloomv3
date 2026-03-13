import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOnboardingProgress } from './useOnboardingProgress';

type UseOnboardingEditorNudgeOptions = {
  completedFirstDailyQuest?: boolean;
};

type OnboardingEditorNudge = {
  firstEditDone: boolean;
  hasReturnedToDashboardAfterEdit: boolean;
  shouldShowInlineNotice: boolean;
  shouldShowDashboardDot: boolean;
  markFirstEditDone: () => Promise<boolean>;
  markReturnedToDashboard: () => Promise<void>;
};

const FIRST_EDIT_DONE_KEY = 'ib.onboarding.taskEditorFirstEditDone';
const RETURNED_DASHBOARD_KEY = 'ib.onboarding.hasReturnedToDashboardAfterEdit';

function writeFlag(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(key, '1');
    return;
  }
  window.localStorage.removeItem(key);
}

export function useOnboardingEditorNudge(options: UseOnboardingEditorNudgeOptions = {}): OnboardingEditorNudge {
  const completedFirstDailyQuest = Boolean(options.completedFirstDailyQuest);
  const { progress, markStep } = useOnboardingProgress();
  const [firstEditDone, setFirstEditDone] = useState(false);
  const [hasReturnedToDashboardAfterEdit, setHasReturnedToDashboardAfterEdit] = useState(false);

  useEffect(() => {
    setFirstEditDone(Boolean(progress?.first_task_edited_at));
    setHasReturnedToDashboardAfterEdit(Boolean(progress?.returned_to_dashboard_after_first_edit_at));
  }, [progress?.first_task_edited_at, progress?.returned_to_dashboard_after_first_edit_at]);

  const markFirstEditDone = useCallback(async () => {
    if (firstEditDone) return false;
    writeFlag(FIRST_EDIT_DONE_KEY, true);
    setFirstEditDone(true);
    await markStep('first_task_edited', { trigger: 'editor_first_edit_ui' });
    return true;
  }, [firstEditDone, markStep]);

  const markReturnedToDashboard = useCallback(async () => {
    if (hasReturnedToDashboardAfterEdit) return;
    writeFlag(RETURNED_DASHBOARD_KEY, true);
    setHasReturnedToDashboardAfterEdit(true);
    await markStep('returned_to_dashboard_after_first_edit', {
      trigger: 'editor_return_dashboard',
    });
  }, [hasReturnedToDashboardAfterEdit, markStep]);

  const shouldShowInlineNotice = useMemo(
    () => firstEditDone && !hasReturnedToDashboardAfterEdit && !completedFirstDailyQuest,
    [completedFirstDailyQuest, firstEditDone, hasReturnedToDashboardAfterEdit],
  );

  return {
    firstEditDone,
    hasReturnedToDashboardAfterEdit,
    shouldShowInlineNotice,
    shouldShowDashboardDot: shouldShowInlineNotice,
    markFirstEditDone,
    markReturnedToDashboard,
  };
}
