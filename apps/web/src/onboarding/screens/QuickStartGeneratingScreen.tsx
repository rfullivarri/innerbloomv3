import { useEffect, useMemo, useState } from 'react';
import type { OnboardingLanguage } from '../constants';

interface QuickStartGeneratingScreenProps {
  language?: OnboardingLanguage;
  isSubmitting?: boolean;
  submitCompleted?: boolean;
  submitError?: string | null;
  onOpenGuidedDemo: () => void;
}

export function QuickStartGeneratingScreen({
  language = 'es',
  isSubmitting = false,
  submitCompleted = false,
  submitError = null,
  onOpenGuidedDemo,
}: QuickStartGeneratingScreenProps) {
  const copy = language === 'en'
    ? {
        title: 'Configuring your Quick Start',
        subtitle: 'We are applying your selection and reusing the real onboarding flow.',
        bridgeHint: "Next, you'll enter the guided demo to explore how Innerbloom is structured. You can skip it anytime.",
        done: '',
        cta: 'Go to guided demo',
        saving: 'Saving your Quick Start…',
      }
    : {
        title: 'Configurando tu Inicio rápido',
        subtitle: 'Estamos aplicando tu selección y reutilizando el flujo real del onboarding.',
        bridgeHint: 'Continúa hacia la demo guiada para conocer más de Innerbloom. Puedes saltarla cuando quieras.',
        done: '',
        cta: 'Ir a demo guiada',
        saving: 'Guardando tu Quick Start…',
      };

  const steps = useMemo(() => language === 'en'
    ? ['Saving your selected tasks', 'Activating your starter base', 'Preparing your free plan']
    : ['Guardando tus tareas seleccionadas', 'Activando tu base inicial', 'Preparando tu plan gratuito'], [language]);
  const [setupProgress, setSetupProgress] = useState(1);

  useEffect(() => {
    setSetupProgress(1);
    const timer = window.setInterval(() => {
      setSetupProgress((prev) => {
        if (prev >= steps.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="quickstart-premium-root onboarding-premium-root min-h-screen min-h-dvh overflow-y-auto px-4 py-10">
      <section className="quickstart-premium-card onboarding-premium-card relative mx-auto mt-5 w-full max-w-3xl rounded-3xl p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-center gap-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.36em] text-[color:var(--color-text-subtle)] sm:text-xs">
          <span>Innerbloom</span>
          <img src="/IB-COLOR-LOGO.png" alt="Innerbloom logo" className="h-[1.8em] w-auto" />
        </div>
        <h1 className="text-balance text-2xl font-semibold text-[color:var(--color-text)] sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{copy.subtitle}</p>
        <ul className="mt-6 space-y-3">
          {steps.slice(0, setupProgress).map((setupStep, index) => {
            const complete = setupProgress >= steps.length;
            const isPlanStep = index === steps.length - 1;
            return (
              <li key={setupStep} className="flex items-center gap-3 text-sm text-[color:var(--color-text-muted)] transition-all duration-500">
                <span className={`quickstart-setup-dot h-2.5 w-2.5 rounded-full ${!complete && index === setupProgress - 1 ? 'animate-pulse' : ''}`} />
                <span>
                  {setupStep}
                  {isPlanStep ? <span className="quickstart-free-pill ml-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] align-middle">FREE</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="quickstart-progress-track mt-6 h-1.5 w-full overflow-hidden rounded-full">
          <div className={`quickstart-progress-fill h-full transition-all duration-700 ${setupProgress >= steps.length ? 'w-full quick-start-setup__progress-complete' : 'w-1/3 quick-start-setup__progress-animated'}`} />
        </div>
        <p className="mt-6 text-sm text-[color:var(--color-text-muted)]">{copy.bridgeHint}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button type="button" onClick={onOpenGuidedDemo} disabled={isSubmitting || !submitCompleted} className="quickstart-primary-cta inline-flex items-center justify-center rounded-full border px-7 py-3 text-sm font-semibold !text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55" style={{ color: "#fff" }}>{isSubmitting ? copy.saving : submitCompleted ? copy.cta : copy.saving}</button>
          {submitCompleted ? <p className="text-sm text-emerald-500">{copy.done}</p> : null}
          {submitError ? <p className="text-sm text-rose-500">{submitError}</p> : null}
        </div>
        <style>{`
          .quick-start-setup__progress-animated { animation: quick-start-progress 2.3s ease-in-out infinite; transform-origin: left; }
          @keyframes quick-start-progress { 0% { transform: translateX(-112%);} 100% { transform: translateX(315%);} }
        `}</style>
      </section>
    </div>
  );
}
