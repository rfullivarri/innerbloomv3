import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const language = resolveAuthLanguage(typeof window !== 'undefined' ? window.location.search : '');
  const copy = language === 'en'
    ? {
        title: 'Welcome',
        googleSignIn: 'Log in with Google',
        signIn: 'Log in',
        signUp: 'Create account',
      }
    : {
        title: 'Bienvenido',
        googleSignIn: 'Iniciar sesión con Google',
        signIn: 'Iniciar sesión',
        signUp: 'Crear cuenta',
      };

  const openEmbeddedAuth = (mode: 'sign-in' | 'sign-up') => {
    setForceNativeWelcome(false);
    navigate(mode === 'sign-up' ? `/sign-up?lang=${language}` : `/login?lang=${language}`);
  };

  const openNativeGoogleAuth = async () => {
    setForceNativeWelcome(false);
    const mobileAuthUrl = buildNativeMobileAuthUrl('sign-in', language, { provider: 'google' });
    await openUrlInCapacitorBrowser(mobileAuthUrl);
  };

  return (
    <div className="flex h-dvh max-h-dvh min-h-dvh items-center justify-center overflow-hidden px-5 pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] text-white">
      <div className="flex h-full w-full max-w-md flex-col">
        <div className="shrink-0 pt-[clamp(0.25rem,1.1dvh,0.75rem)] text-center">
          <div className="flex items-center justify-center text-[clamp(0.82rem,2.1dvh,1.06rem)] font-semibold uppercase tracking-[0.42em] text-white/66">
            <BrandWordmark className="gap-3.5" textClassName="tracking-[0.42em]" iconClassName="h-[3.2em]" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-1 pb-[clamp(0.25rem,1.2dvh,0.75rem)] pt-[clamp(1rem,3dvh,1.5rem)]">
          <div className="min-h-0 shrink px-2">
            <img
              src="/og/neneOG4.jpg"
              alt="Innerbloom hero"
              className="h-[min(34dvh,300px)] min-h-[210px] w-full rounded-[1.65rem] object-cover object-center shadow-[0_24px_70px_rgba(15,23,42,0.38)]"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col pt-[clamp(1rem,3.2dvh,1.75rem)]">
            <div className="text-center">
              <h1 className="text-[clamp(2rem,5.2dvh,2.4rem)] font-semibold tracking-tight text-white">{copy.title}</h1>
            </div>

            <div className="mt-auto space-y-[clamp(0.55rem,1.5dvh,0.75rem)] px-2 pt-[clamp(1rem,4dvh,2.5rem)]">
              <button
                type="button"
                onClick={() => openEmbeddedAuth('sign-up')}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-[clamp(0.75rem,1.8dvh,0.875rem)] text-sm font-semibold text-white shadow-[0_20px_44px_rgba(124,58,237,0.35)] transition hover:bg-[#8b5cf6]"
              >
                {copy.signUp}
              </button>
              <button
                type="button"
                onClick={() => void openNativeGoogleAuth()}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200/90 bg-white px-5 py-[clamp(0.75rem,1.8dvh,0.875rem)] text-sm font-semibold text-slate-900 shadow-[0_20px_44px_rgba(15,23,42,0.22)] transition hover:bg-slate-50"
              >
                <svg
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  role="img"
                  className="h-[18px] w-[18px] shrink-0"
                  focusable="false"
                >
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917Z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
                  <path fill="#4CAF50" d="M24 44c5.179 0 9.868-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.218 0-9.621-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.091 5.571l.003-.002 6.19 5.238C36.971 39.202 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
                </svg>
                {copy.googleSignIn}
              </button>
              <button
                type="button"
                onClick={() => openEmbeddedAuth('sign-in')}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 py-[clamp(0.75rem,1.8dvh,0.875rem)] text-sm font-semibold text-white transition hover:bg-white/12"
              >
                {copy.signIn}
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
  const mobileAuthSession = useMobileAuthSession();
  const isNativeApp = isNativeCapacitorPlatform();
  const forceNativeWelcome = isNativeApp && shouldForceNativeWelcome();
  const hasNativeCallbackSession = isNativeApp && Boolean(mobileAuthSession?.token) && !forceNativeWelcome;
  const hasEffectiveSession = isSignedIn || hasNativeCallbackSession;
  const shouldLoadOnboarding = hasEffectiveSession && backendUser.status === 'success';
  const onboarding = useOnboardingProgress({ enabled: shouldLoadOnboarding });
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
