import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { CAPACITOR_APP_SCHEME, CAPACITOR_CALLBACK_HOST, CAPACITOR_SIGNED_OUT_HOST } from '../mobile/capacitor';

type BrowserAuthMode = 'sign-in' | 'sign-up' | 'logout';

const authAppearance = createAuthAppearance({
  layout: {
    showOptionalFields: true,
  },
  elements: {
    footerActionText: 'text-white/50',
    footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
    formFieldSuccessText: 'text-sm text-emerald-200',
  },
});

function resolveReturnTo(search: string, host: string): string {
  const params = new URLSearchParams(search);
  const rawValue = params.get('return_to')?.trim();

  if (!rawValue) {
    return `${CAPACITOR_APP_SCHEME}://${host}`;
  }

  try {
    const parsed = new URL(rawValue);
    if (parsed.protocol !== `${CAPACITOR_APP_SCHEME}:`) {
      return `${CAPACITOR_APP_SCHEME}://${host}`;
    }

    return parsed.toString();
  } catch {
    return `${CAPACITOR_APP_SCHEME}://${host}`;
  }
}

function buildAppCallbackUrl(search: string): string {
  return resolveReturnTo(search, CAPACITOR_CALLBACK_HOST);
}

function buildSignedOutUrl(search: string): string {
  return resolveReturnTo(search, CAPACITOR_SIGNED_OUT_HOST);
}

function buildRedirectUrl(
  baseUrl: string,
  user: ReturnType<typeof useUser>['user'],
  token: string,
  mode: 'sign-in' | 'sign-up',
): string {
  const callbackUrl = new URL(baseUrl);
  callbackUrl.searchParams.set('token', token);
  callbackUrl.searchParams.set('auth_mode', mode);

  if (user?.id) {
    callbackUrl.searchParams.set('user_id', user.id);
  }
  if (user?.username) {
    callbackUrl.searchParams.set('username', user.username);
  }
  if (user?.fullName) {
    callbackUrl.searchParams.set('full_name', user.fullName);
  }
  if (user?.imageUrl) {
    callbackUrl.searchParams.set('image_url', user.imageUrl);
  }
  if (user?.firstName) {
    callbackUrl.searchParams.set('first_name', user.firstName);
  }
  if (user?.lastName) {
    callbackUrl.searchParams.set('last_name', user.lastName);
  }
  if (user?.primaryEmailAddress?.emailAddress) {
    callbackUrl.searchParams.set('email', user.primaryEmailAddress.emailAddress);
  }

  return callbackUrl.toString();
}

function buildModeUrl(language: string, mode: 'sign-in' | 'sign-up', search: string): string {
  const url = new URL(buildLocalizedAuthPath('/mobile-auth', language), 'https://innerbloomjourney.org');
  const params = new URLSearchParams(search);
  url.searchParams.set('mode', mode);
  const returnTo = params.get('return_to')?.trim();
  if (returnTo) {
    url.searchParams.set('return_to', returnTo);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function RedirectingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-2xl">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/72">{description}</p>
    </div>
  );
}

