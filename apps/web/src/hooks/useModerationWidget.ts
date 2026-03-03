import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getModerationTrackerConfig,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
  updateModerationTrackerConfig,
} from '../lib/api';

export const moderationTrackerOrder: ModerationTrackerType[] = ['alcohol', 'tobacco', 'sugar'];

export function useModerationWidget() {
  const [configs, setConfigs] = useState<Record<ModerationTrackerType, ModerationTrackerConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generalRequestedOn, setGeneralRequestedOn] = useState(false);
  const previousEnabledRef = useRef<Set<ModerationTrackerType>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const all = await Promise.all(moderationTrackerOrder.map((type) => getModerationTrackerConfig(type)));
        if (cancelled) {
          return;
        }
        const next = Object.fromEntries(all.map((entry) => [entry.type, entry])) as Record<
          ModerationTrackerType,
          ModerationTrackerConfig
        >;
        setConfigs(next);
        const enabled = all.filter((entry) => entry.isEnabled).map((entry) => entry.type);
        previousEnabledRef.current = new Set(enabled);
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

  const isGeneralEnabled = enabledTypes.length > 0 || generalRequestedOn;

  const updateTracker = useCallback(async (type: ModerationTrackerType, patch: Partial<ModerationTrackerConfig>) => {
    const updated = await updateModerationTrackerConfig(type, patch);
    setConfigs((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [type]: {
          ...current[type],
          ...updated,
        },
      };
    });
    if (patch.isEnabled === true) {
      previousEnabledRef.current.add(type);
      setGeneralRequestedOn(false);
    }
  }, []);

  const setGeneralEnabled = useCallback(
    async (nextEnabled: boolean) => {
      if (!configs) {
        return;
      }

      if (!nextEnabled) {
        await Promise.all(moderationTrackerOrder.map((type) => updateModerationTrackerConfig(type, { isEnabled: false })));
        setConfigs((current) => {
          if (!current) {
            return current;
          }
          const clone = { ...current };
          for (const type of moderationTrackerOrder) {
            clone[type] = { ...clone[type], isEnabled: false };
          }
          return clone;
        });
        setGeneralRequestedOn(false);
        return;
      }

      const restoreTargets = moderationTrackerOrder.filter((type) => previousEnabledRef.current.has(type));
      if (restoreTargets.length === 0) {
        setGeneralRequestedOn(true);
        return;
      }

      await Promise.all(restoreTargets.map((type) => updateModerationTrackerConfig(type, { isEnabled: true })));
      setConfigs((current) => {
        if (!current) {
          return current;
        }
        const clone = { ...current };
        for (const type of restoreTargets) {
          clone[type] = { ...clone[type], isEnabled: true };
        }
        return clone;
      });
      setGeneralRequestedOn(false);
    },
    [configs],
  );

  return {
    configs,
    isLoading,
    isGeneralEnabled,
    enabledTypes,
    setGeneralEnabled,
    updateTracker,
  };
}
