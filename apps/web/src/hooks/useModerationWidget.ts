import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getModerationState,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
  updateModerationConfig,
} from '../lib/api';

export const moderationTrackerOrder: ModerationTrackerType[] = ['alcohol', 'tobacco', 'sugar'];

const moderationDebugEnabled =
  import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_MODERATION ?? 'false').toLowerCase() === 'true';

function logModerationDebug(message: string, payload?: unknown) {
  if (!moderationDebugEnabled) {
    return;
  }

  if (payload === undefined) {
    console.info(`[moderation-widget] ${message}`);
    return;
  }

  console.info(`[moderation-widget] ${message}`, payload);
}

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
  const mutationIdRef = useRef(0);

  const setConfigsWithLog = useCallback(
    (
      updater:
        | Record<ModerationTrackerType, ModerationTrackerConfig>
        | null
        | ((
            current: Record<ModerationTrackerType, ModerationTrackerConfig> | null,
          ) => Record<ModerationTrackerType, ModerationTrackerConfig> | null),
      reason: string,
    ) => {
      setConfigs((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        logModerationDebug(`store update (${reason})`, { reason, current, next });
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const loadStartMutationId = mutationIdRef.current;

    const load = async () => {
      setIsLoading(true);
      try {
        logModerationDebug('GET /api/moderation start', { loadStartMutationId });
        const state = await getModerationState();
        logModerationDebug('GET /api/moderation success', { loadStartMutationId, state });
        if (cancelled) {
          return;
        }

        setConfigsWithLog(
          (current) => {
            if (mutationIdRef.current !== loadStartMutationId && current) {
              logModerationDebug('Ignoring stale moderation GET response', {
                loadStartMutationId,
                currentMutationId: mutationIdRef.current,
              });
              return current;
            }
            return mapStateToConfigs(state);
          },
          'initial_get',
        );
      } catch (error) {
        logModerationDebug('GET /api/moderation failed', error);
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
  }, [setConfigsWithLog]);

  const enabledTypes = useMemo(
    () => moderationTrackerOrder.filter((type) => Boolean(configs?.[type]?.isEnabled)),
    [configs],
  );

  const updateTracker = useCallback(async (type: ModerationTrackerType, patch: Partial<ModerationTrackerConfig>) => {
    let previousConfig: ModerationTrackerConfig | null = null;
    mutationIdRef.current += 1;
    const mutationId = mutationIdRef.current;

    setConfigsWithLog(
      (current) => {
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
      },
      `optimistic_update:${type}`,
    );

    logModerationDebug(`PUT /api/moderation/${type}/config start`, { type, patch, mutationId });

    try {
      const updatedState = await updateModerationConfig(type, patch);
      logModerationDebug(`PUT /api/moderation/${type}/config success`, { type, updatedState, mutationId });
      const next = mapStateToConfigs(updatedState);
      setConfigsWithLog(
        (current) => {
          if (!current) {
            return next;
          }
          return {
            ...current,
            [type]: next[type],
          };
        },
        `server_reconcile:${type}`,
      );
    } catch (error) {
      logModerationDebug(`PUT /api/moderation/${type}/config failed`, { error, mutationId });
      if (!previousConfig) {
        throw error;
      }

      setConfigsWithLog(
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            [type]: previousConfig as ModerationTrackerConfig,
          };
        },
        `rollback:${type}`,
      );
      throw error;
    }
  }, [setConfigsWithLog]);

  return {
    configs,
    isLoading,
    enabledTypes,
    updateTracker,
  };
}
