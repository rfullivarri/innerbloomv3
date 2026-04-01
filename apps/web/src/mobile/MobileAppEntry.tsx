import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { BrandWordmark } from '../components/layout/BrandWordmark';
import { useAuth } from '../auth/runtimeAuth';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';
import { useBackendUser } from '../hooks/useBackendUser';
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';
import { resolveAuthLanguage } from '../lib/authLanguage';
import { isNativeCapacitorPlatform, openUrlInCapacitorBrowser } from './capacitor';
import {
  buildNativeMobileAuthUrl,
  setForceNativeWelcome,
  shouldForceNativeWelcome,
  useMobileAuthSession,
  type MobileAuthMode,
} from './mobileAuthSession';
import type { OnboardingProgress } from '../lib/api';

function MobileEntryShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(36,59,112,0.96),rgba(20,29,72,0.98))] p-6 shadow-[0_24px_80px_rgba(7,14,40,0.44)] backdrop-blur-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.4em] text-white/58">
            <BrandWordmark className="gap-2" textClassName="tracking-[0.4em]" iconClassName="h-[1.8em]" />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/72">{description}</p>
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}

function MobileEntryLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <MobileEntryShell title={title} description={description} />;
}

function MobileEntryError({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <MobileEntryShell title={title} description={description}>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.35)] transition hover:bg-[#8b5cf6]"
      >
        Reintentar
      </button>
    </MobileEntryShell>
  );
}

