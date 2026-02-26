import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRequest } from '../../hooks/useRequest';
import { getUserJourney, getUserTasks, type UserJourneySummary } from '../../lib/api';
import { clearJourneyGenerationPending, isJourneyGenerationPending } from '../../lib/journeyGeneration';

interface AlertsProps {
  userId: string;
  isJourneyGenerating?: boolean;
  onScheduleClick?: () => void;
}

function shouldShowBbddWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  return (journey.quantity_daily_logs ?? 0) === 0;
}

function shouldShowSchedulerWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  // The blue banner must only depend on whether the user ever programmed the scheduler.
  return journey.first_programmed === false;
}

export function Alerts({ userId, isJourneyGenerating = false, onScheduleClick }: AlertsProps) {
  const { data: tasks, status: tasksStatus } = useRequest(() => getUserTasks(userId), [userId]);
  const hasTasks = useMemo(() => (tasks?.length ?? 0) > 0, [tasks]);
  const showJourneyPreparing = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const clerkUserId = window.localStorage.getItem('clerk_uid');
    return !hasTasks && isJourneyGenerationPending(clerkUserId);
  }, [hasTasks]);

  useEffect(() => {
    if (hasTasks) {
      clearJourneyGenerationPending();
    }
  }, [hasTasks]);

  const shouldLoadJourney = tasksStatus === 'success' ? hasTasks : tasksStatus === 'error';

  const {
    data,
    status: journeyStatus,
  } = useRequest(() => getUserJourney(userId), [userId], { enabled: shouldLoadJourney });

  const showBbdd = useMemo(() => shouldShowBbddWarning(data), [data]);
  const showScheduler = useMemo(() => shouldShowSchedulerWarning(data), [data]);
  const canSchedule = typeof onScheduleClick === 'function';

  if (tasksStatus === 'loading' || (shouldLoadJourney && journeyStatus === 'loading')) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5/40 p-4" />
      </div>
    );
  }

  if (tasksStatus === 'success' && !hasTasks && !showJourneyPreparing) {
    return (
      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-sky-300" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold text-white">Completá tu onboarding</p>
            <p className="text-sky-100/80">Necesitamos generar tus tareas para habilitar Innerbloom.</p>
          </div>
          <Link
            to="/intro-journey"
            className="ml-auto inline-flex rounded-full border border-sky-200/50 bg-sky-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
          >
            Hacer onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showJourneyPreparing && (
        <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-fuchsia-300" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-white">Tu Journey se está preparando</p>
              <p className="text-fuchsia-100/80">Estamos generando tus primeras misiones personalizadas.</p>
              <p className="text-fuchsia-100/80">Esto puede tardar unos minutos.</p>
            </div>
          </div>
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
            {canSchedule && (
              <button
                type="button"
                onClick={onScheduleClick}
                className="ml-auto inline-flex rounded-full border border-indigo-200/50 bg-indigo-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:border-indigo-200/80 hover:bg-indigo-200/20"
              >
                Programar Daily Quest
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-indigo-100/70">
            Configurá tu recordatorio desde el scheduler que está más abajo en el dashboard.
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
            <Link
              to="/editor"
              className="ml-auto inline-flex rounded-full border border-amber-200/50 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              Editar base
            </Link>
          </div>
          <p className="mt-2 text-xs text-amber-100/70">
            Este aviso desaparece cuando tu registro diario queda confirmado en la nueva app.
          </p>
        </div>
      )}
    </div>
  );
}
