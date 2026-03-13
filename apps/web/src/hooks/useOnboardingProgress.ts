import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getOnboardingProgress,
  markOnboardingProgress,
  reconcileOnboardingProgressClient,
  type OnboardingProgress,
  type OnboardingProgressStep,
} from '../lib/api';

const LEGACY_KEYS = {
  moderationSelected: 'ib.onboarding.moderationSelected',
  firstEditDone: 'ib.onboarding.taskEditorFirstEditDone',
  returnedDashboard: 'ib.onboarding.hasReturnedToDashboardAfterEdit',
  moderationResolved: 'ib.onboarding.moderationSuggestionResolved',
} as const;

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const didReconcileRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      try {
        if (!didReconcileRef.current && typeof window !== 'undefined') {
          didReconcileRef.current = true;
          const flags: Partial<Record<OnboardingProgressStep, boolean>> = {
            moderation_selected: window.localStorage.getItem(LEGACY_KEYS.moderationSelected) === '1',
            first_task_edited: window.localStorage.getItem(LEGACY_KEYS.firstEditDone) === '1',
            returned_to_dashboard_after_first_edit:
              window.localStorage.getItem(LEGACY_KEYS.returnedDashboard) === '1',
            moderation_modal_resolved: window.localStorage.getItem(LEGACY_KEYS.moderationResolved) === '1',
          };

          const reconciled = await reconcileOnboardingProgressClient(flags);
          if (!cancelled) {
            setProgress(reconciled.progress);
          }
        }

        const response = await getOnboardingProgress();
        if (!cancelled) {
          setProgress(response.progress);
          setStatus('success');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const markStep = async (step: OnboardingProgressStep, source?: Record<string, unknown>) => {
    const response = await markOnboardingProgress(step, source);
    setProgress(response.progress);
    return response.progress;
  };

  return useMemo(
    () => ({
      progress,
      status,
      markStep,
      reload: async () => {
        const response = await getOnboardingProgress();
        setProgress(response.progress);
        return response.progress;
      },
    }),
    [progress, status],
  );
}
