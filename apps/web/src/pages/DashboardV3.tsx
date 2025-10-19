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

import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useRef } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
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
import { useBackendUser } from '../hooks/useBackendUser';
import { useRequest } from '../hooks/useRequest';
import { DevErrorBoundary } from '../components/DevErrorBoundary';
import { getUserState } from '../lib/api';
import { DailyQuestModal, type DailyQuestModalHandle } from '../components/DailyQuestModal';
import { normalizeGameModeValue, type GameMode } from '../lib/gameMode';
import { RewardsSection } from '../components/dashboard-v3/RewardsSection';
import { Card } from '../components/common/Card';
import {
  DASHBOARD_SECTIONS,
  dashboardSection,
  getActiveSection,
  missionsSection,
  rewardsSection,
  type DashboardSectionConfig,
} from './dashboardSections';

export default function DashboardV3Page() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { backendUserId, status, error, reload, clerkUserId, profile } = useBackendUser();
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
  const profileGameMode = deriveGameModeFromProfile(profile?.game_mode);
  const shouldFetchUserState = Boolean(backendUserId && !profileGameMode);
  const { data: userState } = useRequest(
    () => getUserState(backendUserId!),
    [backendUserId],
    { enabled: shouldFetchUserState },
  );

  const rawGameMode = userState?.mode_name ?? userState?.mode ?? profileGameMode ?? null;
  const normalizedGameMode = normalizeGameModeValue(rawGameMode);
  const gameMode = normalizedGameMode ?? (typeof rawGameMode === 'string' ? rawGameMode : null);

  useEffect(() => {
    if (!clerkUserId || typeof window === 'undefined') {
      return;
    }

    let hasTimezoneBeenSet = false;

    try {
      hasTimezoneBeenSet = window.localStorage.getItem('tzSet') === 'true';
    } catch (error) {
      console.warn('Failed to access timezone flag in localStorage', error);
    }

    if (hasTimezoneBeenSet) {
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const updateTimezone = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        await fetch('/api/me/timezone', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ timezone }),
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Failed to update user timezone', error);
      } finally {
        try {
          window.localStorage.setItem('tzSet', 'true');
        } catch (storageError) {
          console.warn('Failed to persist timezone flag in localStorage', storageError);
        }
      }
    };

    void updateTimezone();
  }, [clerkUserId, getToken]);

  if (!clerkUserId) {
    return null;
  }

  const isLoadingProfile = status === 'idle' || status === 'loading';
  const failedToLoadProfile = status === 'error' || !backendUserId;

  const avatarUrl = profile?.image_url || user?.imageUrl;
  const dailyButtonRef = useRef<HTMLButtonElement | null>(null);
  const dailyQuestModalRef = useRef<DailyQuestModalHandle | null>(null);

  const handleOpenDaily = useCallback(() => {
    dailyQuestModalRef.current?.open();
  }, []);

  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar
          onDailyClick={backendUserId ? handleOpenDaily : undefined}
          dailyButtonRef={dailyButtonRef}
          title={activeSection.pageTitle}
          sections={DASHBOARD_SECTIONS}
        />
        <DailyQuestModal
          ref={dailyQuestModalRef}
          enabled={Boolean(backendUserId)}
          returnFocusRef={dailyButtonRef}
        />
        <main className="flex-1 pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            {isLoadingProfile && <ProfileSkeleton />}

            {failedToLoadProfile && !isLoadingProfile && (
              <>
                <ProfileErrorState onRetry={reload} error={error} />
                <DashboardFallback />
              </>
            )}

            {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
              <Routes>
                <Route
                  index
                  element={
                    <DashboardOverview
                      userId={backendUserId}
                      avatarUrl={avatarUrl}
                      gameMode={gameMode}
                      weeklyTarget={profile?.weekly_target ?? null}
                      section={dashboardSection}
                    />
                  }
                />
                <Route
                  path="missions"
                  element={<MissionsView userId={backendUserId} section={missionsSection} />}
                />
                <Route
                  path="rewards"
                  element={<RewardsView userId={backendUserId} section={rewardsSection} />}
                />
                <Route path="*" element={<Navigate to="." replace />} />
              </Routes>
            )}
          </div>
        </main>
        <MobileBottomNav
          items={DASHBOARD_SECTIONS.map((section) => {
            const Icon = section.icon;

            return {
              key: section.key,
              label: section.label,
              to: section.to,
              icon: <Icon className="h-5 w-5" />,
              end: section.end,
            };
          })}
        />
      </div>
    </DevErrorBoundary>
  );
}

interface DashboardOverviewProps {
  userId: string;
  avatarUrl?: string | null;
  gameMode: GameMode | string | null;
  weeklyTarget: number | null;
  section: DashboardSectionConfig;
}

