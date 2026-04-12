import { SignIn, SignUp } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleOAuthButton } from '../../components/auth/GoogleOAuthButton';
import { useAuth, useUser } from '../../auth/runtimeAuth';
import { buildLocalizedAuthPath } from '../../lib/authLanguage';
import {
  AUTH_CLERK_FORM_SHELL_CLASS,
  AUTH_DIVIDER_CLASS,
  createAuthAppearance,
} from '../../lib/clerkAppearance';
import { buildWebAbsoluteUrl } from '../../lib/siteUrl';
import {
  buildNativeAppUrl,
  CAPACITOR_CALLBACK_HOST,
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../../mobile/capacitor';
import { useMobileAuthSession } from '../../mobile/mobileAuthSession';
import type { OnboardingLanguage } from '../constants';
import { useOnboarding } from '../state';

interface ClerkGateProps {
  language?: OnboardingLanguage;
  onContinue: () => void;
  autoAdvance?: boolean;
}

const TAB_OPTIONS = {
  es: [
    { id: 'sign-up', label: 'Crear cuenta' },
    { id: 'sign-in', label: 'Ya tengo cuenta' },
  ],
  en: [
    { id: 'sign-up', label: 'Create account' },
    { id: 'sign-in', label: 'I already have an account' },
  ],
} as const;

type TabId = (typeof TAB_OPTIONS)['es'][number]['id'];

const clerkAppearance = createAuthAppearance({
  layout: {
    showOptionalFields: true
  },
  elements: {
    footerActionText: 'text-white/50',
    footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
    formFieldSuccessText: 'text-sm text-emerald-200'
  }
});

export function ClerkGate({ language = 'es', onContinue, autoAdvance = false }: ClerkGateProps) {
  const location = useLocation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const mobileAuthSession = useMobileAuthSession();
  const { syncClerkSession } = useOnboarding();
  const [tab, setTab] = useState<TabId>('sign-up');
  const [hasAutoAdvanced, setHasAutoAdvanced] = useState(false);
  const isNativeApp = isNativeCapacitorPlatform();
  const hasNativeSession = isNativeApp && Boolean(mobileAuthSession?.token);
  const effectiveLoaded = isLoaded || hasNativeSession;
  const effectiveSignedIn = isSignedIn || hasNativeSession;
  const tabOptions = TAB_OPTIONS[language];
  const copy = language === 'en'
    ? {
        loading: 'Loading secure access…',
        readyTitle: 'You are ready to play!',
        readyBody: 'Use the button to start your personalized journey.',
        start: 'Start',
        step: 'Step 0 · Access',
        create: 'Create your Innerbloom account',
      }
    : {
        loading: 'Cargando acceso seguro…',
        readyTitle: '¡Estás listo para jugar!',
        readyBody: 'Usa el botón para comenzar tu recorrido personalizado.',
        start: 'Comenzar',
        step: 'Paso 0 · Acceso',
        create: 'Creá tu cuenta Innerbloom',
      };

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? mobileAuthSession?.email ?? '';
  const userId = user?.id ?? mobileAuthSession?.clerkUserId ?? '';
  const currentUrl = useMemo(() => {
    const localizedFallbackPath = '/intro-journey';

    if (typeof window === 'undefined') {
      return localizedFallbackPath;
    }

    return `${location.pathname}${location.search}${location.hash}`;
  }, [language, location.hash, location.pathname, location.search]);

  const openNativeAuth = async (mode: 'sign-in' | 'sign-up') => {
    const path = buildLocalizedAuthPath('/mobile-auth', language);
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('return_to', buildNativeAppUrl(CAPACITOR_CALLBACK_HOST));
    await openUrlInCapacitorBrowser(buildWebAbsoluteUrl(`${path}?${params.toString()}`));
  };

  useEffect(() => {
    if (!effectiveLoaded || !effectiveSignedIn) {
      return;
    }

    if (userEmail && userId) {
      const provider = hasNativeSession
        ? async () => mobileAuthSession?.token ?? null
        : () => getToken();
      syncClerkSession(userEmail, userId, provider);

      if (autoAdvance && !hasAutoAdvanced) {
        setHasAutoAdvanced(true);
        onContinue();
      }
    }
  }, [
    autoAdvance,
    effectiveLoaded,
    effectiveSignedIn,
    getToken,
    hasAutoAdvanced,
    hasNativeSession,
    mobileAuthSession?.token,
    onContinue,
    syncClerkSession,
    userEmail,
    userId,
  ]);

  if (!effectiveLoaded) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white/70 backdrop-blur-2xl">
        {copy.loading}
      </div>
    );
  }

  if (effectiveSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-auto max-w-xl rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-8 text-center text-white"
      >
        <h2 className="text-2xl font-semibold">{copy.readyTitle}</h2>
        <p className="mt-2 text-sm text-white/80">{copy.readyBody}</p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {copy.start}
        </button>
      </motion.div>
    );
  }

  if (isNativeApp) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl px-3 py-5 sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">{copy.step}</p>
            <h2 className="text-2xl font-semibold text-white">{copy.create}</h2>
          </div>
        </div>
        <div className="mt-4 flex gap-2 rounded-full bg-white/10 p-1 backdrop-blur">
          {tabOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === option.id ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-3 rounded-2xl bg-white/6 p-5 text-white/80">
          <p className="text-sm leading-6">
            {tab === 'sign-up'
              ? language === 'en'
                ? 'Create your account in the secure browser and return to the app to continue onboarding.'
                : 'Crea tu cuenta en el navegador seguro y vuelve a la app para continuar el onboarding.'
              : language === 'en'
                ? 'Sign in in the secure browser and return to the app with your active session.'
                : 'Inicia sesión en el navegador seguro y vuelve a la app con tu sesión activa.'}
          </p>
          <button
            type="button"
            onClick={() => void openNativeAuth(tab)}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
          >
            {tab === 'sign-up'
              ? language === 'en' ? 'Create account' : 'Crear cuenta'
              : language === 'en' ? 'Sign in' : 'Iniciar sesión'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl px-3 py-5 sm:p-6"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">{copy.step}</p>
          <h2 className="text-2xl font-semibold text-white">{copy.create}</h2>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-full bg-white/10 p-1 backdrop-blur">
        {tabOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === option.id ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <GoogleOAuthButton
          language={language}
          mode={tab}
          redirectUrlComplete={currentUrl}
        />
        <div className={AUTH_DIVIDER_CLASS}>
          <span className="h-px flex-1 bg-white/12" aria-hidden />
          <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
          <span className="h-px flex-1 bg-white/12" aria-hidden />
        </div>
        <AnimatePresence mode="wait" initial={false} presenceAffectsLayout={false}>
          {tab === 'sign-up' ? (
            <motion.div
              key="sign-up"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="onboarding-surface-ghost rounded-2xl px-0 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4"
            >
              <div className={AUTH_CLERK_FORM_SHELL_CLASS}>
                <SignUp
                  appearance={clerkAppearance}
                  routing="virtual"
                  signInUrl={currentUrl}
                  fallbackRedirectUrl={currentUrl}
                  forceRedirectUrl={currentUrl}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="onboarding-surface-ghost rounded-2xl px-0 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4"
            >
              <div className={AUTH_CLERK_FORM_SHELL_CLASS}>
                <SignIn
                  appearance={clerkAppearance}
                  routing="virtual"
                  signUpUrl={currentUrl}
                  fallbackRedirectUrl={currentUrl}
                  forceRedirectUrl={currentUrl}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
