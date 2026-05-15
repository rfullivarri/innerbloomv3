import { motion } from 'framer-motion';
import { useId, type CSSProperties } from 'react';
import type { GameMode } from '../state';
import type { OnboardingLanguage } from '../constants';
import { GAME_MODE_META } from '../../lib/gameModeMeta';
import { getOnboardingRhythmTheme } from '../utils/onboardingRhythmTheme';
import { useThemePreference } from '../../theme/ThemePreferenceProvider';

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

const RHYTHM_WAVE_CONFIG: Record<GameMode, { oscillations: number; amplitude: number; activeRatio: number }> = {
  LOW: { oscillations: 2, amplitude: 18, activeRatio: 0.25 },
  CHILL: { oscillations: 2.25, amplitude: 20, activeRatio: 0.37 },
  FLOW: { oscillations: 2.75, amplitude: 22, activeRatio: 0.52 },
  EVOLVE: { oscillations: 3.25, amplitude: 24, activeRatio: 0.62 },
};

const SVG_WIDTH = 320;
const SVG_HEIGHT = 88;
const WAVE_START_X = 18;
const WAVE_END_X = 302;
const WAVE_CENTER_Y = 44;
const WAVE_PHASE = -0.34;

function buildSinePath(mode: GameMode, phase = WAVE_PHASE) {
  const config = RHYTHM_WAVE_CONFIG[mode];
  const points = Array.from({ length: 116 }, (_, index) => {
    const progress = index / 115;
    const x = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * progress;
    const y = WAVE_CENTER_Y + Math.sin(progress * config.oscillations * Math.PI * 2 + phase) * config.amplitude;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return points.join(' ');
}

function buildAnimatedSinePathValues(mode: GameMode) {
  return [WAVE_PHASE, WAVE_PHASE + 0.3, WAVE_PHASE + 0.62, WAVE_PHASE]
    .map((phase) => buildSinePath(mode, phase))
    .join('; ');
}

function getSinePoint(mode: GameMode) {
  const config = RHYTHM_WAVE_CONFIG[mode];
  const progress = config.activeRatio;
  const x = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * progress;
  const y = WAVE_CENTER_Y + Math.sin(progress * config.oscillations * Math.PI * 2 + WAVE_PHASE) * config.amplitude;

  return { x, y };
}

function RhythmWave({ mode, active }: { mode: GameMode; active: boolean }) {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `onboarding-rhythm-wave-gradient-${rawId}`;
  const clipId = `onboarding-rhythm-wave-clip-${rawId}`;
  const path = buildSinePath(mode);
  const animatedPathValues = buildAnimatedSinePathValues(mode);
  const node = getSinePoint(mode);
  const activeWidth = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * RHYTHM_WAVE_CONFIG[mode].activeRatio;
  const animationDuration = active ? '7.6s' : `${8.8 + RHYTHM_WAVE_CONFIG[mode].activeRatio * 2}s`;
  const nodeStyle: CSSProperties = {
    left: `${(node.x / SVG_WIDTH) * 100}%`,
    top: `${(node.y / SVG_HEIGHT) * 100}%`,
  };

  return (
    <div className="relative h-[3.35rem] w-full min-w-[8.25rem] overflow-visible sm:h-16" role="img" aria-label={`${mode} weekly rhythm wave`}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#D977FF" />
            <stop offset="100%" stopColor="#FF86C8" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={activeWidth} height={SVG_HEIGHT} />
          </clipPath>
        </defs>
        <path d={path} fill="none" stroke="rgba(125,128,159,0.34)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 5.8 : 5.2}>
          <animate attributeName="d" dur={animationDuration} repeatCount="indefinite" values={animatedPathValues} />
        </path>
        <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 14 : 10} opacity={active ? 0.5 : 0.22} clipPath={`url(#${clipId})`} filter="blur(4px)">
          <animate attributeName="d" dur={animationDuration} repeatCount="indefinite" values={animatedPathValues} />
        </path>
        <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 6.8 : 5.8} opacity={active ? 0.98 : 0.86} clipPath={`url(#${clipId})`}>
          <animate attributeName="d" dur={animationDuration} repeatCount="indefinite" values={animatedPathValues} />
        </path>
      </svg>
      {active ? (
        <span
          className="rhythm-node pointer-events-none absolute z-10 aspect-square w-9 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_28px_rgba(199,125,255,0.34)] sm:w-10"
          style={nodeStyle}
          aria-hidden="true"
        >
          <span className="absolute inset-[-45%] rounded-full bg-[#c084fc]/34 opacity-70 blur-md" />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_28%,#ffe1f6_0%,#f4a7df_22%,#b872ff_56%,#7c4dff_100%)]" />
          <span className="absolute left-[32%] top-[17%] h-[24%] w-[24%] rounded-full bg-white/62 blur-[0.5px]" />
        </span>
      ) : null}
    </div>
  );
}

