import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';
import { useBackendUser } from '../hooks/useBackendUser';
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';

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
    <div className="flex min-h-screen items-center justify-center px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(36,59,112,0.96),rgba(20,29,72,0.98))] p-6 shadow-[0_24px_80px_rgba(7,14,40,0.44)] backdrop-blur-2xl">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/50">Innerbloom</p>
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
        className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#8b5cf6,#ec4899)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.4)] transition hover:brightness-110"
      >
        Reintentar
      </button>
    </MobileEntryShell>
  );
}

function MobileWelcome() {
  return (
    <MobileEntryShell
      title="Bienvenido"
      description="Abre tu sesión de Innerbloom en navegador seguro y vuelve a la app con tu progreso intacto."
    >
      <div className="space-y-3">
        <Link
          to="/login"
          className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#8b5cf6,#ec4899)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.4)] transition hover:brightness-110"
        >
          Iniciar sesión
        </Link>
        <Link
          to="/sign-up"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/16 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
        >
          Crear cuenta
        </Link>
      </div>
    </MobileEntryShell>
  );
}

export function MobileAppEntry() {
  const { isLoaded, isSignedIn } = useAuth();
  const backendUser = useBackendUser();
  const onboarding = useOnboardingProgress();
  const dashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;

  if (!isLoaded) {
    return (
      <MobileEntryLoading
        title="Preparando Innerbloom"
        description="Estamos cargando tu sesión y el estado base de la app."
      />
    );
  }

  if (!isSignedIn) {
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

  if (onboarding.progress?.state !== 'completed') {
    return <Navigate to="/intro-journey" replace />;
  }

  return <Navigate to={dashboardPath} replace />;
}
