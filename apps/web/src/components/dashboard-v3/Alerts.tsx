import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserJourney, type UserJourneySummary } from '../../lib/api';

interface AlertsProps {
  userId: string;
}

function shouldShowBbddWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  return (journey.quantity_daily_logs ?? 0) === 0;
}

function shouldShowSchedulerWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  const logs = journey.quantity_daily_logs ?? 0;
  const days = journey.days_of_journey ?? 0;
  return logs > 0 && days >= 7;
}

export function Alerts({ userId }: AlertsProps) {
  const { data, status } = useRequest(() => getUserJourney(userId), [userId]);

  const showBbdd = useMemo(() => shouldShowBbddWarning(data), [data]);
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
            Este aviso desaparece cuando tu registro diario queda confirmado en la nueva app.
          </p>
        </div>
      )}

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
    </div>
  );
}