export default function MobileBrowserAuthPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const redirectStartedRef = useRef(false);
  const mode = useMemo<BrowserAuthMode>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('mode');
    return raw === 'sign-up' || raw === 'logout' ? raw : 'sign-in';
  }, [location.search]);
  const currentUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.href : '/mobile-auth'),
    [],
  );
  const callbackUrl = useMemo(() => buildAppCallbackUrl(location.search), [location.search]);
  const signedOutUrl = useMemo(() => buildSignedOutUrl(location.search), [location.search]);

  useEffect(() => {
    if (!isLoaded || redirectStartedRef.current) {
      return;
    }

    if (mode === 'logout') {
      redirectStartedRef.current = true;
      void (async () => {
        try {
          if (isSignedIn) {
            await signOut({ redirectUrl: signedOutUrl });
            return;
          }

          window.location.replace(signedOutUrl);
        } catch (cause) {
          redirectStartedRef.current = false;
          const nextError = cause instanceof Error ? cause.message : String(cause);
          setError(nextError || 'No pudimos cerrar la sesión web.');
        }
      })();
      return;
    }

    if (!isSignedIn) {
      return;
    }

    redirectStartedRef.current = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Clerk no devolvió un token de sesión utilizable para mobile.');
        }

        window.location.replace(buildRedirectUrl(callbackUrl, user, token, mode));
      } catch (cause) {
        redirectStartedRef.current = false;
        const nextError = cause instanceof Error ? cause.message : String(cause);
        setError(nextError || 'No pudimos transferir la sesión de Clerk a la app.');
      }
    })();
  }, [callbackUrl, getToken, isLoaded, isSignedIn, mode, signOut, signedOutUrl, user]);

  if (mode === 'logout') {
    return (
      <AuthLayout
        title={language === 'en' ? 'Signing out' : 'Cerrando sesión'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref={signedOutUrl}
      >
        <RedirectingState
          title={language === 'en' ? 'Closing your session' : 'Cerrando tu sesión'}
          description={language === 'en'
            ? 'We are removing your browser session and returning you to the app.'
            : 'Estamos cerrando tu sesión web y devolviéndote a la app.'}
        />
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </AuthLayout>
    );
  }

  if (!isLoaded) {
    return (
      <AuthLayout
        title={language === 'en' ? 'Preparing secure access' : 'Preparando acceso seguro'}
        secondaryActionLabel={language === 'en' ? 'Cancel' : 'Cancelar'}
        secondaryActionHref={callbackUrl}
      >
        <RedirectingState
          title={language === 'en' ? 'Loading Clerk' : 'Cargando Clerk'}
          description={language === 'en'
            ? 'Checking whether you already have an active session in the system browser.'
            : 'Comprobando si ya existe una sesión activa en el navegador del sistema.'}
        />
      </AuthLayout>
    );
  }

  if (isSignedIn) {
    return (
      <AuthLayout
        title={language === 'en' ? 'Returning to the app' : 'Volviendo a la app'}
        secondaryActionLabel={language === 'en' ? 'Open app' : 'Abrir app'}
        secondaryActionHref={callbackUrl}
      >
        <RedirectingState
          title={language === 'en' ? 'Session ready' : 'Sesión lista'}
          description={language === 'en'
            ? 'We are packaging your active session and sending it back to Innerbloom.'
            : 'Estamos transfiriendo tu sesión activa y devolviéndola a Innerbloom.'}
        />
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={mode === 'sign-up'
        ? language === 'en' ? 'Create your account' : 'Crear tu cuenta'
        : language === 'en' ? 'Sign in' : 'Iniciar sesión'}
      secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
      secondaryActionHref={callbackUrl}
    >
      {mode === 'sign-up' ? (
        <SignUp
          appearance={authAppearance}
          routing="virtual"
          signInUrl={buildModeUrl(language, 'sign-in', location.search)}
          fallbackRedirectUrl={currentUrl}
          forceRedirectUrl={currentUrl}
          signInFallbackRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
          signInForceRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
          signUpFallbackRedirectUrl={currentUrl}
          signUpForceRedirectUrl={currentUrl}
          redirectUrl={currentUrl}
          afterSignUpUrl={currentUrl}
          afterSignInUrl={currentUrl}
        />
      ) : (
        <SignIn
          appearance={authAppearance}
          routing="virtual"
          signUpUrl={buildModeUrl(language, 'sign-up', location.search)}
          fallbackRedirectUrl={currentUrl}
          forceRedirectUrl={currentUrl}
          signUpFallbackRedirectUrl={buildModeUrl(language, 'sign-up', location.search)}
          signUpForceRedirectUrl={buildModeUrl(language, 'sign-up', location.search)}
          signInFallbackRedirectUrl={currentUrl}
          signInForceRedirectUrl={currentUrl}
          redirectUrl={currentUrl}
          afterSignUpUrl={currentUrl}
          afterSignInUrl={currentUrl}
        />
      )}
      {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
    </AuthLayout>
  );
}
