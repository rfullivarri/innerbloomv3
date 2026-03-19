import { useEffect, useMemo, useState } from 'react';
import {
  getOnboardingProgress,
  markOnboardingProgress,
  type OnboardingProgress,
  type OnboardingProgressStep,
} from '../lib/api';

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      try {
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
