import { Link } from 'react-router-dom';
import { useDailyQuestReadiness } from '../../hooks/useDailyQuestReadiness';
import type { UserJourneySummary } from '../../lib/api';

interface AlertsProps {
  userId: string;
  isJourneyGenerating?: boolean;
  showOnboardingGuidance?: boolean;
  onScheduleClick?: () => void;
  suppressJourneyPreparing?: boolean;
}

function shouldShowSchedulerWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  // Scheduler banner only appears at the final onboarding stage.
  return journey.first_programmed === false;
}

export function Alerts({
  userId,
  isJourneyGenerating = false,
  showOnboardingGuidance,
  onScheduleClick,
  suppressJourneyPreparing = false,
}: AlertsProps) {
  const {
    hasTasks,
    firstTasksConfirmed,
    completedFirstDailyQuest,
    showJourneyPreparing,
    tasksStatus,
    journeyStatus,
    journey,
  } = useDailyQuestReadiness(userId, { isJourneyGenerating });

  const showScheduler =
    hasTasks &&
    firstTasksConfirmed &&
    completedFirstDailyQuest &&
    shouldShowSchedulerWarning(journey);
  const canSchedule = typeof onScheduleClick === 'function';

  if (tasksStatus === 'loading' || (hasTasks && journeyStatus === 'loading')) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5/40 p-4" />
      </div>
    );
  }

  const shouldShowOnboardingGuidance = showOnboardingGuidance ?? (!hasTasks || !firstTasksConfirmed);

  if (tasksStatus === 'success' && shouldShowOnboardingGuidance && !hasTasks && !showJourneyPreparing) {
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
      {showJourneyPreparing && !suppressJourneyPreparing && (
        <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-4 w-4 flex-none animate-spin rounded-full border-2 border-fuchsia-200/30 border-t-fuchsia-200"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-semibold text-white">Tu Journey se está preparando</p>
              <p className="text-fuchsia-100/80">Estamos generando tus primeras misiones personalizadas.</p>
              <p className="text-fuchsia-100/80">Esto puede tardar unos minutos.</p>
            </div>
          </div>
        </div>
      )}

      {!showJourneyPreparing && hasTasks && !firstTasksConfirmed && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-amber-300" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-white">Confirmá tu base</p>
              <p className="text-amber-100/80">
                Editá al menos una tarea para confirmar tu base y desbloquear el siguiente paso.
              </p>
            </div>
            <Link
              to="/editor"
              className="ml-auto inline-flex rounded-full border border-amber-200/50 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              Editar tareas
            </Link>
          </div>
        </div>
      )}

      {!showJourneyPreparing && hasTasks && firstTasksConfirmed && !completedFirstDailyQuest && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-sky-300" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-white">Realizá tu primer Daily Quest</p>
              <p className="text-sky-100/80">
                Completá tu primer check-in diario para activar tu progreso y tus rachas.
              </p>
            </div>
          </div>
        </div>
      )}

      {!showJourneyPreparing && showScheduler && (
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
    </div>
  );
}
