import { motion } from 'framer-motion';
import { useState } from 'react';
import type { OnboardingLanguage } from '../constants';

type PathOption = 'traditional' | 'quick_start';

type PathVariant = 'traditional' | 'quick_start';

interface PathSelectStepProps {
  language?: OnboardingLanguage;
  onSelectTraditional: () => void;
  onSelectQuickStart: () => void;
  onBack: () => void;
}

const ADVANCE_DELAY_MS = 140;

const getPathCardStyle = (isActive: boolean, variant: PathVariant) => {
  const palettes: Record<PathVariant, { glow: string; softTint: string; accent: string; border: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
    traditional: {
      glow: 'rgba(196, 132, 252, 0.34)',
      softTint: 'rgba(251, 191, 211, 0.24)',
      accent: 'rgba(216, 180, 254, 0.65)',
      border: 'rgba(236, 197, 255, 0.8)',
      badgeBg: 'rgba(245, 220, 255, 0.92)',
      badgeText: '#3a195e',
      badgeBorder: 'rgba(243, 213, 255, 0.92)',
    },
    quick_start: {
      glow: 'rgba(103, 232, 249, 0.32)',
      softTint: 'rgba(129, 140, 248, 0.24)',
      accent: 'rgba(147, 197, 253, 0.64)',
      border: 'rgba(186, 230, 253, 0.82)',
      badgeBg: 'rgba(207, 250, 254, 0.92)',
      badgeText: '#10364a',
      badgeBorder: 'rgba(186, 230, 253, 0.88)',
    },
  };

  const palette = palettes[variant];

  return {
    palette,
    cardStyle: isActive
      ? {
          boxShadow: `0 0 0 1px rgba(255,255,255,0.26), 0 0 30px ${palette.glow}, 0 0 56px ${palette.softTint}`,
          borderColor: palette.border,
          background: `color-mix(in srgb, ${palette.softTint} 52%, rgba(8,14,38,0.78))`,
        }
      : {
          background: 'linear-gradient(165deg, rgba(14,20,44,0.84) 0%, rgba(11,17,38,0.7) 55%, rgba(8,14,33,0.84) 100%)',
        },
    overlayStyle: {
      background: `radial-gradient(circle at 18% 8%, color-mix(in srgb, ${palette.accent} 34%, transparent) 0%, color-mix(in srgb, ${palette.accent} 20%, transparent) 30%, color-mix(in srgb, ${palette.accent} 12%, transparent) 58%, transparent 100%)`,
    },
  };
};

export function PathSelectStep({ language = 'es', onSelectTraditional, onSelectQuickStart, onBack }: PathSelectStepProps) {
  const [selectedPath, setSelectedPath] = useState<PathOption | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const copy = language === 'en'
    ? {
        step: 'Step 2 · Choose your path',
        title: 'How do you want to start today?',
        subtitle: 'Choose the way that best matches your momentum right now.',
        personalTitle: 'Personal guide',
        personalDescription: 'Answer the full onboarding and get a tailored plan based on your rhythm.',
        personalDuration: '3-4 min',
        quickTitle: 'Quick Start',
        quickDescription: 'Go live in under a minute with curated tasks and a compact setup.',
        quickDuration: '< 1 min',
        quickLabel: 'Fast lane',
        back: 'Back',
        selected: 'Selected',
        selectedSuffix: ' selected',
      }
    : {
        step: 'Paso 2 · Elegí tu camino',
        title: '¿Cómo querés arrancar hoy?',
        subtitle: 'Elegí la forma que mejor acompaña tu energía en este momento.',
        personalTitle: 'Guía personal',
        personalDescription: 'Respondé el onboarding completo y recibí un plan a medida según tu ritmo.',
        personalDuration: '3-4 min',
        quickTitle: 'Inicio rápido',
        quickDescription: 'Activá en menos de un minuto con tareas curadas y setup compacto.',
        quickDuration: '< 1 min',
        quickLabel: 'Camino veloz',
        back: 'Volver',
        selected: 'Seleccionado',
        selectedSuffix: ' seleccionado',
      };

  const handlePathTap = (path: PathOption) => {
    if (isAdvancing) return;

    setSelectedPath(path);
    setIsAdvancing(true);

    window.setTimeout(() => {
      if (path === 'traditional') {
        onSelectTraditional();
        return;
      }

      onSelectQuickStart();
    }, ADVANCE_DELAY_MS);
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
        {[
          {
            id: 'traditional' as const,
            emoji: '✨',
            title: copy.personalTitle,
            description: copy.personalDescription,
            chips: [
              {
                key: 'duration',
                className: 'border-[#d8b4fe]/35 bg-[#d8b4fe]/20 text-[#f6e8ff]',
                text: copy.personalDuration,
              },
            ],
          },
          {
            id: 'quick_start' as const,
            emoji: '⚡',
            title: copy.quickTitle,
            description: copy.quickDescription,
            chips: [
              {
                key: 'duration',
                className: 'border-white/20 bg-white/10 text-white/75',
                text: copy.quickDuration,
              },
              {
                key: 'label',
                className: 'border-sky-200/30 bg-sky-200/12 text-sky-100/90',
                text: copy.quickLabel,
              },
            ],
          },
        ].map((option) => {
          const isActive = selectedPath === option.id;
          const { palette, cardStyle, overlayStyle } = getPathCardStyle(isActive, option.id);

          return (
            <motion.button
              key={option.id}
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => handlePathTap(option.id)}
              disabled={isAdvancing}
              aria-pressed={isActive}
              aria-label={`${option.title}${isActive ? copy.selectedSuffix : ''}`}
              data-selected={isActive ? 'true' : 'false'}
              className={[
                'glass-card onboarding-surface-inner onboarding-glass-border-soft relative flex h-full overflow-hidden rounded-3xl border p-4 text-left transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/80 sm:p-5',
                isActive
                  ? 'ring-2 -translate-y-0.5 scale-[1.01] border-white/70 bg-white/[0.1] focus-visible:ring-4'
                  : 'border-white/12 hover:border-white/35 hover:-translate-y-0.5 hover:bg-white/[0.04] focus-visible:border-white/45 focus-visible:ring-[#cf8bf3]/70',
                isAdvancing && !isActive ? 'opacity-75' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={cardStyle}
            >
              <span
                className={[
                  'pointer-events-none absolute inset-0 rounded-3xl transition-all duration-250 ease-out',
                  isActive ? 'opacity-100' : 'opacity-65',
                ].join(' ')}
                style={overlayStyle}
                aria-hidden
              />

              <span className="relative z-10 flex w-full flex-col gap-2.5">
                <span className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-lg font-semibold leading-tight text-white">
                    <span aria-hidden className="text-sm opacity-80">{option.emoji}</span>
                    {option.title}
                  </span>

                  {isActive ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.08em] shadow-[0_0_14px_rgba(207,139,243,0.42)]"
                      style={{
                        background: palette.badgeBg,
                        color: palette.badgeText,
                        borderColor: palette.badgeBorder,
                      }}
                    >
                      <span aria-hidden>✓</span>
                      {copy.selected}
                    </span>
                  ) : null}
                </span>

                <p className="text-[0.95rem] leading-snug text-white/88">{option.description}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {option.chips.map((chip) => (
                    <span
                      key={chip.key}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.12em] ${chip.className}`}
                    >
                      {chip.text}
                    </span>
                  ))}
                </div>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-start">
        <button
          type="button"
          onClick={onBack}
          disabled={isAdvancing}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ← {copy.back}
        </button>
      </div>
    </motion.section>
  );
}
