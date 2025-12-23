import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useOnboarding } from '../state';

interface ClerkGateProps {
  onContinue: () => void;
  autoAdvance?: boolean;
}

const TAB_OPTIONS = [
  { id: 'sign-up', label: 'Crear cuenta' },
  { id: 'sign-in', label: 'Ya tengo cuenta' },
] as const;

type TabId = (typeof TAB_OPTIONS)[number]['id'];

const authFooterElements = {
  footer: 'mt-2 w-full max-w-none rounded-xl border border-white/10 bg-white/5 !px-2 !py-1 shadow-none',
  footerAction:
    '!flex !w-full !max-w-none items-center justify-start gap-1 !px-2 !py-0 text-[10px] !leading-[12px] text-white/55',
  footerActionText: '!whitespace-nowrap text-white/55',
  footerActionLink:
    '!whitespace-nowrap font-semibold text-white/80 underline underline-offset-2 hover:text-white',
  footerPages:
    '!mt-0.5 !flex !w-full !max-w-none items-center justify-center gap-1 !px-2 !py-0 text-[9px] !leading-[11px] text-white/40',
  footerPageLink: 'inline-flex items-center gap-1 text-white/40 hover:text-white/60',
} as const;

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none border-0',
    headerTitle: 'text-white text-2xl font-semibold',
    headerSubtitle: 'text-white/70 text-sm',
    socialButtonsBlockButton:
      'bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-semibold py-2',
    formButtonPrimary:
      'rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 text-sm font-semibold py-2 mt-2 shadow-lg shadow-sky-500/20 hover:from-sky-300 hover:via-violet-400 hover:to-fuchsia-400',
    formFieldInput:
      'rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400',
    formFieldLabel: 'text-white/70 text-xs uppercase tracking-[0.2em]',
    ...authFooterElements,
    identityPreview: 'bg-white/10 border border-white/10 text-white/80 rounded-xl',
    formField: 'space-y-1',
    main: 'gap-4 flex flex-col',
    dividerRow: 'text-white/40',
    alert: 'bg-white/10 border-white/10 text-white/80 rounded-xl',
  },
} as const;

export function ClerkGate({ onContinue, autoAdvance = false }: ClerkGateProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { syncClerkSession } = useOnboarding();
  const [tab, setTab] = useState<TabId>('sign-up');
  const [hasAutoAdvanced, setHasAutoAdvanced] = useState(false);

  const currentUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : undefined), []);
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    if (userEmail && userId) {
      const provider = () => getToken();
      syncClerkSession(userEmail, userId, provider);

      if (autoAdvance && !hasAutoAdvanced) {
        setHasAutoAdvanced(true);
        onContinue();
      }
    }
  }, [autoAdvance, getToken, hasAutoAdvanced, isLoaded, isSignedIn, onContinue, syncClerkSession, userEmail, userId]);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/5 bg-slate-900/60 p-8 text-center text-white/70">
        Cargando acceso seguro…
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-auto max-w-xl rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-8 text-center text-white"
      >
        <h2 className="text-2xl font-semibold">¡Estás listo para jugar!</h2>
        <p className="mt-2 text-sm text-white/80">
          Usa el botón para comenzar tu recorrido personalizado.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Comenzar
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="mx-auto w-full max-w-3xl rounded-3xl border border-white/5 bg-slate-900/70 p-5 shadow-2xl shadow-sky-500/10 sm:p-6"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Step 0 · Acceso</p>
          <h2 className="text-2xl font-semibold text-white">Creá tu cuenta Innerbloom</h2>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-full bg-white/5 p-1">
        {TAB_OPTIONS.map((option) => (
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
      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false} presenceAffectsLayout={false}>
          {tab === 'sign-up' ? (
            <motion.div
              key="sign-up"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-2xl bg-slate-950/40 p-4 sm:p-6"
            >
              <SignUp
                appearance={clerkAppearance}
                routing="virtual"
                signInUrl="/login"
                afterSignUpUrl={currentUrl}
              />
            </motion.div>
          ) : (
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-2xl bg-slate-950/40 p-4 sm:p-6"
            >
              <SignIn
                appearance={clerkAppearance}
                routing="virtual"
                signUpUrl="/sign-up"
                afterSignInUrl={currentUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
