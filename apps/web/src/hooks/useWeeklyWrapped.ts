import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WeeklyWrappedRecord } from '../lib/api';
import { getWeeklyWrappedLatest, getWeeklyWrappedPrevious } from '../lib/api';
import { useRequest } from './useRequest';

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): Date {
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function getStartOfWeekUtc(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = copy.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - daysSinceMonday);
  return copy;
}

function isSameUtcWeek(dateKey: string, reference: Date): boolean {
  const referenceStart = getStartOfWeekUtc(reference);
  const targetStart = getStartOfWeekUtc(parseDateKey(dateKey));
  return referenceStart.getTime() === targetStart.getTime();
}

function buildSeenKey(weekStartKey: string): string {
  return `weekly-wrapped-seen:${weekStartKey}`;
}

export function useWeeklyWrapped(userId: string | null | undefined) {
  const { data, status, reload } = useRequest(async () => {
    if (!userId) return { latest: null, previous: null } as {
      latest: WeeklyWrappedRecord | null;
      previous: WeeklyWrappedRecord | null;
    };
    console.info('[weekly-wrapped] loading records for user', { userId });
    const [latest, previous] = await Promise.all([
      getWeeklyWrappedLatest(userId),
      getWeeklyWrappedPrevious(userId),
    ]);
    console.info('[weekly-wrapped] records loaded', {
      userId,
      latestWeek: latest?.weekEnd,
      previousWeek: previous?.weekEnd,
    });
    return { latest, previous };
  }, [userId], { enabled: Boolean(userId) });

  const latestWeekEnd = data?.latest?.weekEnd ?? null;
  const latestWeekStart = useMemo(() => {
    return latestWeekEnd ? toUtcDateKey(getStartOfWeekUtc(parseDateKey(latestWeekEnd))) : null;
  }, [latestWeekEnd]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<WeeklyWrappedRecord | null>(null);

  useEffect(() => {
    if (!data?.latest || !latestWeekStart || typeof window === 'undefined') {
      setModalOpen(false);
      setActiveRecord(null);
      return;
    }

    if (!isSameUtcWeek(data.latest.weekEnd, new Date())) {
      setModalOpen(false);
      setActiveRecord(null);
      return;
    }

    try {
      const key = buildSeenKey(latestWeekStart);
      const hasSeen = window.localStorage.getItem(key) === 'true';
      if (!hasSeen) {
        setActiveRecord(data.latest);
        setModalOpen(true);
        window.localStorage.setItem(key, 'true');
      }
    } catch {
      setActiveRecord(data.latest);
      setModalOpen(true);
    }
  }, [data?.latest, latestWeekStart]);

  const markSeen = useCallback(() => {
    if (latestWeekStart && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(buildSeenKey(latestWeekStart), 'true');
      } catch {
        // ignore storage errors
      }
    }
  }, [latestWeekStart]);

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
