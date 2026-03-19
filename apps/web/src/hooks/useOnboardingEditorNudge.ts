import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOnboardingProgress } from './useOnboardingProgress';
import {
  readOnboardingOverlayFlag,
  type OnboardingOverlayScope,
  writeOnboardingOverlayFlag,
} from '../lib/onboardingOverlayStorage';

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

function buildOverlayScope(progress: {
  user_id: string;
  onboarding_session_id: string | null;
} | null): OnboardingOverlayScope | null {
  const userId = progress?.user_id?.trim();
  const onboardingSessionId = progress?.onboarding_session_id?.trim();

  if (!userId || !onboardingSessionId) {
    return null;
  }

  return {
    userId,
    onboardingSessionId,
  };
}

export function useOnboardingEditorNudge(options: UseOnboardingEditorNudgeOptions = {}): OnboardingEditorNudge {
  const completedFirstDailyQuest = Boolean(options.completedFirstDailyQuest);
  const { progress, markStep } = useOnboardingProgress();
  const overlayScope = useMemo(() => buildOverlayScope(progress), [progress]);
  const [firstEditDoneOverlay, setFirstEditDoneOverlay] = useState(false);
  const [returnedToDashboardOverlay, setReturnedToDashboardOverlay] = useState(false);

  useEffect(() => {
    const backendFirstEditDone = Boolean(progress?.first_task_edited_at);
    const backendReturnedToDashboard = Boolean(progress?.returned_to_dashboard_after_first_edit_at);

    setFirstEditDoneOverlay(
      backendFirstEditDone || readOnboardingOverlayFlag(overlayScope, 'taskEditorFirstEditDone'),
    );
    setReturnedToDashboardOverlay(
      backendReturnedToDashboard || readOnboardingOverlayFlag(overlayScope, 'hasReturnedToDashboardAfterEdit'),
    );
  }, [
    overlayScope,
    progress?.first_task_edited_at,
    progress?.returned_to_dashboard_after_first_edit_at,
  ]);

  const firstEditDone = Boolean(progress?.first_task_edited_at) || firstEditDoneOverlay;
  const hasReturnedToDashboardAfterEdit =
    Boolean(progress?.returned_to_dashboard_after_first_edit_at) || returnedToDashboardOverlay;

  const markFirstEditDone = useCallback(async () => {
    if (firstEditDone) return false;

    writeOnboardingOverlayFlag(overlayScope, 'taskEditorFirstEditDone', true);
    setFirstEditDoneOverlay(true);
    await markStep('first_task_edited', { trigger: 'editor_first_edit_ui' });
    return true;
  }, [firstEditDone, markStep, overlayScope]);

  const markReturnedToDashboard = useCallback(async () => {
    if (hasReturnedToDashboardAfterEdit) return;

    writeOnboardingOverlayFlag(overlayScope, 'hasReturnedToDashboardAfterEdit', true);
    setReturnedToDashboardOverlay(true);
    await markStep('returned_to_dashboard_after_first_edit', {
      trigger: 'editor_return_dashboard',
    });
  }, [hasReturnedToDashboardAfterEdit, markStep, overlayScope]);

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
