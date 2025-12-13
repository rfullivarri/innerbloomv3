import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WeeklyWrappedRecord } from '../lib/api';
import { getWeeklyWrappedLatest, getWeeklyWrappedPrevious } from '../lib/api';
import { useRequest } from './useRequest';

function buildSeenKey(weekEnd: string): string {
  return `weekly-wrapped-seen:${weekEnd}`;
}

export function useWeeklyWrapped(userId: string | null | undefined) {
  const { data, status, reload } = useRequest(async () => {
    if (!userId) return { latest: null, previous: null } as {
      latest: WeeklyWrappedRecord | null;
      previous: WeeklyWrappedRecord | null;
    };
    const [latest, previous] = await Promise.all([
      getWeeklyWrappedLatest(userId),
      getWeeklyWrappedPrevious(userId),
    ]);
    return { latest, previous };
  }, [userId], { enabled: Boolean(userId) });

  const latestWeekEnd = data?.latest?.weekEnd;
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<WeeklyWrappedRecord | null>(null);

  useEffect(() => {
    if (!latestWeekEnd || typeof window === 'undefined') {
      return;
    }
    try {
      const key = buildSeenKey(latestWeekEnd);
      const hasSeen = window.localStorage.getItem(key) === 'true';
      if (!hasSeen && data?.latest) {
        setActiveRecord(data.latest);
        setModalOpen(true);
      }
    } catch {
      if (data?.latest) {
        setActiveRecord(data.latest);
        setModalOpen(true);
      }
    }
  }, [data?.latest, latestWeekEnd]);

  const markSeen = useCallback(() => {
    if (latestWeekEnd && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(buildSeenKey(latestWeekEnd), 'true');
      } catch {
        // ignore storage errors
      }
    }
  }, [latestWeekEnd]);

  const closeModal = useCallback(() => {
    if (activeRecord?.weekEnd === latestWeekEnd) {
      markSeen();
    }
    setModalOpen(false);
  }, [activeRecord?.weekEnd, latestWeekEnd, markSeen]);

  const openModal = useCallback(
    (record?: WeeklyWrappedRecord | null) => {
      const target = record ?? data?.latest ?? null;
      if (!target) return;
      setActiveRecord(target);
      setModalOpen(true);
    },
    [data?.latest],
  );

  const latest = useMemo(() => data?.latest ?? null, [data]);
  const previous = useMemo(() => data?.previous ?? null, [data]);

  return {
    latest,
    previous,
    status,
    reload,
    activeRecord,
    isModalOpen,
    closeModal,
    openModal,
    markSeen,
  } as const;
}
