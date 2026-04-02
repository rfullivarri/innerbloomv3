import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WeeklyWrappedRecord } from '../lib/api';
import { getWeeklyWrappedLatest, getWeeklyWrappedPending, getWeeklyWrappedPrevious, markWeeklyWrappedSeen } from '../lib/api';
import { useRequest } from './useRequest';

export function useWeeklyWrapped(userId: string | null | undefined) {
  const { data, status, reload } = useRequest(async () => {
    if (!userId) {
      return { latest: null, previous: null, pending: null, unseenCount: 0 } as {
        latest: WeeklyWrappedRecord | null;
        previous: WeeklyWrappedRecord | null;
        pending: WeeklyWrappedRecord | null;
        unseenCount: number;
      };
    }

    const [latest, previous, pendingResponse] = await Promise.all([
      getWeeklyWrappedLatest(userId),
      getWeeklyWrappedPrevious(userId),
      getWeeklyWrappedPending(userId),
    ]);

    return {
      latest,
      previous,
      pending: pendingResponse.item,
      unseenCount: pendingResponse.unseenCount,
    };
  }, [userId], { enabled: Boolean(userId) });

  const [isModalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<WeeklyWrappedRecord | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const pending = data?.pending ?? null;
    if (!pending) {
      setModalOpen(false);
      return;
    }

    setActiveRecord(pending);
    setModalOpen(true);
  }, [data?.pending?.id]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const completeModal = useCallback(async () => {
    if (!userId || !activeRecord) {
      setModalOpen(false);
      return;
    }

    setIsCompleting(true);
    try {
      await markWeeklyWrappedSeen(userId, activeRecord.id);
      setModalOpen(false);
      await reload();
    } finally {
      setIsCompleting(false);
    }
  }, [activeRecord, reload, userId]);

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
    pending: data?.pending ?? null,
    unseenCount: data?.unseenCount ?? 0,
    status,
    reload,
    activeRecord,
    isModalOpen,
    isCompleting,
    closeModal,
    completeModal,
    openModal,
  } as const;
}
