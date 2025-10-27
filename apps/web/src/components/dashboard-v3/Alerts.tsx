import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserJourney, type UserJourneySummary } from '../../lib/api';

interface AlertsProps {
  userId: string;
}

type BbddWarningTracker = {
  lastLogCount: number;
  loginCount: number;
};

const BBDD_WARNING_STORAGE_PREFIX = 'bbdd-warning:v1:';

function shouldShowBbddWarning(
  journey: UserJourneySummary | null,
  tracker: BbddWarningTracker | null,
): boolean {
  if (!journey) return false;
  if (journey.first_tasks_confirmed) return false;

  const dailyLogs = journey.quantity_daily_logs ?? 0;
  if (dailyLogs === 0) return true;

  if (!tracker) return false;

  return tracker.loginCount >= 3;
}

function shouldShowSchedulerWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  if (journey.first_programmed) return false;

  const logs = journey.quantity_daily_logs ?? 0;
  const days = journey.days_of_journey ?? 0;
  return logs > 0 && days >= 7;
}

export function Alerts({ userId }: AlertsProps) {
  const { data, status } = useRequest(() => getUserJourney(userId), [userId]);

  const [bbddTracker, setBbddTracker] = useState<BbddWarningTracker | null>(null);
  const processedLogCountRef = useRef<number | null>(null);

  useEffect(() => {
    processedLogCountRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (status !== 'success' || !data) return;

    const currentLogCount = data.quantity_daily_logs ?? 0;
    const storageKey = `${BBDD_WARNING_STORAGE_PREFIX}${userId}`;

    let tracker: BbddWarningTracker = {
      lastLogCount: currentLogCount,
      loginCount: 0,
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<BbddWarningTracker>;
          if (
            typeof parsed.lastLogCount === 'number' &&
            Number.isFinite(parsed.lastLogCount) &&
            typeof parsed.loginCount === 'number' &&
            Number.isFinite(parsed.loginCount)
          ) {
            tracker = {
              lastLogCount: parsed.lastLogCount,
              loginCount: parsed.loginCount,
            };
          }
        }
      } catch (error) {
        console.warn('Failed to read BBDD warning tracker from localStorage', error);
      }
    }

    let shouldIncrementLoginCount = false;

    if (tracker.lastLogCount !== currentLogCount) {
      tracker = {
        lastLogCount: currentLogCount,
        loginCount: 0,
      };
    } else if (processedLogCountRef.current !== currentLogCount) {
      shouldIncrementLoginCount = true;
    }

    processedLogCountRef.current = currentLogCount;

    if (shouldIncrementLoginCount) {
      tracker = {
        lastLogCount: tracker.lastLogCount,
        loginCount: tracker.loginCount + 1,
      };
    }

    setBbddTracker(tracker);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(tracker));
      } catch (error) {
        console.warn('Failed to persist BBDD warning tracker in localStorage', error);
      }
    }
  }, [status, data, userId]);

  const showBbdd = useMemo(() => shouldShowBbddWarning(data, bbddTracker), [data, bbddTracker]);
  const showScheduler = useMemo(() => shouldShowSchedulerWarning(data), [data]);

  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5/40 p-4" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showScheduler && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-indigo-300" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-white">Tu Daily Quest está listo</p>
              <p className="text-indigo-100/80">
                Programá tu recordatorio para recibirlo automáticamente cada día.
              </p>
            </div>
            <button
              type="button"
              className="ml-auto inline-flex rounded-full border border-indigo-200/50 bg-indigo-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
              disabled
            >
              Programar Daily Quest
            </button>
          </div>
          <p className="mt-2 text-xs text-indigo-100/70">
            El programador todavía no está conectado en esta vista, pero el aviso replica el flujo del MVP.
          </p>
        </div>
      )}

      {showBbdd && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-amber-300" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-white">Confirmá tu base</p>
              <p className="text-amber-100/80">
                Abrí el menú y revisá tu base para que podamos generar tu próxima Daily Quest.
              </p>
            </div>
            <a
              href="/MVP/gamificationweblanding/index-bbdd.html"
              className="ml-auto inline-flex rounded-full border border-amber-200/50 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              Editar base
            </a>
          </div>
          <p className="mt-2 text-xs text-amber-100/70">
            Este aviso desaparece cuando tu registro diario queda confirmado en la nueva app y, si todavía no
            editaste tu base, volverá a aparecer después de tres ingresos.
          </p>
        </div>
      )}

    </div>
  );
}
