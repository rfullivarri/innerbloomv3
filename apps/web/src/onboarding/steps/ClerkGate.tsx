import { SignIn, useAuth, useSignUp, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const { isLoaded: isSignUpLoaded, signUp, setActive } = useSignUp();
  const { syncClerkSession } = useOnboarding();
  const [tab, setTab] = useState<TabId>('sign-up');
  const [hasAutoAdvanced, setHasAutoAdvanced] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStage, setVerificationStage] = useState<'create' | 'verify'>('create');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'info'; message: string } | null>(null);

  const currentUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : undefined), []);
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const userId = user?.id ?? '';
  const otpLength = useMemo(() => {
    const raw = Number(import.meta.env.VITE_CLERK_EMAIL_CODE_LENGTH ?? 6);
    return raw === 5 ? 5 : 6;
  }, []);

  const normalizedCode = code.trim();
  const isNumericCode = /^\d*$/.test(normalizedCode);
  const isOtpReady = isNumericCode && normalizedCode.length === otpLength;

  const mapClerkVerificationError = (errorCode?: string) => {
    if (!errorCode) {
      return 'No pudimos verificar el código. Probá nuevamente.';
    }

    if (errorCode.includes('expired')) {
      return 'Código expirado. Pedí uno nuevo para continuar.';
    }

    if (errorCode.includes('incorrect') || errorCode.includes('invalid')) {
      return 'Código inválido. Revisá el email e intentá otra vez.';
    }

    return 'No pudimos verificar el código. Probá nuevamente.';
  };

  const mapClerkCreateError = (errorCode?: string) => {
    if (!errorCode) {
      return 'No pudimos crear la cuenta. Verificá tus datos e intentá nuevamente.';
    }

    if (errorCode.includes('already_exists')) {
      return 'Ese email ya tiene una cuenta. Probá ingresar en “Ya tengo cuenta”.';
    }

    if (errorCode.includes('password')) {
      return 'La contraseña no cumple los requisitos de seguridad.';
    }

    return 'No pudimos crear la cuenta. Verificá tus datos e intentá nuevamente.';
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSignUpLoaded || verificationStage === 'verify') {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationStage('verify');
      setCode('');
      setFeedback({ kind: 'info', message: 'Te enviamos un código por email. Ingresalo para activar tu cuenta.' });
    } catch (error: any) {
      const firstError = error?.errors?.[0]?.code as string | undefined;
      setFeedback({ kind: 'error', message: mapClerkCreateError(firstError) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!isSignUpLoaded || verificationStage !== 'verify' || !isOtpReady) {
      if (normalizedCode.length > 0 && normalizedCode.length < otpLength) {
        setFeedback({ kind: 'error', message: `Código incompleto. Ingresá los ${otpLength} dígitos.` });
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const verification = await signUp.attemptEmailAddressVerification({ code: normalizedCode });

      if (verification.status === 'complete' && verification.createdSessionId) {
        await setActive({ session: verification.createdSessionId });
      } else {
        setFeedback({ kind: 'error', message: 'Código inválido. Revisá el email e intentá otra vez.' });
      }
    } catch (error: any) {
      const firstError = error?.errors?.[0]?.code as string | undefined;
      setFeedback({ kind: 'error', message: mapClerkVerificationError(firstError) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isSignUpLoaded || verificationStage !== 'verify') {
      return;
    }

    setIsResending(true);
    setFeedback(null);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setFeedback({ kind: 'info', message: 'Te enviamos un nuevo código.' });
    } catch {
      setFeedback({ kind: 'error', message: 'No pudimos reenviar el código. Intentá de nuevo en unos segundos.' });
    } finally {
      setIsResending(false);
    }
  };

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
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white/70 backdrop-blur-2xl">
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
      className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-6"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Step 0 · Acceso</p>
          <h2 className="text-2xl font-semibold text-white">Creá tu cuenta Innerbloom</h2>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-full bg-white/10 p-1 backdrop-blur">
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
              className="onboarding-surface-ghost rounded-2xl px-2 py-4 sm:px-4 sm:py-6"
            >
              <form className="mx-auto w-full max-w-md space-y-4" onSubmit={handleCreateAccount}>
                <div>
                  <label htmlFor="signup-email" className="mb-1 block text-sm text-white/80">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={verificationStage === 'verify' || isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="mb-1 block text-sm text-white/80">
                    Contraseña
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={verificationStage === 'verify' || isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/50"
                    required
                  />
                </div>

                {verificationStage === 'verify' && (
                  <div>
                    <label htmlFor="signup-otp" className="mb-1 block text-sm text-white/80">
                      Código de verificación
                    </label>
                    <input
                      id="signup-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, otpLength);
                        setCode(digitsOnly);
                        if (digitsOnly.length < otpLength) {
                          setFeedback({ kind: 'error', message: `Código incompleto. Ingresá los ${otpLength} dígitos.` });
                        } else {
                          setFeedback(null);
                        }
                      }}
                      className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm tracking-[0.3em] text-white outline-none transition focus:border-white/50"
                      placeholder={'•'.repeat(otpLength)}
                    />
                  </div>
                )}

                {feedback && (
                  <p className={`text-sm ${feedback.kind === 'error' ? 'text-rose-300' : 'text-emerald-200'}`}>
                    {feedback.message}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  {verificationStage === 'create' ? (
                    <button
                      type="submit"
                      disabled={!isSignUpLoaded || isSubmitting}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleVerifyEmailCode}
                        disabled={isSubmitting || !isOtpReady}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? 'Verificando…' : 'Verificar código'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isResending}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isResending ? 'Reenviando…' : 'Reenviar código'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="sign-in"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="onboarding-surface-ghost rounded-2xl px-2 py-4 sm:px-4 sm:py-6"
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
