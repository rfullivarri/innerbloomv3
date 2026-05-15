import { Link } from 'react-router-dom';
import { useId, useState, type CSSProperties } from 'react';
import { GAME_MODE_META } from '../../lib/gameModeMeta';
import { getLandingThemeBackground, readLandingThemeMode, type LandingThemeMode } from '../../lib/landingTheme';

type RhythmTheme = 'dark' | 'light';

interface RhythmOption {
  name: 'Low' | 'Chill' | 'Flow' | 'Evolve';
  frequency: string;
  oscillations: number;
  amplitude: number;
  activeRatio: number;
}

const RHYTHM_OPTIONS: RhythmOption[] = [
  { name: 'Low', frequency: GAME_MODE_META.Low.frequency.en, oscillations: 2, amplitude: 18, activeRatio: 0.25 },
  { name: 'Chill', frequency: GAME_MODE_META.Chill.frequency.en, oscillations: 2.25, amplitude: 20, activeRatio: 0.37 },
  { name: 'Flow', frequency: GAME_MODE_META.Flow.frequency.en, oscillations: 2.75, amplitude: 22, activeRatio: 0.52 },
  { name: 'Evolve', frequency: GAME_MODE_META.Evolve.frequency.en, oscillations: 3.25, amplitude: 24, activeRatio: 0.62 },
];

const SVG_WIDTH = 320;
const SVG_HEIGHT = 88;
const WAVE_START_X = 18;
const WAVE_END_X = 302;
const WAVE_CENTER_Y = 44;
const WAVE_PHASE = -0.34;

