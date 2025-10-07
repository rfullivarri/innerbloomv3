/**
 * Endpoints utilizados en esta vista:
 * - GET /users/:id/xp/total → XP total para la tarjeta principal.
 * - GET /users/:id/level → Nivel actual; el XP restante se estima client-side con una curva cuadrática.
 * - GET /users/:id/state → Game mode y barras de Daily Energy.
 * - GET /users/:id/xp/daily → Serie diaria de XP (Daily Cultivation + XP semanal del panel de rachas).
 * - GET /users/:id/state/timeseries → Radar Chart (usa la energía promedio como proxy de XP por rasgo ante la falta de habitos_by_rasgo).
 * - GET /users/:id/emotions → Línea temporal de emociones (mapa emotion_id → etiqueta legible).
 * - GET /users/:id/tasks → Tareas activas reutilizadas para panel de rachas y misiones.
 * - GET /users/:id/journey → Avisos iniciales (confirmación de base / scheduler).
 * Derivaciones client-side: xp faltante y barra de nivel se calculan con una curva estimada; radar usa energía promedio; panel de rachas muestra métricas de XP mientras esperamos daily_log_raw.
 */

import { useUser } from '@clerk/clerk-react';
import { Navbar } from '../components/layout/Navbar';
import { Alerts } from '../components/dashboard-v3/Alerts';
import { EnergyCard } from '../components/dashboard-v3/EnergyCard';
import { DailyCultivationSection } from '../components/dashboard-v3/DailyCultivationSection';
import { MissionsSection } from '../components/dashboard-v3/MissionsSection';
import { ProfileCard } from '../components/dashboard-v3/ProfileCard';
import { MetricHeader } from '../components/dashboard/MetricHeader';
import { RadarChartCard } from '../components/dashboard/RadarChartCard';
import { EmotionChartCard } from '../components/dashboard/EmotionChartCard';
import { StreaksPanel } from '../components/dashboard/StreaksPanel';
import { Card } from '../components/ui/Card';
import { useBackendUser } from '../hooks/useBackendUser';
import { DevErrorBoundary } from '../components/DevErrorBoundary';

export default function DashboardV3Page() {
  const { user } = useUser();
  const { backendUserId, status, error, reload, clerkUserId, profile } = useBackendUser();

  if (!clerkUserId) {
    return null;
  }

  const isLoadingProfile = status === 'idle' || status === 'loading';
  const failedToLoadProfile = status === 'error' || !backendUserId;

  const avatarUrl = profile?.image_url || user?.imageUrl;
  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            {isLoadingProfile && <ProfileSkeleton />}

            {failedToLoadProfile && !isLoadingProfile && (
              <ProfileErrorState onRetry={reload} error={error} />
            )}

            {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12 lg:gap-6">
                <div className="lg:col-span-12 space-y-4">
                  <MetricHeader userId={backendUserId} />
                  <Alerts userId={backendUserId} />
                </div>

                <div className="lg:col-span-7 space-y-4 md:space-y-5">
                  <RadarChartCard userId={backendUserId} />
                  <EmotionChartCard userId={backendUserId} />
                  <DailyCultivationSection userId={backendUserId} />
                </div>


                <div className="lg:col-span-5 space-y-4 md:space-y-5">
                  <ProfileCard imageUrl={avatarUrl} />
                  <EnergyCard userId={backendUserId} />
                  <StreaksPanel userId={backendUserId} />

                <div className="space-y-6">
                  <StreakPanel
                    userId={backendUserId}
                    gameMode={profile?.game_mode}
                    weeklyTarget={profile?.weekly_target}
                  />

                  <RewardsPlaceholder />
                </div>

                <div className="lg:col-span-12">
                  <MissionsSection userId={backendUserId} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </DevErrorBoundary>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-56 w-full animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

interface ProfileErrorStateProps {
  onRetry: () => void;
  error: Error | null;
}

function ProfileErrorState({ onRetry, error }: ProfileErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">No pudimos conectar con tu perfil</h2>
          <p className="mt-1 text-sm text-rose-100/80">
            Verificá tu conexión e intentá cargar nuevamente la información de tu Daily Quest.
          </p>
        </div>
        {error?.message && <p className="text-xs text-rose-100/70">{error.message}</p>}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-full border border-rose-200/50 bg-rose-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-rose-100/70 hover:bg-rose-100/20"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

function RewardsPlaceholder() {
  return (
    <Card title="🎁 Rewards" subtitle="Muy pronto" bodyClassName="gap-3">
      <p className="text-sm text-slate-400">
        El módulo de recompensas del MVP todavía no tiene endpoints públicos. Lo habilitaremos en esta vista cuando esté disponible.
      </p>
    </Card>
  );
}
