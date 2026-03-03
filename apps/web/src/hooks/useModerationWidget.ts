import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getModerationState,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
  updateModerationConfig,
} from '../lib/api';

export const moderationTrackerOrder: ModerationTrackerType[] = ['alcohol', 'tobacco', 'sugar'];

export function useModerationWidget() {
  const [configs, setConfigs] = useState<Record<ModerationTrackerType, ModerationTrackerConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const state = await getModerationState();
        if (cancelled) {
          return;
        }

        const next = Object.fromEntries(
          state.trackers.map((tracker) => [
            tracker.type,
            {
              type: tracker.type,
              isEnabled: tracker.is_enabled,
              isPaused: tracker.is_paused,
              notLoggedToleranceDays: tracker.not_logged_tolerance_days,
            },
          ]),
        ) as Record<ModerationTrackerType, ModerationTrackerConfig>;
        setConfigs(next);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledTypes = useMemo(
    () => moderationTrackerOrder.filter((type) => Boolean(configs?.[type]?.isEnabled)),
    [configs],
  );

  const updateTracker = useCallback(async (type: ModerationTrackerType, patch: Partial<ModerationTrackerConfig>) => {
    const updatedState = await updateModerationConfig(type, patch);
    const next = Object.fromEntries(
      updatedState.trackers.map((tracker) => [
        tracker.type,
        {
          type: tracker.type,
          isEnabled: tracker.is_enabled,
          isPaused: tracker.is_paused,
          notLoggedToleranceDays: tracker.not_logged_tolerance_days,
        },
      ]),
    ) as Record<ModerationTrackerType, ModerationTrackerConfig>;
    setConfigs(next);
  }, []);

  return {
    configs,
    isLoading,
    enabledTypes,
    updateTracker,
  };
}
