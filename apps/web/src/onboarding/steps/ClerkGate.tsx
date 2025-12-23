import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { createAuthAppearance } from '../../lib/clerkAppearance';
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
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-emerald-700 shadow-lg shadow-white/30 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
      className="mx-auto w-full max-w-3xl rounded-3xl border border-white/5 bg-slate-900/70 p-5 shadow-[0_28px_70px_rgba(255,255,255,0.08)] sm:p-6"
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
              tab === option.id
                ? 'bg-white text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.14)]'
                : 'text-white/70 hover:text-white'
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