function MobileWelcome() {
  const language = resolveAuthLanguage(typeof window !== 'undefined' ? window.location.search : '');

  const openNativeAuth = async (mode: 'sign-in' | 'sign-up') => {
    setForceNativeWelcome(false);
    const mobileAuthUrl = buildNativeMobileAuthUrl(mode, language);
    await openUrlInCapacitorBrowser(mobileAuthUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.75rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] text-white">
      <div className="flex min-h-[82vh] w-full max-w-md flex-col">
        <div className="pt-3 text-center">
          <div className="flex items-center justify-center text-[17px] font-semibold uppercase tracking-[0.42em] text-white/66">
            <BrandWordmark className="gap-3.5" textClassName="tracking-[0.42em]" iconClassName="h-[3.2em]" />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-1 pb-3 pt-6">
          <div className="px-2">
            <img
              src="/og/neneOG4.jpg"
              alt="Innerbloom hero"
              className="h-[37vh] min-h-[300px] w-full rounded-[1.75rem] object-cover object-center shadow-[0_24px_70px_rgba(15,23,42,0.38)]"
            />
          </div>

          <div className="flex flex-1 flex-col justify-end pt-7">
            <div className="space-y-3 text-center">
              <h1 className="text-[2.4rem] font-semibold tracking-tight text-white">Bienvenido</h1>
            </div>

            <div className="mt-8 space-y-3 px-2">
              <button
                type="button"
                onClick={() => void openNativeAuth('sign-in')}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_44px_rgba(124,58,237,0.35)] transition hover:bg-[#8b5cf6]"
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => void openNativeAuth('sign-up')}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Crear cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isNativeOnboardingCompleted(progress: OnboardingProgress | null | undefined): boolean {
  if (!progress) {
    return false;
  }

  return Boolean(
    progress.state === 'completed' ||
    progress.returned_to_dashboard_after_first_edit_at ||
    progress.first_daily_quest_completed_at ||
    progress.daily_quest_scheduled_at ||
    progress.first_task_edited_at,
  );
}

function resolveNativeEntryRoute({
  authMode,
  isOnboardingComplete,
  dashboardPath,
}: {
  authMode: MobileAuthMode | null;
  isOnboardingComplete: boolean;
  dashboardPath: string;
}): string {
  if (authMode === 'sign-in') {
    return dashboardPath;
  }

  if (authMode === 'sign-up') {
    return isOnboardingComplete ? dashboardPath : '/intro-journey';
  }

  return isOnboardingComplete ? dashboardPath : '/intro-journey';
}

export function MobileAppEntry() {
  const { isLoaded, isSignedIn } = useAuth();
  const backendUser = useBackendUser();
  const onboarding = useOnboardingProgress();
  const mobileAuthSession = useMobileAuthSession();
  const isNativeApp = isNativeCapacitorPlatform();
  const forceNativeWelcome = isNativeApp && shouldForceNativeWelcome();
  const hasNativeCallbackSession = isNativeApp && Boolean(mobileAuthSession?.token) && !forceNativeWelcome;
  const hasEffectiveSession = isSignedIn || hasNativeCallbackSession;
  const dashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;
  const nativeAuthMode = isNativeApp ? mobileAuthSession?.authMode ?? null : null;
  const onboardingSignals = {
    state: onboarding.progress?.state ?? null,
    returnedToDashboardAfterFirstEditAt: onboarding.progress?.returned_to_dashboard_after_first_edit_at ?? null,
    firstDailyQuestCompletedAt: onboarding.progress?.first_daily_quest_completed_at ?? null,
    dailyQuestScheduledAt: onboarding.progress?.daily_quest_scheduled_at ?? null,
    firstTaskEditedAt: onboarding.progress?.first_task_edited_at ?? null,
  };
  const isOnboardingComplete = isNativeApp
    ? isNativeOnboardingCompleted(onboarding.progress)
    : onboarding.progress?.state === 'completed';
  const finalRoute = isNativeApp
    ? resolveNativeEntryRoute({
        authMode: nativeAuthMode,
        isOnboardingComplete,
        dashboardPath,
      })
    : (isOnboardingComplete ? dashboardPath : '/intro-journey');

  useEffect(() => {
    console.info('[mobile-entry] mounted', {
      isNativeApp,
      hasNativeCallbackSession,
      authMode: nativeAuthMode,
    });

    return () => {
      console.info('[mobile-entry] unmounted', {
        isNativeApp,
        hasNativeCallbackSession,
        authMode: nativeAuthMode,
      });
    };
  }, [hasNativeCallbackSession, isNativeApp, nativeAuthMode]);

  useEffect(() => {
    if (onboarding.status !== 'success') {
      return;
    }
    console.info('[mobile-entry] onboarding routing decision', {
      nativeDetected: isNativeApp,
      authMode: nativeAuthMode,
      onboardingState: onboardingSignals.state,
      onboardingSignals,
      finalRoute,
    });
  }, [
    dashboardPath,
    isNativeApp,
    isOnboardingComplete,
    nativeAuthMode,
    onboarding.status,
    onboardingSignals.dailyQuestScheduledAt,
    onboardingSignals.firstDailyQuestCompletedAt,
    onboardingSignals.firstTaskEditedAt,
    onboardingSignals.returnedToDashboardAfterFirstEditAt,
    onboardingSignals.state,
  ]);

  if (!isLoaded && !hasNativeCallbackSession) {
    return (
      <MobileEntryLoading
        title="Preparando Innerbloom"
        description="Estamos cargando tu sesión y el estado base de la app."
      />
    );
  }

  if (!hasEffectiveSession) {
    return <MobileWelcome />;
  }

  if (backendUser.status === 'error') {
    return (
      <MobileEntryError
        title="No pudimos cargar tu perfil"
        description="La sesión existe, pero no pudimos resolver tu estado de app. Reintenta y, si persiste, revisa la conexión con la API."
        onRetry={backendUser.reload}
      />
    );
  }

  if (backendUser.status !== 'success') {
    return (
      <MobileEntryLoading
        title="Cargando tu perfil"
        description="Estamos comprobando tu estado de cuenta antes de enviarte a la experiencia correcta."
      />
    );
  }

  if (onboarding.status === 'error') {
    return (
      <MobileEntryError
        title="No pudimos revisar tu onboarding"
        description="Necesitamos saber si ya terminaste la configuración inicial para enviarte al lugar correcto."
        onRetry={() => {
          void onboarding.reload();
        }}
      />
    );
  }

  if (onboarding.status !== 'success') {
    return (
      <MobileEntryLoading
        title="Revisando tu recorrido"
        description="Estamos verificando si ya completaste el onboarding."
      />
    );
  }

  if (!isOnboardingComplete) {
    if (finalRoute === '/intro-journey') {
      return <Navigate to="/intro-journey" replace />;
    }
  }

  return <Navigate to={finalRoute} replace />;
}
