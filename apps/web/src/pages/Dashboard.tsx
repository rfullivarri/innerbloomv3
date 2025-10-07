import { useBackendUser } from '../hooks/useBackendUser';
import { AchievementsList } from '../components/dashboard/AchievementsList';
import { EmotionHeatmap } from '../components/dashboard/EmotionHeatmap';
import { LevelCard } from '../components/dashboard/LevelCard';
import { PillarsSection } from '../components/dashboard/PillarsSection';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { StreakCard } from '../components/dashboard/StreakCard';
import { Navbar } from '../components/layout/Navbar';
import { DevErrorBoundary } from '../components/DevErrorBoundary';

export default function DashboardPage() {
  const { backendUserId, status, error, reload, clerkUserId } = useBackendUser();

  if (!clerkUserId) {
    return null;
  }

  const isLoadingProfile = status === 'idle' || status === 'loading';
  const failedToLoadProfile = status === 'error' || !backendUserId;

  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 px-4 pb-16 pt-6 md:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          {isLoadingProfile && <LegacyDashboardSkeleton />}

          {failedToLoadProfile && !isLoadingProfile && (
            <LegacyDashboardError onRetry={reload} error={error} />
          )}

          {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
            <>
              <section className="glass-card rounded-3xl border border-white/10 px-6 py-8 text-text shadow-glow">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-text-subtle">Game Mode</p>
                    <h2 className="font-display text-3xl font-semibold text-white">Chill mode engaged</h2>
                    <p className="text-sm text-text-subtle">
                      Keep stacking wins across Body · Mind · Soul. Your next mission summary lands every Sunday evening.
                    </p>
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-text-subtle">
                    <div className="flex items-center justify-between gap-6">
                      <span>Daily quests</span>
                      <strong className="text-xl text-white">3</strong>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span>XP today</span>
                      <strong className="text-xl text-white">—</strong>
                    </div>
                    <p className="text-xs text-text-muted">TODO: Replace with live mission payload when available.</p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <LevelCard userId={backendUserId} />
                <StreakCard userId={backendUserId} />
              </section>

              <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <PillarsSection />
                <EmotionHeatmap userId={backendUserId} />
              </section>

              <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <RecentActivity userId={backendUserId} />
                <AchievementsList />
              </section>
            </>
          )}
          </div>
        </main>
      </div>
    </DevErrorBoundary>
  );
}

function LegacyDashboardSkeleton() {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-text">
      <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-white/5" />
    </section>
  );
}

interface LegacyDashboardErrorProps {
  onRetry: () => void;
  error: Error | null;
}

function LegacyDashboardError({ onRetry, error }: LegacyDashboardErrorProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
      <div>
        <h2 className="text-lg font-semibold text-white">No pudimos cargar tu dashboard</h2>
        <p className="mt-2 text-sm text-rose-100/80">
          Hubo un problema para conectar con tu progreso. Reintentá en unos segundos.
        </p>
      </div>
      {error?.message && <p className="text-xs text-rose-100/60">{error.message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-full border border-rose-300/40 bg-rose-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-rose-200/70 hover:bg-rose-200/20"
      >
        Reintentar
      </button>
    </section>
  );
}
