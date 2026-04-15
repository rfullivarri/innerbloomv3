import { motion } from 'framer-motion';
import type { GameMode } from '../state';
import type { OnboardingLanguage } from '../constants';
import { GAME_MODE_META } from '../../lib/gameModeMeta';
import { getOnboardingRhythmTheme } from '../utils/onboardingRhythmTheme';

interface GameModeStepProps {
  language?: OnboardingLanguage;
  selected: GameMode | null;
  onSelect: (mode: GameMode) => void;
  onBack?: () => void;
}

export const MODE_CARD_CONTENT = {
  FLOW: GAME_MODE_META.Flow,
  LOW: GAME_MODE_META.Low,
  CHILL: GAME_MODE_META.Chill,
  EVOLVE: GAME_MODE_META.Evolve,
};

const MODE_ORDER: GameMode[] = ['LOW', 'CHILL', 'FLOW', 'EVOLVE'];

export function GameModeStep({ language = 'es', selected, onSelect, onBack }: GameModeStepProps) {
  const copy = language === 'en'
    ? {
        step: 'Step 1 · Choose your rhythm',
        title: 'What is your rhythm today?',
        subtitle: 'Choose the weekly intensity that best adapts to you.',
        selected: 'Selected',
        state: 'State',
        objective: 'Objective',
        back: 'Back',
        selectedSuffix: ' selected',
      }
    : {
        step: 'Paso 1 · Elegí tu ritmo',
        title: '¿Cuál es tu ritmo hoy?',
        subtitle: 'Elegí la intensidad semanal que mejor se adapta a vos.',
        selected: 'Seleccionado',
        state: 'Estado',
        objective: 'Objetivo',
        back: 'Volver',
        selectedSuffix: ' seleccionado',
      };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-4xl rounded-3xl p-4 sm:p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">{copy.step}</p>
          <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
          <p className="text-sm text-white/70">{copy.subtitle}</p>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {MODE_ORDER.map((mode) => {
            const content = MODE_CARD_CONTENT[mode];
            const isActive = selected === mode;
            const modeTheme = getOnboardingRhythmTheme(mode);

            return (
              <motion.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(mode)}
                aria-pressed={isActive}
                aria-label={`${content.title}${isActive ? copy.selectedSuffix : ''}`}
                data-selected={isActive ? 'true' : 'false'}
                className={[
                  'glass-card onboarding-surface-inner onboarding-glass-border-soft relative flex h-full overflow-hidden rounded-3xl border px-5 py-[1.35rem] text-left transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/80',
                  isActive
                    ? 'border-white/80 bg-white/[0.11] ring-2 -translate-y-0.5 scale-[1.01] focus-visible:ring-4'
                    : 'hover:border-white/30 hover:bg-white/[0.07] focus-visible:border-white/45 focus-visible:ring-[#cf8bf3]/70',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isActive ? {
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.28),0 0 28px ${modeTheme.glow},0 0 52px ${modeTheme.softTint}`,
                  borderColor: modeTheme.border,
                  background: `color-mix(in srgb, ${modeTheme.softTint} 48%, rgba(255,255,255,0.11))`,
                } : undefined}
              >
                <span
                  className={[
                    'pointer-events-none absolute inset-0 rounded-3xl transition-all duration-250 ease-out',
                    isActive ? 'opacity-100' : 'opacity-0',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    background: `radial-gradient(circle at 25% 15%, color-mix(in srgb, ${modeTheme.accent} 32%, transparent) 0%, color-mix(in srgb, ${modeTheme.accent} 20%, transparent) 35%, color-mix(in srgb, ${modeTheme.accent} 28%, transparent) 70%, transparent 100%)`,
                  }}
                  aria-hidden
                />
                <span className="relative z-10 flex h-full w-full flex-col gap-3">
                  <span className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-[0.12em] text-white/95 sm:text-sm">{content.title}</span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#eed9ff]/80 bg-[#e9d5ff]/90 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#240f43] shadow-[0_0_14px_rgba(207,139,243,0.42)] sm:text-[0.62rem]">
                          <span aria-hidden>✓</span>
                          {copy.selected}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-white/80 sm:px-2.5 sm:text-[0.68rem]">
                      {content.frequency[language]}
                    </span>
                  </span>

                  <span>
                    <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/45 sm:text-[0.68rem]">{copy.state}</span>
                    <span className="mt-1 block text-[0.79rem] leading-[1.35] text-white/75 sm:text-[0.83rem]">{content.state[language]}</span>
                  </span>

                  <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.1em] text-white/60">
                    {language === 'en' ? 'Rhythm intensity' : 'Intensidad del ritmo'} · {content.frequency[language]}
                  </span>

                  <span className="h-px w-full bg-white/10" aria-hidden />

                  <span>
                    <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/45 sm:text-[0.68rem]">{copy.objective}</span>
                    <span className="mt-1 block text-[0.79rem] leading-[1.35] text-white/75 sm:text-[0.83rem]">{content.objective[language]}</span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        {onBack ? (
          <div className="mt-8 flex justify-start">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60"
            >
              ← {copy.back}
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
