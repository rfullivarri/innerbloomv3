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
import { XpSummaryCard } from '../components/dashboard-v3/XpSummaryCard';
import { EnergyCard } from '../components/dashboard-v3/EnergyCard';
import { DailyCultivationSection } from '../components/dashboard-v3/DailyCultivationSection';
import { RadarChartCard } from '../components/dashboard-v3/RadarChartCard';
import { EmotionTimeline } from '../components/dashboard-v3/EmotionTimeline';
import { StreakPanel } from '../components/dashboard-v3/StreakPanel';
import { MissionsSection } from '../components/dashboard-v3/MissionsSection';
import { useBackendUser } from '../hooks/useBackendUser';

export default function DashboardV3Page() {
  const { user } = useUser();
  const { backendUserId, status, error, reload, clerkUserId } = useBackendUser();

  if (!clerkUserId) {
    return null;
  }

  const isLoadingProfile = status === 'idle' || status === 'loading';
  const failedToLoadProfile = status === 'error' || !backendUserId;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pb-16 pt-6 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {isLoadingProfile && <ProfileSkeleton />}

          {failedToLoadProfile && !isLoadingProfile && (
            <ProfileErrorState onRetry={reload} error={error} />
          )}

          {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
            <>
              <Alerts userId={backendUserId} />
              <div className="grid gap-6 lg:grid-cols-[320px_1fr_320px]">
                <div className="space-y-6">
                  <XpSummaryCard userId={backendUserId} />
                  <AvatarCard imageUrl={user?.imageUrl} name={user?.fullName || user?.primaryEmailAddress?.emailAddress || ''} />
                  <EnergyCard userId={backendUserId} />
                  <DailyCultivationSection userId={backendUserId} />
                </div>
                <div className="space-y-6">
                  <RadarChartCard userId={backendUserId} />
                  <EmotionTimeline userId={backendUserId} />
                </div>
                <div className="space-y-6">
                  <StreakPanel userId={backendUserId} />
                  <RewardsPlaceholder />
                </div>
              </div>
              <MissionsSection userId={backendUserId} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

interface AvatarCardProps {
  imageUrl?: string | null;
  name?: string | null;
}

function ProfileSkeleton() {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-white/5" />
    </section>
  );
}

interface ProfileErrorStateProps {
  onRetry: () => void;
  error: Error | null;
}

function ProfileErrorState({ onRetry, error }: ProfileErrorStateProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100 backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold text-white">No pudimos conectar con tu perfil</h2>
        <p className="mt-2 text-sm text-rose-100/80">
          Verificá tu conexión e intentá cargar nuevamente la información de tu Daily Quest.
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

function AvatarCard({ imageUrl, name }: AvatarCardProps) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-text backdrop-blur">
      <div className="h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/10">
        {imageUrl ? (
          <img src={imageUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-white">👤</div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-text-muted">Tu avatar</p>
        <p className="text-lg font-semibold text-white">{name || 'Jugador/a'}</p>
      </div>
      <button
        type="button"
        disabled
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text"
      >
        Próximamente: cambiar avatar
      </button>
    </section>
  );
}

function RewardsPlaceholder() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <h3 className="text-lg font-semibold text-white">🎁 Rewards</h3>
      <p className="mt-4 text-sm text-text-muted">
        El módulo de recompensas del MVP todavía no tiene endpoints públicos. Lo habilitaremos en esta vista cuando esté
        disponible.
      </p>
    </section>
  );
}
