import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPayload } from '../payload';
import type { Answers, XP } from '../state';
import { NavButtons } from '../ui/NavButtons';
import { Snack } from '../ui/Snack';
import { buildApiUrl } from '../../lib/api';

interface SummaryStepProps {
  answers: Answers;
  xp: XP;
  onBack?: () => void;
  onFinish: () => void;
}

function SummarySection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="border-b border-white/5 pb-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-white/60">{subtitle}</p> : null}
      </header>
      <div className="mt-4 space-y-3 text-sm text-white/80">{children}</div>
    </section>
  );
}

function PillList({ label, values }: { label: string; values: readonly string[] }) {
  const hasValues = values.length > 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      {hasValues ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/50">—</p>
      )}
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-white">{label}:</span> {value || '—'}
    </p>
  );
}

export function SummaryStep({ answers, xp, onBack, onFinish }: SummaryStepProps) {
  const { mode } = answers;
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildPayload(answers, xp);
      const token = (await getToken?.()) ?? '';

      const response = await fetch(buildApiUrl('/onboarding/intro'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          typeof errorData?.message === 'string' && errorData.message.length > 0
            ? errorData.message
            : response.statusText || 'Error desconocido';
        throw new Error(message);
      }

      await response.json().catch(() => ({}));
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastMessage(null);
      setShowConfirmation(true);
      onFinish();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado';
      showToast(`Error al guardar: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, getToken, isSubmitting, onFinish, showToast, xp]);

  const handleGoToLanding = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleGoToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Snack message={toastMessage} />
      {showConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 px-4 py-6 backdrop-blur-lg">
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 text-center text-white shadow-2xl backdrop-blur-2xl"
          >
            <h3 className="text-2xl font-semibold text-white">¡Tu plan está en marcha!</h3>
            <p className="mt-3 text-sm text-white/70">
              Procesamos tu información. En unos minutos te llegará un mail de confirmación de tu base de datos. Mientras
              tanto podés ir ingresando para hacer login.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleGoToLanding}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
              >
                Volver a la landing
              </button>
              <button
                type="button"
                onClick={handleGoToLogin}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
              >
                Ir a login
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
      <div className="glass-card onboarding-surface-base mx-auto max-w-5xl rounded-3xl p-6 sm:p-8">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Summary</p>
          <h2 className="text-3xl font-semibold text-white">Tu recorrido</h2>
          <p className="text-sm text-white/70">Revisá tu plan antes de enviarlo. Podés volver atrás para ajustar.</p>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <SummarySection title="Datos base">
              <TextRow label="Email" value={answers.email} />
              <TextRow label="Game Mode" value={mode ?? '—'} />
            </SummarySection>
            {mode === 'LOW' ? (
              <SummarySection title="LOW" subtitle="Tu plan para recuperar energía">
                <PillList label="Body" values={answers.low.body} />
                <PillList label="Soul" values={answers.low.soul} />
                <PillList label="Mind" values={answers.low.mind} />
                {answers.low.note ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    <span className="font-semibold text-white">Nota personal:</span> {answers.low.note}
                  </p>
                ) : null}
              </SummarySection>
            ) : null}
            {mode === 'CHILL' ? (
              <SummarySection title="CHILL" subtitle="Equilibrio con intención clara">
                <TextRow label="Objetivo" value={answers.chill.oneThing} />
                <PillList label="Motivaciones" values={answers.chill.motiv} />
              </SummarySection>
            ) : null}
            {mode === 'FLOW' ? (
              <SummarySection title="FLOW" subtitle="Entrá en ritmo sostenido">
                <TextRow label="Objetivo" value={answers.flow.goal} />
                <PillList label="Lo que bloquea" values={answers.flow.imped} />
              </SummarySection>
            ) : null}
            {mode === 'EVOLVE' ? (
              <SummarySection title="EVOLVE" subtitle="Transformación nivel experto">
                <TextRow label="Objetivo" value={answers.evolve.goal} />
                <PillList label="Ajustes" values={answers.evolve.trade} />
                <TextRow label="Actitud" value={answers.evolve.att} />
              </SummarySection>
            ) : null}
            {mode && mode !== 'LOW' ? (
              <SummarySection title="Foundations" subtitle="Tus anclas para sostener el avance">
                <PillList label="Body" values={answers.foundations.body} />
                <PillList label="Soul" values={answers.foundations.soul} />
                <PillList label="Mind" values={answers.foundations.mind} />
              </SummarySection>
            ) : null}
          </div>
          <aside className="space-y-5">
            <SummarySection title="XP" subtitle="Cómo se reparte tu progreso">
              <div className="space-y-2 text-sm text-white">
                <p>
                  <span className="font-semibold text-white">Body:</span> {Math.round(xp.Body)} XP
                </p>
                <p>
                  <span className="font-semibold text-white">Mind:</span> {Math.round(xp.Mind)} XP
                </p>
                <p>
                  <span className="font-semibold text-white">Soul:</span> {Math.round(xp.Soul)} XP
                </p>
                <p className="mt-3 text-base font-semibold text-white">Total: {Math.round(xp.total)} XP</p>
              </div>
            </SummarySection>
          </aside>
        </div>
        <NavButtons
          onBack={onBack}
          onConfirm={handleSubmit}
          confirmLabel="Generar plan"
          loading={isSubmitting}
          disabled={isSubmitting || showConfirmation}
          showBack={!showConfirmation}
        />
      </div>
    </motion.div>
  );
}