function buildSinePath(option: RhythmOption, phase = WAVE_PHASE) {
  const points = Array.from({ length: 116 }, (_, index) => {
    const progress = index / 115;
    const x = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * progress;
    const y = WAVE_CENTER_Y + Math.sin(progress * option.oscillations * Math.PI * 2 + phase) * option.amplitude;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return points.join(' ');
}

function buildAnimatedSinePathValues(option: RhythmOption) {
  return [WAVE_PHASE, WAVE_PHASE + 0.3, WAVE_PHASE + 0.62, WAVE_PHASE].map((phase) => buildSinePath(option, phase)).join('; ');
}

function getSinePoint(option: RhythmOption) {
  const progress = option.activeRatio;
  const x = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * progress;
  const y = WAVE_CENTER_Y + Math.sin(progress * option.oscillations * Math.PI * 2 + WAVE_PHASE) * option.amplitude;

  return { x, y };
}

function getThemeSurface(theme: RhythmTheme): CSSProperties {
  if (theme === 'light') {
    return {
      background:
        'radial-gradient(circle at 84% 12%, rgba(202, 173, 255, 0.30), transparent 34%), radial-gradient(circle at 12% 82%, rgba(255, 174, 217, 0.15), transparent 38%), linear-gradient(180deg, #FBFAFF 0%, #F3EEFF 100%)',
    };
  }

  return {
    background:
      'radial-gradient(circle at 78% 8%, rgba(121, 77, 255, 0.23), transparent 38%), radial-gradient(circle at 16% 94%, rgba(59, 130, 246, 0.12), transparent 42%), linear-gradient(180deg, #090815 0%, #040610 100%)',
  };
}

function RhythmWave({ option, selected, theme }: { option: RhythmOption; selected: boolean; theme: RhythmTheme }) {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `rhythm-wave-gradient-${rawId}`;
  const clipId = `rhythm-wave-clip-${rawId}`;
  const path = buildSinePath(option);
  const animatedPathValues = selected ? buildAnimatedSinePathValues(option) : undefined;
  const node = getSinePoint(option);
  const activeWidth = WAVE_START_X + (WAVE_END_X - WAVE_START_X) * option.activeRatio;
  const mutedStroke = theme === 'light' ? 'rgba(144, 130, 172, 0.36)' : 'rgba(125, 128, 159, 0.34)';
  const waveStrokeWidth = 5.8;
  const selectedWaveFilter = selected
    ? theme === 'light'
      ? 'drop-shadow(0 0 8px rgba(183, 124, 255, 0.24))'
      : 'drop-shadow(0 0 10px rgba(199, 125, 255, 0.32))'
    : undefined;
  const animationDuration = '7.6s';
  const nodeStyle: CSSProperties = {
    left: `${(node.x / SVG_WIDTH) * 100}%`,
    top: `${(node.y / SVG_HEIGHT) * 100}%`,
  };

  return (
    <div className="relative h-[3.35rem] w-full min-w-[8.25rem] overflow-visible sm:h-16" role="img" aria-label={`${option.name} weekly rhythm wave`}>
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
        <path d={path} fill="none" stroke={mutedStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth={waveStrokeWidth} vectorEffect="non-scaling-stroke">
          {selected && <animate attributeName="d" dur={animationDuration} repeatCount="indefinite" values={animatedPathValues} />}
        </path>
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={waveStrokeWidth}
          opacity={selected ? 0.98 : 0.82}
          clipPath={`url(#${clipId})`}
          vectorEffect="non-scaling-stroke"
          style={{ filter: selectedWaveFilter }}
        >
          {selected && <animate attributeName="d" dur={animationDuration} repeatCount="indefinite" values={animatedPathValues} />}
        </path>
      </svg>
      {selected && (
        <span
          className={`rhythm-node pointer-events-none absolute z-10 aspect-square w-9 -translate-x-1/2 -translate-y-1/2 rounded-full sm:w-10 ${
            theme === 'light' ? 'shadow-[0_0_24px_rgba(183,124,255,0.22)]' : 'shadow-[0_0_28px_rgba(199,125,255,0.34)]'
          }`}
          style={nodeStyle}
          aria-hidden="true"
        >
          <span className={`absolute inset-[-45%] rounded-full blur-md opacity-70 ${theme === 'light' ? 'bg-[#c084fc]/24' : 'bg-[#c084fc]/34'}`} />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_28%,#ffe1f6_0%,#f4a7df_22%,#b872ff_56%,#7c4dff_100%)]" />
          <span className="absolute left-[32%] top-[17%] h-[24%] w-[24%] rounded-full bg-white/62 blur-[0.5px]" />
        </span>
      )}
    </div>
  );
}

function RhythmWaveSelectorPreview({ theme, selectedRhythm, onSelectRhythm }: { theme: RhythmTheme; selectedRhythm: RhythmOption['name']; onSelectRhythm: (name: RhythmOption['name']) => void }) {
  const isLight = theme === 'light';

  return (
    <div
      className={`rounded-[2rem] border p-3 shadow-2xl sm:p-4 md:rounded-[2.4rem] md:p-5 ${
        isLight
          ? 'border-[#d8cff3]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(246,241,255,0.64))] shadow-[0_28px_80px_rgba(118,91,173,0.18)]'
          : 'border-white/10 bg-[linear-gradient(145deg,rgba(12,13,29,0.82),rgba(22,17,45,0.58))] shadow-[0_28px_90px_rgba(8,7,20,0.58)]'
      }`}
    >
      <div className="space-y-3 md:space-y-4" role="group" aria-label={`${theme} rhythm selector preview`}>
        {RHYTHM_OPTIONS.map((option) => {
          const selected = option.name === selectedRhythm;
          return (
            <button
              key={option.name}
              type="button"
              className={`group relative grid min-h-[4.75rem] w-full grid-cols-[4.2rem_minmax(0,1fr)_4.7rem] items-center gap-2 overflow-hidden rounded-[1.45rem] border px-3 py-2 text-left transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d78bff]/70 focus-visible:ring-offset-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] sm:gap-4 sm:px-5 md:min-h-[6.05rem] md:grid-cols-[7rem_minmax(0,1fr)_7.5rem] md:rounded-[1.8rem] md:px-6 ${
                isLight ? 'focus-visible:ring-offset-[#fbfaff]' : 'focus-visible:ring-offset-[#090815]'
              } ${
                selected
                  ? isLight
                    ? 'border-[#b77cff]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,235,255,0.76))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_44px_rgba(154,104,255,0.18)]'
                    : 'border-[#b66cff]/78 bg-[linear-gradient(135deg,rgba(33,25,62,0.72),rgba(14,14,30,0.74))] shadow-[inset_0_0_32px_rgba(169,85,247,0.13),0_20px_56px_rgba(87,50,156,0.22)]'
                  : isLight
                    ? 'border-[#ded5f4]/84 bg-[linear-gradient(135deg,rgba(255,255,255,0.70),rgba(247,243,255,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] hover:border-[#c9b6f2] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(247,243,255,0.7))]'
                    : 'border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(10,12,27,0.48))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] hover:border-white/18 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(10,12,27,0.56))]'
              }`}
              aria-pressed={selected}
              onClick={() => onSelectRhythm(option.name)}
            >
              <div className={`pointer-events-none absolute inset-x-3 top-3 h-6 rounded-full blur-sm ${isLight ? 'bg-white/46' : 'bg-black/20'}`} />
              <h3 className={`relative z-10 text-[1rem] font-semibold tracking-[-0.03em] sm:text-[1.2rem] md:text-[1.58rem] ${isLight ? 'text-[#181126]' : 'text-white/94'}`}>{option.name}</h3>
              <div className="relative z-10 min-w-0">
                <RhythmWave option={option} selected={selected} theme={theme} />
              </div>
              <div
                className={`relative z-10 justify-self-end rounded-full border px-2.5 py-2 text-center text-[0.72rem] font-medium tracking-[-0.01em] sm:min-w-[5.8rem] sm:px-4 sm:text-sm md:text-base ${
                  isLight
                    ? 'border-[#cfc3ee]/86 bg-[#fffaff]/72 text-[#34274f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]'
                    : 'border-white/12 bg-white/[0.075] text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                }`}
              >
                {option.frequency}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewSection({ theme, title }: { theme: RhythmTheme; title: string }) {
  const isLight = theme === 'light';
  const [selectedRhythm, setSelectedRhythm] = useState<RhythmOption['name']>('Flow');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className={`text-xl font-semibold tracking-[-0.03em] md:text-2xl ${isLight ? 'text-[#171126]' : 'text-white'}`}>{title}</h2>
        <span className={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${isLight ? 'border-[#d8cff3] bg-white/60 text-[#5a4a7a]' : 'border-white/12 bg-white/[0.06] text-white/62'}`}>{selectedRhythm} selected</span>
      </div>
      <div className="rounded-[2.4rem] p-3 sm:p-5 md:p-7" style={getThemeSurface(theme)}>
        <RhythmWaveSelectorPreview theme={theme} selectedRhythm={selectedRhythm} onSelectRhythm={setSelectedRhythm} />
      </div>
    </section>
  );
}

export default function OnboardingRhythmSelectorLabPage() {
  const themeMode: LandingThemeMode = readLandingThemeMode();
  const landingThemeBackground = getLandingThemeBackground(themeMode);

  return (
    <main
      className={`min-h-screen ${themeMode === 'light' ? 'text-[#171126]' : 'text-white'}`}
      style={{ backgroundColor: landingThemeBackground.base, backgroundImage: landingThemeBackground.gradient }}
    >
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 md:gap-10 md:py-10">
        <header className={`rounded-[2rem] border p-5 shadow-2xl backdrop-blur-xl md:p-7 ${themeMode === 'light' ? 'border-[#d8cff3]/80 bg-white/64 shadow-[0_22px_70px_rgba(118,91,173,0.16)]' : 'border-white/12 bg-white/[0.075] shadow-[0_24px_80px_rgba(4,4,12,0.42)]'}`}>
          <Link to="/labs" className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:-translate-y-0.5 ${themeMode === 'light' ? 'border-[#d8cff3] bg-white/68 text-[#4d3d72] hover:bg-white' : 'border-white/12 bg-white/[0.06] text-white/72 hover:bg-white/[0.1] hover:text-white'}`}>
            <span aria-hidden>←</span>
            Back to labs
          </Link>
          <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.22em] ${themeMode === 'light' ? 'text-[#7a64ad]' : 'text-white/54'}`}>Visual prototype</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">Onboarding Rhythm Selector</h1>
          <p className={`mt-3 max-w-3xl text-sm leading-relaxed md:text-base ${themeMode === 'light' ? 'text-[#3b305f]/78' : 'text-white/70'}`}>
            Prototype for the new onboarding rhythm selector with sine-wave weekly intensity. This lab is isolated from the real onboarding flow.
          </p>
        </header>

        <PreviewSection theme="dark" title="Dark mode preview" />
        <PreviewSection theme="light" title="Light mode preview" />
      </div>
    </main>
  );
}
