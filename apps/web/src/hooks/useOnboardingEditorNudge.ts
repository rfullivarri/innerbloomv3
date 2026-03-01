import { useCallback, useEffect, useMemo, useState } from 'react';

type UseOnboardingEditorNudgeOptions = {
  completedFirstDailyQuest?: boolean;
};

type OnboardingEditorNudge = {
  firstEditDone: boolean;
  hasReturnedToDashboardAfterEdit: boolean;
  shouldShowInlineNotice: boolean;
  shouldShowDashboardDot: boolean;
  markFirstEditDone: () => boolean;
  markReturnedToDashboard: () => void;
};

const FIRST_EDIT_DONE_KEY = 'ib.onboarding.taskEditorFirstEditDone';
const RETURNED_DASHBOARD_KEY = 'ib.onboarding.hasReturnedToDashboardAfterEdit';

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(key) === '1';
}

function writeFlag(key: string, value: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(key, '1');
    return;
  }

  window.localStorage.removeItem(key);
}

export function useOnboardingEditorNudge(options: UseOnboardingEditorNudgeOptions = {}): OnboardingEditorNudge {
  const completedFirstDailyQuest = Boolean(options.completedFirstDailyQuest);
  const [firstEditDone, setFirstEditDone] = useState<boolean>(() => readFlag(FIRST_EDIT_DONE_KEY));
  const [hasReturnedToDashboardAfterEdit, setHasReturnedToDashboardAfterEdit] = useState<boolean>(() =>
    readFlag(RETURNED_DASHBOARD_KEY),
  );

  useEffect(() => {
    if (!completedFirstDailyQuest) {
      return;
    }

    writeFlag(RETURNED_DASHBOARD_KEY, true);
    setHasReturnedToDashboardAfterEdit(true);
  }, [completedFirstDailyQuest]);

  const markFirstEditDone = useCallback(() => {
    if (firstEditDone) {
      return false;
    }

    writeFlag(FIRST_EDIT_DONE_KEY, true);
    setFirstEditDone(true);
    return true;
  }, [firstEditDone]);

  const markReturnedToDashboard = useCallback(() => {
    if (hasReturnedToDashboardAfterEdit) {
      return;
    }

    writeFlag(RETURNED_DASHBOARD_KEY, true);
    setHasReturnedToDashboardAfterEdit(true);
  }, [hasReturnedToDashboardAfterEdit]);

  const shouldShowInlineNotice = useMemo(
    () => firstEditDone && !hasReturnedToDashboardAfterEdit && !completedFirstDailyQuest,
    [completedFirstDailyQuest, firstEditDone, hasReturnedToDashboardAfterEdit],
  );

  const shouldShowDashboardDot = shouldShowInlineNotice;

  return {
    firstEditDone,
    hasReturnedToDashboardAfterEdit,
    shouldShowInlineNotice,
    shouldShowDashboardDot,
    markFirstEditDone,
    markReturnedToDashboard,
  };
}
