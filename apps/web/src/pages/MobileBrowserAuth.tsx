import { SignIn, SignUp, useAuth, useClerk, useSession, useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';
import { AuthLayout } from '../components/layout/AuthLayout';
import { CLERK_TOKEN_TEMPLATE } from '../config/auth';
import { buildLocalizedAuthPath, resolveAuthLanguage, type AuthLanguage } from '../lib/authLanguage';
import { AUTH_DIVIDER_CLASS, AUTH_STACK_CLASS, createAuthAppearance } from '../lib/clerkAppearance';
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

type MobileCallbackLegacyOptions = {
  includeLegacyImageUrl: boolean;
};

export function shouldIncludeLegacyProfileImage(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('legacy_profile_image') === '1';
}

export function buildRedirectUrl(
  baseUrl: string,
  user: ReturnType<typeof useUser>['user'],
  token: string,
  mode: 'sign-in' | 'sign-up' | 'refresh',
  options: MobileCallbackLegacyOptions,
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
    callbackUrl.searchParams.set('clerk_image_url', user.imageUrl);
    if (options.includeLegacyImageUrl) {
      callbackUrl.searchParams.set('image_url', user.imageUrl);
    }
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

function buildModeUrl(language: AuthLanguage, mode: 'sign-in' | 'sign-up', search: string): string {
  const url = new URL(buildWebAbsoluteUrl(buildLocalizedAuthPath('/mobile-auth', language)));
  const params = new URLSearchParams(search);
  url.searchParams.set('mode', mode);
  for (const key of ['return_to', 'fresh']) {
    const value = params.get(key)?.trim();
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  if (mode === 'sign-in' && params.get('hide_google') === '1') {
    url.searchParams.set('hide_google', '1');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildHandoffUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set('handoff', '1');
  return url.toString();
}

function RedirectingState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center text-center text-white">
      <span
        className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden
      />
      <p className="mt-3 text-xs leading-5 text-white/68 sm:text-sm">{message}</p>
    </div>
  );
}

function MinimalAuthTransitionLayout({
  children,
  secondaryActionLabel,
  secondaryActionHref,
}: {
  children: ReactNode;
  secondaryActionLabel: string;
  secondaryActionHref: string;
}) {
  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0b1335] px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.15rem)] text-white sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+1.35rem)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(104,69,255,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(167,139,250,0.18),transparent_22%),linear-gradient(180deg,#10193f_0%,#0b1335_50%,#090f2d_100%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
      </div>
      <a
        href={secondaryActionHref}
        className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+0.45rem)] z-20 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-white/68 shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur transition-colors duration-200 hover:border-white/18 hover:bg-white/[0.08] hover:text-white sm:left-6 lg:left-8"
      >
        <span aria-hidden="true" className="text-base leading-none">←</span>
        {secondaryActionLabel}
      </a>
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function MobileBrowserAuthPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const clerk = useClerk();
  const { session } = useSession();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isResettingBrowserSession, setIsResettingBrowserSession] = useState(false);
  const redirectStartedRef = useRef(false);
  const googleRedirectStartedRef = useRef(false);
  const browserSessionResetStartedRef = useRef(false);
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
  const includeLegacyImageUrl = useMemo(
    () => shouldIncludeLegacyProfileImage(location.search),
    [location.search],
  );
  const shouldStartGoogleOAuth = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('provider') === 'google';
  }, [location.search]);
  const shouldHideGoogleButton = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('hide_google') === '1';
  }, [location.search]);
  const shouldUseFreshBrowserSession = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('fresh') === '1';
  }, [location.search]);
  const shouldResetBrowserSession = shouldUseFreshBrowserSession && !isHandoffStep && isSignedIn;
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
    if (!shouldResetBrowserSession || browserSessionResetStartedRef.current || !isLoaded) {
      return;
    }

    browserSessionResetStartedRef.current = true;
    setIsResettingBrowserSession(true);
    void signOut({ redirectUrl: currentUrl })
      .catch((cause) => {
        console.warn('[mobile-auth-page] browser-session-reset-failed', {
          at: Date.now(),
          mode,
          error: cause instanceof Error ? cause.message : String(cause),
        });
        setError(
          language === 'en'
            ? 'We could not clear the previous browser session. Please try again.'
            : 'No pudimos limpiar la sesión anterior del navegador. Intentá de nuevo.',
        );
      })
      .finally(() => {
        setIsResettingBrowserSession(false);
      });
  }, [currentUrl, isLoaded, language, mode, shouldResetBrowserSession, signOut]);

  useEffect(() => {
    if (
      !shouldStartGoogleOAuth
      || googleRedirectStartedRef.current
      || isSignedIn
      || createdSessionId
      || shouldResetBrowserSession
      || isResettingBrowserSession
    ) {
      return;
    }

    const oauthMode = mode === 'sign-up' ? 'sign-up' : 'sign-in';
    const resourceReady = oauthMode === 'sign-up' ? signUpLoaded && signUp : signInLoaded && signIn;
    if (!isLoaded || !resourceReady) {
      return;
    }

    googleRedirectStartedRef.current = true;
    const resource = oauthMode === 'sign-up' ? signUp : signIn;
    void resource
      ?.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: handoffUrl,
        continueSignIn: false,
        continueSignUp: false,
        oidcPrompt: 'select_account',
      })
      .catch((cause) => {
        googleRedirectStartedRef.current = false;
        console.error('[mobile-auth-page] google-oauth-start-failed', {
          at: Date.now(),
          mode,
          error: cause instanceof Error ? cause.message : String(cause),
        });
        setError(
          language === 'en'
            ? 'We could not start Google sign-in. Please try again.'
            : 'No pudimos iniciar sesión con Google. Intentá de nuevo.',
        );
      });
  }, [
    createdSessionId,
    handoffUrl,
    isLoaded,
    isSignedIn,
    language,
    mode,
    shouldStartGoogleOAuth,
    shouldResetBrowserSession,
    signIn,
    signInLoaded,
    signUp,
    signUpLoaded,
    isResettingBrowserSession,
  ]);

  useEffect(() => {
    if (!isLoaded || redirectStartedRef.current || shouldResetBrowserSession || isResettingBrowserSession) {
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

        const token = CLERK_TOKEN_TEMPLATE
          ? await getToken({ template: CLERK_TOKEN_TEMPLATE })
          : await getToken();
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
            { includeLegacyImageUrl },
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
    isResettingBrowserSession,
    mode,
    returnTo,
    isHandoffStep,
    includeLegacyImageUrl,
    session?.id,
    signOut,
    shouldResetBrowserSession,
    signedOutUrl,
    user,
  ]);

  if (mode === 'logout') {
    return (
      <MinimalAuthTransitionLayout
        secondaryActionLabel={language === 'en' ? 'Back' : 'Volver'}
        secondaryActionHref={signedOutUrl}
      >
        <RedirectingState
          message={language === 'en'
            ? 'We are removing your browser session and returning you to the app.'
            : 'Estamos cerrando tu sesión web y devolviéndote a la app.'}
        />
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </MinimalAuthTransitionLayout>
    );
  }

  if (!isLoaded || isResettingBrowserSession || shouldResetBrowserSession) {
    return (
      <MinimalAuthTransitionLayout
        secondaryActionLabel={language === 'en' ? 'Back' : 'Volver'}
        secondaryActionHref={signedOutUrl}
      >
        <RedirectingState
          message={language === 'en'
            ? 'Opening a fresh session for this device.'
            : 'Abriendo una sesión limpia para este dispositivo.'}
        />
      </MinimalAuthTransitionLayout>
    );
  }

  if (isSignedIn) {
    return (
      <MinimalAuthTransitionLayout
        secondaryActionLabel={language === 'en' ? 'Back' : 'Volver'}
        secondaryActionHref={callbackUrl}
      >
        <RedirectingState
          message={language === 'en'
            ? 'We are packaging your active session and sending it back to Innerbloom.'
            : 'Estamos transfiriendo tu sesión activa y devolviéndola a Innerbloom.'}
        />
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </MinimalAuthTransitionLayout>
    );
  }

  if (shouldStartGoogleOAuth) {
    return (
      <MinimalAuthTransitionLayout
        secondaryActionLabel={language === 'en' ? 'Back' : 'Volver'}
        secondaryActionHref={signedOutUrl}
      >
        <RedirectingState
          message={
            language === 'en'
              ? 'Opening Google sign in…'
              : 'Abriendo el inicio de sesión con Google…'
          }
        />
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </MinimalAuthTransitionLayout>
    );
  }

  return (
    <AuthLayout
      title={
        mode === 'refresh'
          ? language === 'en'
            ? 'Restore your session'
            : 'Recuperar tu sesión'
          : mode === 'sign-up'
            ? language === 'en'
              ? 'Create your account'
              : 'Crear tu cuenta'
            : language === 'en'
              ? 'Sign in'
              : 'Iniciar sesión'
      }
      secondaryActionLabel={language === 'en' ? 'Back' : 'Volver'}
      secondaryActionHref={signedOutUrl}
    >
      <div className={AUTH_STACK_CLASS}>
        {!shouldHideGoogleButton ? (
          <>
            <GoogleOAuthButton
              language={language}
              mode={mode === 'sign-up' ? 'sign-up' : 'sign-in'}
              redirectUrlComplete={handoffUrl}
              forceAccountSelection
            />
            <div className={AUTH_DIVIDER_CLASS}>
              <span className="h-px flex-1 bg-white/12" aria-hidden />
              <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
              <span className="h-px flex-1 bg-white/12" aria-hidden />
            </div>
          </>
        ) : null}
        {mode === 'sign-up' ? (
          <SignUp
            appearance={authAppearance}
            routing="virtual"
            signInUrl={buildModeUrl(language, 'sign-in', location.search)}
            fallbackRedirectUrl={handoffUrl}
            forceRedirectUrl={handoffUrl}
            signInFallbackRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
            signInForceRedirectUrl={buildModeUrl(language, 'sign-in', location.search)}
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
            redirectUrl={handoffUrl}
            afterSignUpUrl={handoffUrl}
            afterSignInUrl={handoffUrl}
          />
        )}
        {error ? <p className="mt-4 text-center text-sm text-rose-200">{error}</p> : null}
      </div>
    </AuthLayout>
  );
}
