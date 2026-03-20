import { motion } from 'framer-motion';
import { useState } from 'react';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';

type PathOption = 'traditional' | 'quick_start';

interface PathSelectStepProps {
  language?: OnboardingLanguage;
  onSelectTraditional: () => void;
  onSelectQuickStart: () => void;
  onBack: () => void;
}

export function PathSelectStep({ language = 'es', onSelectTraditional, onSelectQuickStart, onBack }: PathSelectStepProps) {
  const [selectedPath, setSelectedPath] = useState<PathOption | null>(null);

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
        continue: 'Continue',
        selectPath: 'Select a path to continue',
        selectedSuffix: ' selected',
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
        continue: 'Continuar',
        selectPath: 'Elegí un camino para continuar',
        selectedSuffix: ' seleccionado',
      };

  const handleConfirm = () => {
    if (selectedPath === 'traditional') {
      onSelectTraditional();
      return;
    }

    if (selectedPath === 'quick_start') {
      onSelectQuickStart();
    }
  };

  const getCardClasses = (isSelected: boolean, variant: PathOption) => {
    if (isSelected) {
      return variant === 'quick_start'
        ? 'border-white/80 bg-white/[0.12] ring-2 ring-sky-300/75 shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_24px_rgba(34,211,238,0.24),0_0_44px_rgba(139,92,246,0.22)] focus-visible:ring-4 focus-visible:ring-sky-200/90'
        : 'border-violet-200/70 bg-violet-500/20 ring-2 ring-violet-300/55 shadow-[0_0_0_1px_rgba(196,181,253,0.18),0_0_24px_rgba(167,139,250,0.22)] focus-visible:ring-4 focus-visible:ring-violet-200/80';
    }

    return variant === 'quick_start'
      ? 'border-white/20 bg-white/8 hover:border-white/35 hover:bg-white/12 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-sky-300/70'
      : 'border-white/18 bg-white/[0.06] hover:border-violet-200/35 hover:bg-violet-400/10 focus-visible:border-violet-200/40 focus-visible:ring-2 focus-visible:ring-violet-300/60';
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
          onClick={() => setSelectedPath('traditional')}
          aria-pressed={selectedPath === 'traditional'}
          aria-label={`${copy.personalTitle}${selectedPath === 'traditional' ? copy.selectedSuffix : ''}`}
          data-selected={selectedPath === 'traditional' ? 'true' : 'false'}
          className={[
            'rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-none sm:p-5',
            getCardClasses(selectedPath === 'traditional', 'traditional'),
          ].join(' ')}
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

        <button
          type="button"
          onClick={() => setSelectedPath('quick_start')}
          aria-pressed={selectedPath === 'quick_start'}
          aria-label={`${copy.quickTitle}${selectedPath === 'quick_start' ? copy.selectedSuffix : ''}`}
          data-selected={selectedPath === 'quick_start' ? 'true' : 'false'}
          className={[
            'rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-none sm:p-5',
            getCardClasses(selectedPath === 'quick_start', 'quick_start'),
          ].join(' ')}
        >
          <p className="flex items-center gap-2 text-lg font-semibold leading-tight text-white/90">
            <span aria-hidden className="text-base">⚡</span>
            {copy.quickTitle}
          </p>
          <p className="mt-2 text-base leading-snug text-white/75">{copy.quickDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/75">
              {copy.quickDuration}
            </span>
            <span className="inline-flex rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-sky-100/80">
              {copy.quickLabel}
            </span>
          </div>
        </button>
      </div>

      <NavButtons
        language={language}
        onBack={onBack}
        onConfirm={handleConfirm}
        confirmLabel={copy.continue}
        backLabel={copy.back}
        disabled={!selectedPath}
      />
      {!selectedPath ? <p className="mt-3 text-right text-xs text-white/45">{copy.selectPath}</p> : null}
    </motion.section>
  );
}
