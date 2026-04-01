import { SignIn, SignUp, useAuth, useClerk, useSession, useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { buildWebAbsoluteUrl } from '../lib/siteUrl';
import { CAPACITOR_APP_SCHEME, CAPACITOR_CALLBACK_HOST, CAPACITOR_SIGNED_OUT_HOST } from '../mobile/capacitor';

type BrowserAuthMode = 'sign-in' | 'sign-up' | 'logout' | 'refresh';

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
  mode: 'sign-in' | 'sign-up' | 'refresh',
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
  const url = new URL(buildWebAbsoluteUrl(buildLocalizedAuthPath('/mobile-auth', language)));
  const params = new URLSearchParams(search);
  url.searchParams.set('mode', mode);
  const returnTo = params.get('return_to')?.trim();
  if (returnTo) {
    url.searchParams.set('return_to', returnTo);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildHandoffUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set('handoff', '1');
  return url.toString();
}

function RedirectingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-8 text-center text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-[#7c3aed]/25 shadow-[0_0_0_1px_rgba(124,58,237,0.2)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
      </div>
      <h2 className="mt-5 text-[2rem] font-semibold leading-tight text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-white/74">{description}</p>
    </div>
  );
}

export default function MobileBrowserAuthPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const clerk = useClerk();
  const { session } = useSession();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const redirectStartedRef = useRef(false);
  const mode = useMemo<BrowserAuthMode>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('mode');
    return raw === 'sign-up' || raw === 'logout' || raw === 'refresh' ? raw : 'sign-in';
  }, [location.search]);
  const currentUrl = useMemo(
    () => (typeof window !== 'undefined'
      ? window.location.href
      : `/mobile-auth${location.search}${location.hash}`),
    [location.hash, location.search],
  );
  const handoffUrl = useMemo(() => buildHandoffUrl(currentUrl), [currentUrl]);
  const callbackUrl = useMemo(() => buildAppCallbackUrl(location.search), [location.search]);
  const signedOutUrl = useMemo(() => buildSignedOutUrl(location.search), [location.search]);
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('return_to')?.trim() ?? null;
  }, [location.search]);
  const isHandoffStep = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('handoff') === '1';
  }, [location.search]);
  const createdSessionId = signIn?.createdSessionId ?? signUp?.createdSessionId ?? null;

  useEffect(() => {
    console.info('[mobile-auth-page] mounted', {
      href: typeof window !== 'undefined' ? window.location.href : currentUrl,
      search: typeof window !== 'undefined' ? window.location.search : location.search,
      at: Date.now(),
    });
  }, [currentUrl, location.search]);

  useEffect(() => {
    console.info('[mobile-auth-page] parsed-params', {
      mode,
      returnTo,
      handoff: isHandoffStep,
      lang: language,
      at: Date.now(),
    });
  }, [isHandoffStep, language, mode, returnTo]);

  useEffect(() => {
    console.info('[mobile-auth-page] clerk-ready', {
      isLoaded,
      at: Date.now(),
    });
  }, [isLoaded]);

  useEffect(() => {
    console.info('[mobile-auth-page] auth-state', {
      hasSession: !!session,
      sessionId: session?.id ?? null,
      userId: user?.id ?? null,
      at: Date.now(),
    });
  }, [session, user?.id]);

  useEffect(() => {
    console.info('[mobile-auth-page] session-check-result', {
      hasSession: !!session,
      sessionId: session?.id ?? null,
      userId: user?.id ?? null,
      at: Date.now(),
    });
  }, [session, user?.id]);

  useEffect(() => {
    const status = mode === 'sign-up'
      ? signUp?.status ?? null
      : signIn?.status ?? null;

    console.info('[mobile-auth-page] auth-finished', {
      status,
      createdSessionId: createdSessionId ?? null,
      signInStatus: typeof signIn !== 'undefined' ? signIn?.status ?? null : null,
      signUpStatus: typeof signUp !== 'undefined' ? signUp?.status ?? null : null,
      at: Date.now(),
    });
  }, [createdSessionId, mode, signIn, signUp]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const viewport = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewport?.getAttribute('content') ?? null;
    const mobileAuthViewport = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    const style = document.createElement('style');
    style.dataset.mobileAuthZoomFix = 'true';
    style.textContent = `
      html[data-mobile-auth='true'],
      body[data-mobile-auth='true'] {
        -webkit-text-size-adjust: 100%;
      }

      body[data-mobile-auth='true'] input,
      body[data-mobile-auth='true'] textarea,
      body[data-mobile-auth='true'] select {
        font-size: 16px !important;
        transform: none !important;
        zoom: 1 !important;
      }
    `;

    document.documentElement.dataset.mobileAuth = 'true';
    document.body.dataset.mobileAuth = 'true';
    if (viewport) {
      viewport.setAttribute('content', mobileAuthViewport);
    }
    document.head.appendChild(style);

    return () => {
      delete document.documentElement.dataset.mobileAuth;
      delete document.body.dataset.mobileAuth;
      style.remove();
      if (viewport && previousViewport) {
        viewport.setAttribute('content', previousViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || redirectStartedRef.current) {
      return;
    }

    if (mode === 'logout') {
      redirectStartedRef.current = true;
      void (async () => {
        try {
          if (isSignedIn) {
            await signOut();
          }

          console.info('[mobile-auth-page] callback-navigate-start', {
            callbackUrl: signedOutUrl,
            at: Date.now(),
          });
          window.location.replace(signedOutUrl);
          window.setTimeout(() => {
            console.error('[mobile-auth-page] redirect-blocked-or-not-attempted', {
              at: Date.now(),
              callbackUrl: signedOutUrl,
              mode,
              sessionId: session?.id ?? null,
              createdSessionId,
              handoff: isHandoffStep,
            });
          }, 1500);
        } catch (cause) {
          redirectStartedRef.current = false;
          const nextError = cause instanceof Error ? cause.message : String(cause);
          console.error('[mobile-auth-page] unexpected-error', {
            at: Date.now(),
            mode,
            returnTo,
            sessionId: session?.id ?? null,
            createdSessionId,
            userId: user?.id ?? null,
            handoff: isHandoffStep,
            error: nextError,
          });
          setError(nextError || 'No pudimos cerrar la sesión web.');
        }
      })();
      return;
    }

    if (!isSignedIn) {
      const hasCompletedSession = Boolean(session?.id || createdSessionId || user?.id);
      if (!hasCompletedSession) {
        return;
      }
    }

    redirectStartedRef.current = true;
    void (async () => {
      let resolvedCallbackUrl: string | null = null;

      try {
        if (!session?.id && createdSessionId) {
          await clerk.setActive({ session: createdSessionId });
        }

        const token = await getToken();
        if (!token) {
          console.error('[mobile-auth-page] clerk-session-missing', {
            at: Date.now(),
            mode,
            createdSessionId,
            sessionId: session?.id ?? null,
            userId: user?.id ?? null,
            handoff: isHandoffStep,
          });
          throw new Error('Clerk no devolvió un token de sesión utilizable para mobile.');
        }

        try {
          resolvedCallbackUrl = buildRedirectUrl(
            callbackUrl,
            user,
            token,
            mode === 'refresh' ? 'refresh' : mode,
          );
          console.info('[mobile-auth-page] callback-build', {
            callbackUrl: resolvedCallbackUrl,
            mode,
            returnTo,
            handoff: isHandoffStep,
            at: Date.now(),
          });
        } catch (cause) {
          console.error('[mobile-auth-page] callback-build-failed', {
            at: Date.now(),
            mode,
            returnTo,
            error: cause instanceof Error ? cause.message : String(cause),
          });
          throw cause;
        }

        console.info('[mobile-auth-page] callback-navigate-start', {
          callbackUrl: resolvedCallbackUrl,
          at: Date.now(),
        });
        window.location.replace(resolvedCallbackUrl);
        window.setTimeout(() => {
          console.error('[mobile-auth-page] redirect-blocked-or-not-attempted', {
            at: Date.now(),
            callbackUrl: resolvedCallbackUrl,
            mode,
            sessionId: session?.id ?? null,
            createdSessionId,
            handoff: isHandoffStep,
          });
        }, 1500);
      } catch (cause) {
        redirectStartedRef.current = false;
        const nextError = cause instanceof Error ? cause.message : String(cause);
        console.error('[mobile-auth-page] unexpected-error', {
          at: Date.now(),
          mode,
          returnTo,
          sessionId: session?.id ?? null,
          createdSessionId,
          userId: user?.id ?? null,
          handoff: isHandoffStep,
          error: nextError,
        });
        setError(nextError || 'No pudimos transferir la sesión de Clerk a la app.');
      }
    })();
  }, [
    callbackUrl,
    clerk,
    createdSessionId,
    getToken,
    isLoaded,
    isSignedIn,
    mode,
    returnTo,
    isHandoffStep,
    session?.id,
    signOut,
    signedOutUrl,
    user,
  ]);

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
      title={mode === 'refresh'
        ? language === 'en' ? 'Restore your session' : 'Recuperar tu sesión'
        : mode === 'sign-up'
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
          fallbackRedirectUrl={handoffUrl}
          forceRedirectUrl={handoffUrl}
          signInFallbackRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
          signInForceRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
          signUpFallbackRedirectUrl={handoffUrl}
          signUpForceRedirectUrl={handoffUrl}
          redirectUrl={handoffUrl}
          afterSignUpUrl={handoffUrl}
          afterSignInUrl={handoffUrl}
        />
      ) : (
        <SignIn
          appearance={authAppearance}
          routing="virtual"
          signUpUrl={buildModeUrl(language, 'sign-up', location.search)}
          fallbackRedirectUrl={handoffUrl}
          forceRedirectUrl={handoffUrl}
          signUpFallbackRedirectUrl={buildModeUrl(language, 'sign-up', location.search)}
          signUpForceRedirectUrl={buildModeUrl(language, 'sign-up', location.search)}
          signInFallbackRedirectUrl={handoffUrl}
          signInForceRedirectUrl={handoffUrl}
          redirectUrl={handoffUrl}
          afterSignUpUrl={handoffUrl}
          afterSignInUrl={handoffUrl}
        />
      )}
      {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
    </AuthLayout>
  );
}
