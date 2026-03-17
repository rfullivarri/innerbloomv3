import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';

interface PathSelectStepProps {
  language?: OnboardingLanguage;
  onSelectTraditional: () => void;
  onSelectQuickStart: () => void;
  onBack: () => void;
}

export function PathSelectStep({ language = 'es', onSelectTraditional, onSelectQuickStart, onBack }: PathSelectStepProps) {
  const copy = language === 'en'
    ? {
        step: 'Step 2 · Choose your path',
        title: 'How do you want to start today?',
        subtitle: 'Choose a path. Your personal guide remains exactly as before.',
        personalTitle: 'Personal guide',
        personalDescription: 'Answer the complete onboarding and get your customized plan.',
        personalDuration: '3-4 min',
        quickTitle: 'Quick Start',
        quickDescription: 'A faster path with curated tasks and a compact setup.',
        quickDuration: '< 1 min',
        quickLabel: 'Fast path',
        back: 'Back',
        continuePersonal: 'Continue with Personal guide',
      }
    : {
        step: 'Paso 2 · Elegí tu camino',
        title: '¿Cómo querés arrancar hoy?',
        subtitle: 'Elegí un camino. La guía personal sigue exactamente igual que hoy.',
        personalTitle: 'Guía personal',
        personalDescription: 'Respondé el onboarding completo y obtené tu plan personalizado.',
        personalDuration: '3-4 min',
        quickTitle: 'Inicio rápido',
        quickDescription: 'Un camino más veloz con tareas curadas y setup compacto.',
        quickDuration: '< 1 min',
        quickLabel: 'Camino rápido',
        back: 'Volver',
        continuePersonal: 'Continuar con Guía personal',
      };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{copy.step}</p>
      <h2 className="mt-2 text-3xl font-semibold text-white">{copy.title}</h2>
      <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>

      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSelectTraditional}
          className="rounded-2xl border border-violet-200/45 bg-violet-500/20 p-4 text-left transition hover:bg-violet-400/25 sm:p-5"
        >
          <p className="flex items-center gap-2 text-lg font-semibold leading-tight text-white">
            <span aria-hidden className="text-base">✨</span>
            {copy.personalTitle}
          </p>
          <p className="mt-2 text-base leading-snug text-white/90">{copy.personalDescription}</p>
          <span className="mt-4 inline-flex rounded-full border border-violet-200/35 bg-violet-300/18 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-violet-100">
            {copy.personalDuration}
          </span>
        </button>

        <button type="button" onClick={onSelectQuickStart} className="rounded-2xl border border-white/20 bg-white/8 p-4 text-left transition hover:bg-white/12 sm:p-5">
          <p className="flex items-center gap-2 text-lg font-semibold leading-tight text-white/90">
            <span aria-hidden className="text-base">⚡</span>
            {copy.quickTitle}
          </p>
          <p className="mt-2 text-base leading-snug text-white/75">{copy.quickDescription}</p>
          <span className="mt-4 inline-flex rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/75">
            {copy.quickDuration}
          </span>
          <span className="mt-4 inline-flex rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white/65">
            {copy.quickLabel}
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-5 py-2 text-sm font-medium text-white/80 transition hover:text-white"
        >
          {copy.back}
        </button>
        <button
          type="button"
          onClick={onSelectTraditional}
          className="inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          {copy.continuePersonal}
        </button>
      </div>
    </motion.section>
  );
}