function DashboardOverview({ userId, avatarUrl, gameMode, weeklyTarget, section }: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="order-1 lg:col-span-12">
          <Alerts userId={userId} />
        </div>

        <div className="order-2 space-y-4 md:space-y-5 lg:order-2 lg:col-span-4">
          <MetricHeader userId={userId} gameMode={gameMode} />
          <ProfileCard imageUrl={avatarUrl} />
          <EnergyCard userId={userId} gameMode={gameMode} />
          <DailyCultivationSection userId={userId} />
        </div>

        <div className="order-3 space-y-4 md:space-y-5 lg:order-3 lg:col-span-4">
          <RadarChartCard userId={userId} />
          <EmotionChartCard userId={userId} />
        </div>

        <div className="order-4 space-y-4 md:space-y-5 lg:order-4 lg:col-span-4">
          {FEATURE_STREAKS_PANEL_V1 && <LegacyStreaksPanel userId={userId} />}
          <StreaksPanel userId={userId} gameMode={gameMode} weeklyTarget={weeklyTarget} />
        </div>
      </div>
    </div>
  );
}

function MissionsView({ userId, section }: { userId: string; section: DashboardSectionConfig }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <MissionsSection userId={userId} />
    </div>
  );
}

function RewardsView({ userId, section }: { userId: string; section: DashboardSectionConfig }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <RewardsSection userId={userId} />
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  pageTitle: string;
}

function SectionHeader({ eyebrow, title, description, pageTitle }: SectionHeaderProps) {
  const normalizedTitle = title.trim();
  const normalizedPageTitle = pageTitle.trim();
  const shouldShowTitle =
    normalizedTitle.length > 0 &&
    normalizedTitle.toLowerCase() !== normalizedPageTitle.toLowerCase();
  const normalizedEyebrow = eyebrow?.trim() ?? '';
  const shouldShowEyebrow = normalizedEyebrow.length > 0;
  const normalizedDescription = description?.trim() ?? '';
  const shouldShowDescription = normalizedDescription.length > 0;

  return (
    <header className="space-y-2">
      <h1 className="sr-only">{pageTitle}</h1>
      {shouldShowEyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {normalizedEyebrow}
        </p>
      )}
      {shouldShowTitle && (
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      )}
      {shouldShowDescription && (
        <p className="text-sm text-slate-400">{normalizedDescription}</p>
      )}
    </header>
  );
}

function deriveGameModeFromProfile(mode?: string | null): GameMode | null {
  return normalizeGameModeValue(mode);
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

function DashboardFallback() {
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Vista previa sin conexión</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-white">Estamos preparando tu Dashboard</h2>
        <p className="mt-2 text-sm text-slate-300">
          Conservá esta ventana abierta: los datos de XP, emociones y misiones aparecerán automáticamente cuando recuperemos la conexión con el servidor.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <Card
            title="XP diario"
            subtitle="Se actualizará al reconectar"
            className="min-h-[180px]"
          >
            <div className="space-y-3 text-sm text-slate-200">
              <FallbackMetric label="Quests completadas" value="0 / —" />
              <FallbackMetric label="XP hoy" value="—" />
              <p className="text-xs text-slate-400">Tu progreso diario aparece acá cuando la API responde.</p>
            </div>
          </Card>

          <Card title="Perfil" subtitle="Foto y game mode" className="min-h-[180px]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-white/10 bg-white/10" />
              <div className="space-y-2 text-xs text-slate-300">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-3 w-16 rounded bg-white/10" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">Mostramos tus datos personales en cuanto podamos sincronizar tu perfil.</p>
          </Card>
        </div>

        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <Card title="Pilares" subtitle="Body · Mind · Soul" className="min-h-[180px]">
            <div className="grid grid-cols-3 gap-3 text-xs">
              {['Body', 'Mind', 'Soul'].map((pillar) => (
                <div
                  key={pillar}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-slate-200"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{pillar}</p>
                  <p className="mt-2 text-lg font-semibold text-white">—</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Las barras de XP por pilar se activan cuando recuperemos datos.</p>
          </Card>

          <Card title="Emociones" subtitle="Últimos 7 días" className="min-h-[180px]">
            <div className="h-24 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-800/60 via-slate-900/40 to-slate-800/60" />
            <p className="text-xs text-slate-400">El mapa emocional vuelve automáticamente una vez que la API responda.</p>
          </Card>
        </div>

        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <Card title="Rachas" subtitle="Seguimiento semanal" className="min-h-[180px]">
            <div className="space-y-3 text-xs text-slate-300">
              <FallbackMetric label="Daily Quest" value="En espera" />
              <FallbackMetric label="Weekly XP" value="Sin datos" />
              <p className="text-xs text-slate-400">Apenas detectemos actividad, tus rachas se renderizan acá.</p>
            </div>
          </Card>

          <Card title="Rewards" subtitle="Logros desbloqueados" className="min-h-[180px]">
            <div className="space-y-2 text-xs text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Siguiente badge</p>
                <p className="mt-2 text-sm text-white">Disponible al reconectar</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Último logro</p>
                <p className="mt-2 text-sm text-white">Sincronizando…</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FallbackMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

