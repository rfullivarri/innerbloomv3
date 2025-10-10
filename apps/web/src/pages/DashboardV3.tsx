/**
 * Endpoints utilizados en esta vista:
 * - GET /users/:id/xp/total → XP total para la tarjeta principal.
 * - GET /users/:id/level → Nivel actual; el XP restante se estima client-side con una curva cuadrática.
 * - GET /users/:id/state → Game mode y barras de Daily Energy.
 * - GET /users/:id/xp/daily → Serie diaria de XP (Daily Cultivation + XP semanal del panel de rachas).
 * - GET /users/:id/xp/by-trait → Radar Chart (XP real por rasgo/pilar principal).
 * - GET /users/:id/emotions → Línea temporal de emociones (mapa emotion_id → etiqueta legible).
 * - GET /users/:id/tasks → Tareas activas reutilizadas para panel de rachas y misiones.
 * - GET /users/:id/journey → Avisos iniciales (confirmación de base / scheduler).
 * Derivaciones client-side: xp faltante y barra de nivel se calculan con una curva estimada; panel de rachas muestra métricas de XP mientras esperamos daily_log_raw.
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
import {
  FEATURE_STREAKS_PANEL_V1,
  LegacyStreaksPanel,
  StreaksPanel,
} from '../components/dashboard/StreaksPanel';
import { Card } from '../components/ui/Card';
import { useBackendUser } from '../hooks/useBackendUser';
import { useRequest } from '../hooks/useRequest';
import { DevErrorBoundary } from '../components/DevErrorBoundary';
import { getUserState } from '../lib/api';

export default function DashboardV3Page() {
  const { user } = useUser();
  const { backendUserId, status, error, reload, clerkUserId, profile } = useBackendUser();
  const profileGameMode = deriveGameModeFromProfile(profile?.game_mode);
  const shouldFetchUserState = Boolean(backendUserId && !profileGameMode);
  const { data: userState } = useRequest(
    () => getUserState(backendUserId!),
    [backendUserId],
    { enabled: shouldFetchUserState },
  );

  const gameMode = userState?.mode_name ?? userState?.mode ?? profileGameMode ?? null;

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
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            {isLoadingProfile && <ProfileSkeleton />}

            {failedToLoadProfile && !isLoadingProfile && (
              <ProfileErrorState onRetry={reload} error={error} />
            )}

            {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
              <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
                <div className="order-1 lg:order-1 lg:col-span-12">
                  <Alerts userId={backendUserId} />
                </div>

                <div className="order-2 space-y-4 md:space-y-5 lg:order-2 lg:col-span-4">
                  <MetricHeader userId={backendUserId} gameMode={gameMode} />
                  <ProfileCard imageUrl={avatarUrl} />
                  <EnergyCard userId={backendUserId} gameMode={gameMode} />
                  <DailyCultivationSection userId={backendUserId} />
                </div>

                <div className="order-3 space-y-4 md:space-y-5 lg:order-3 lg:col-span-4">
                  <RadarChartCard userId={backendUserId} />
                  <EmotionChartCard userId={backendUserId} />
                </div>

                <div className="order-4 space-y-4 md:space-y-5 lg:order-4 lg:col-span-4">
                  {FEATURE_STREAKS_PANEL_V1 && <LegacyStreaksPanel userId={backendUserId} />}
                  <StreaksPanel
                    userId={backendUserId}
                    gameMode={gameMode}
                    weeklyTarget={profile?.weekly_target}
                  />
                  <RewardsPlaceholder />
                </div>

                <div className="order-5 lg:order-5 lg:col-span-12">
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

function deriveGameModeFromProfile(mode?: string | null): string | null {
  if (typeof mode !== 'string') {
    return null;
  }

  const trimmed = mode.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const normalized = trimmed.toLowerCase();

  const aliasMap: Record<string, string> = {
    'flow mood': 'flow',
    'flow_mood': 'flow',
    'flowmode': 'flow',
    'standard': 'flow',
    'seedling': 'flow',
    'low mood': 'low',
    'low_mood': 'low',
    'lowmode': 'low',
    'evol': 'evolve',
  };

  const canonical = aliasMap[normalized] ?? normalized;

  switch (canonical) {
    case 'low':
      return 'Low';
    case 'chill':
      return 'Chill';
    case 'flow':
      return 'Flow';
    case 'evolve':
      return 'Evolve';
    default:
      return null;
  }
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-12">
          <div className="h-32 w-full animate-pulse rounded-2xl bg-white/10" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-36 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-56 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/10" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-72 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-72 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />
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
