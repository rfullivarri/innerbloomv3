import { Link } from 'react-router-dom';
import type { AsyncStatus } from '../../hooks/useRequest';
import type { UserJourneySummary } from '../../lib/api';

interface AlertsProps {
  hasTasks: boolean;
  firstTasksConfirmed: boolean;
  completedFirstDailyQuest: boolean;
  showJourneyPreparing: boolean;
  taskgenInProgress?: boolean;
  taskgenTimedOutWithError?: boolean;
  tasksStatus: AsyncStatus;
  journeyStatus: AsyncStatus;
  journey: UserJourneySummary | null;
  dailyQuestScheduled?: boolean;
  showOnboardingGuidance?: boolean;
  onScheduleClick?: () => void;
  suppressJourneyPreparing?: boolean;
  showFirstDailyQuestCta?: boolean;
  onOpenFirstDailyQuest?: () => void;
}

function shouldShowSchedulerWarning(journey: UserJourneySummary | null): boolean {
  if (!journey) return false;
  // Scheduler banner only appears at the final onboarding stage.
  return journey.first_programmed === false;
}

export function Alerts({
  hasTasks,
  firstTasksConfirmed,
  completedFirstDailyQuest,
  showJourneyPreparing,
  taskgenInProgress = false,
  taskgenTimedOutWithError = false,
  tasksStatus,
  journeyStatus,
  journey,
  dailyQuestScheduled = false,
  showOnboardingGuidance,
  onScheduleClick,
  suppressJourneyPreparing = false,
  showFirstDailyQuestCta = false,
  onOpenFirstDailyQuest,
}: AlertsProps) {
  const showScheduler =
    hasTasks &&
    firstTasksConfirmed &&
    completedFirstDailyQuest &&
    !dailyQuestScheduled &&
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

  if (tasksStatus === 'success' && shouldShowOnboardingGuidance && !hasTasks && !showJourneyPreparing && !taskgenInProgress && !taskgenTimedOutWithError) {
    return (
      <div className="ib-onboarding-alert ib-onboarding-alert--info rounded-2xl p-4 text-sm">
        <div className="flex items-start gap-3">
          <span className="ib-onboarding-alert__dot mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
          <div className="space-y-1">
            <p className="ib-onboarding-alert__title font-semibold">Completá tu onboarding</p>
            <p className="ib-onboarding-alert__body">Necesitamos generar tus tareas para habilitar Innerbloom.</p>
          </div>
          <Link
            to="/intro-journey"
            className="ib-onboarding-alert__cta ib-chip-solid ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold"
          >
            Hacer onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(showJourneyPreparing || taskgenInProgress) && !suppressJourneyPreparing && (
        <div className="ib-onboarding-alert ib-onboarding-alert--progress rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span
              className="ib-onboarding-alert__dot ib-onboarding-alert__dot--spinner mt-0.5 inline-flex h-4 w-4 flex-none animate-spin rounded-full border-2"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="ib-onboarding-alert__title font-semibold">Tu Journey se está preparando</p>
              <p className="ib-onboarding-alert__body">Estamos generando tus primeras misiones personalizadas.</p>
              <p className="ib-onboarding-alert__body">Esto puede tardar unos minutos.</p>
            </div>
          </div>
        </div>
      )}

      {taskgenTimedOutWithError && !showJourneyPreparing && !taskgenInProgress && (
        <div className="ib-onboarding-alert ib-onboarding-alert--warning rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="ib-onboarding-alert__dot mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
            <div className="space-y-1">
              <p className="ib-onboarding-alert__title font-semibold">Tardamos más de lo esperado</p>
              <p className="ib-onboarding-alert__body">
                Hubo un problema al generar tus tareas. Reintentá el onboarding o contactá a soporte si persiste.
              </p>
            </div>
            <Link
              to="/intro-journey"
              className="ib-onboarding-alert__cta ib-chip-solid ib-chip-solid--warning ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold"
            >
              Reintentar
            </Link>
          </div>
        </div>
      )}

      {!showJourneyPreparing && hasTasks && !firstTasksConfirmed && (
        <div className="ib-onboarding-alert ib-onboarding-alert--warning rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="ib-onboarding-alert__dot mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
            <div className="space-y-1">
              <p className="ib-onboarding-alert__title font-semibold">Confirmá tu base</p>
              <p className="ib-onboarding-alert__body">
                Editá al menos una tarea para confirmar tu base y desbloquear el siguiente paso.
              </p>
            </div>
            <Link
              to="/editor"
              className="ib-onboarding-alert__cta ib-chip-solid ib-chip-solid--warning ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold"
            >
              Editar tareas
            </Link>
          </div>
        </div>
      )}

      {!showJourneyPreparing && hasTasks && firstTasksConfirmed && !completedFirstDailyQuest && showFirstDailyQuestCta && (
        <div className="ib-onboarding-alert ib-onboarding-alert--info rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="ib-onboarding-alert__dot mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
            <div className="space-y-1">
              <p className="ib-onboarding-alert__title font-semibold">Realizá tu primer Daily Quest</p>
              <p className="ib-onboarding-alert__body">
                Completá tu primer check-in diario para activar tu progreso y tus rachas.
              </p>
            </div>
            {onOpenFirstDailyQuest ? (
              <button
                type="button"
                onClick={onOpenFirstDailyQuest}
                className="ib-onboarding-alert__cta ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                Daily Quest
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!showJourneyPreparing && showScheduler && (
        <div className="ib-onboarding-alert ib-onboarding-alert--success rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="ib-onboarding-alert__dot mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
            <div className="space-y-1">
              <p className="ib-onboarding-alert__title font-semibold">Último paso! Programa tu Daily Quest</p>
              <p className="ib-onboarding-alert__body">
                Programá tu recordatorio para recibirlo automáticamente cada día
              </p>
            </div>
            {canSchedule && (
              <button
                type="button"
                onClick={onScheduleClick}
                className="ib-onboarding-alert__cta ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                Programar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
