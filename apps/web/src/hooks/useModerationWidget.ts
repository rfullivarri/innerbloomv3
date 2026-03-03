import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getModerationState,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
  updateModerationConfig,
} from '../lib/api';

export const moderationTrackerOrder: ModerationTrackerType[] = ['alcohol', 'tobacco', 'sugar'];

function mapStateToConfigs(state: Awaited<ReturnType<typeof getModerationState>>) {
  return Object.fromEntries(
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
}

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
        setConfigs(mapStateToConfigs(state));
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
    let previousConfig: ModerationTrackerConfig | null = null;

    setConfigs((current) => {
      if (!current) {
        return current;
      }

      previousConfig = current[type];
      return {
        ...current,
        [type]: {
          ...current[type],
          ...patch,
          type,
        },
      };
    });

    try {
      const updatedState = await updateModerationConfig(type, patch);
      const next = mapStateToConfigs(updatedState);
      setConfigs((current) => {
        if (!current) {
          return next;
        }
        return {
          ...current,
          [type]: next[type],
        };
      });
    } catch (error) {
      if (!previousConfig) {
        throw error;
      }

      setConfigs((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          [type]: previousConfig as ModerationTrackerConfig,
        };
      });
      throw error;
    }
  }, []);

  return {
    configs,
    isLoading,
    enabledTypes,
    updateTracker,
  };
}