export function GameModeStep({ language = 'es', selected, onSelect, onBack }: GameModeStepProps) {
  const { theme } = useThemePreference();
  const isLight = theme === 'light';
  const copy = language === 'en'
    ? {
        step: 'Step 1 · Choose your rhythm',
        title: 'What is your rhythm today?',
        subtitle: 'Choose the weekly intensity that best adapts to you.',
        selected: 'Selected',
        back: 'Back',
        selectedSuffix: ' selected',
      }
    : {
        step: 'Paso 1 · Elegí tu ritmo',
        title: '¿Cuál es tu ritmo hoy?',
        subtitle: 'Elegí la intensidad semanal que mejor se adapta a vos.',
        selected: 'Seleccionado',
        back: 'Volver',
        selectedSuffix: ' seleccionado',
      };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <style>{`
        @keyframes rhythmNodeBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          48% { transform: translate(-50%, -50%) scale(1.08); }
        }

        .rhythm-node {
          animation: rhythmNodeBreathe 4.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .rhythm-node {
            animation: none;
          }
        }
      `}</style>
      <div className="glass-card onboarding-surface-base mx-auto max-w-4xl rounded-3xl p-4 sm:p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">{copy.step}</p>
          <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
          <p className="text-sm text-white/70">{copy.subtitle}</p>
        </header>
        <div className="mt-6 space-y-3 md:space-y-4" role="group" aria-label={copy.title}>
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
                aria-label={`${content.title} · ${content.frequency[language]}${isActive ? copy.selectedSuffix : ''}`}
                data-selected={isActive ? 'true' : 'false'}
                className={[
                  'group relative grid min-h-[4.75rem] w-full grid-cols-[4.25rem_minmax(0,1fr)_4.9rem] items-center gap-2 overflow-hidden rounded-[1.45rem] border px-3 py-2 text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78bff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:grid-cols-[5.5rem_minmax(0,1fr)_6.6rem] sm:gap-4 sm:px-5 md:min-h-[6.05rem] md:grid-cols-[7rem_minmax(0,1fr)_7.5rem] md:rounded-[1.8rem] md:px-6',
                  isLight
                    ? isActive
                      ? 'border-[#8b5cf6]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,240,255,0.88))] shadow-[0_18px_42px_rgba(139,92,246,0.16)]'
                      : 'border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.82))] shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:border-[#c4b5fd] hover:bg-white'
                    : isActive
                      ? 'border-[#b66cff]/80 bg-[linear-gradient(135deg,rgba(33,25,62,0.72),rgba(14,14,30,0.74))] shadow-[inset_0_0_32px_rgba(169,85,247,0.13),0_20px_56px_rgba(87,50,156,0.22)]'
                      : 'border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(10,12,27,0.48))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] hover:border-white/18 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(10,12,27,0.56))]',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isActive ? {
                  boxShadow: isLight
                    ? `0 18px 42px color-mix(in srgb, ${modeTheme.glow} 40%, transparent),0 0 0 1px color-mix(in srgb, ${modeTheme.border} 80%, white)`
                    : `inset 0 0 32px rgba(169,85,247,0.13),0 20px 56px ${modeTheme.glow},0 0 0 1px ${modeTheme.border}`,
                  borderColor: isLight ? `color-mix(in srgb, ${modeTheme.border} 80%, white)` : modeTheme.border,
                  background: isLight
                    ? `linear-gradient(135deg, rgba(255,255,255,0.97), color-mix(in srgb, ${modeTheme.softTint} 28%, rgba(248,250,252,0.92)))`
                    : `linear-gradient(135deg, color-mix(in srgb, ${modeTheme.softTint} 52%, rgba(33,25,62,0.72)), rgba(14,14,30,0.74))`,
                } : undefined}
              >
                <span
                  className={`pointer-events-none absolute inset-x-3 top-3 h-6 rounded-full blur-sm ${isLight ? 'bg-white/55 opacity-70' : 'bg-black/20'}`}
                  aria-hidden
                />
                <h3 className="relative z-10 min-w-0 text-[1rem] font-semibold text-white/94 sm:text-[1.2rem] md:text-[1.58rem]">
                  {content.title.replace(' MOOD', '').replace(' Mood', '')}
                </h3>
                <div className="relative z-10 min-w-0">
                  <RhythmWave mode={mode} active={isActive} />
                </div>
                <div className="relative z-10 justify-self-end text-right text-[0.78rem] font-semibold text-white/88 sm:text-sm md:text-base">
                  {content.frequency[language]}
                </div>
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
