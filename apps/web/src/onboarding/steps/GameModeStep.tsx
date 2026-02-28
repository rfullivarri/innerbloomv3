import { motion } from 'framer-motion';
import type { GameMode } from '../state';
import { getBannerObjectPosition } from '../utils/bannerObjectPosition';
import { NavButtons } from '../ui/NavButtons';

interface GameModeStepProps {
  selected: GameMode | null;
  onSelect: (mode: GameMode) => void;
  onConfirm: () => void;
  onBack?: () => void;
}

type ModeCardContent = {
  title: string;
  frequency: string;
  state: string;
  objective: string;
  accentColor: string;
  avatarSrc: string;
  avatarAlt: string;
};

export const MODE_CARD_CONTENT: Record<GameMode, ModeCardContent> = {
  FLOW: {
    title: 'FLOW MOOD',
    frequency: '3x/semana',
    state: 'En foco. En movimiento.',
    objective: 'Canalizar energía en metas concretas.',
    accentColor: '#49C2F2',
    avatarSrc: '/flowGMO.png',
    avatarAlt: 'Avatar del modo Flow en movimiento y enfocado.',
  },
  LOW: {
    title: 'LOW MOOD',
    frequency: '1x/semana',
    state: 'Baja energía. Saturado.',
    objective: 'Activar lo mínimo vital con pasos pequeños.',
    accentColor: '#FF6B6B',
    avatarSrc: '/lowGMO.png',
    avatarAlt: 'Avatar del modo Low con expresión de descanso.',
  },
  CHILL: {
    title: 'CHILL MOOD',
    frequency: '2x/semana',
    state: 'Estable. Sin presión.',
    objective: 'Sostener hábitos simples con constancia.',
    accentColor: '#6EDC8C',
    avatarSrc: '/chillGMO.png',
    avatarAlt: 'Avatar del modo Chill con expresión de calma.',
  },
  EVOLVE: {
    title: 'EVOLVE MOOD',
    frequency: '4x/semana',
    state: 'Ambicioso. Determinado.',
    objective: 'Sostener ritmo alto con estructura clara.',
    accentColor: '#9B6CFF',
    avatarSrc: '/evolveGMO.png',
    avatarAlt: 'Avatar del modo Evolve con expresión determinada.',
  },
};

const MODE_ORDER: GameMode[] = ['LOW', 'CHILL', 'FLOW', 'EVOLVE'];

export function GameModeStep({ selected, onSelect, onConfirm, onBack }: GameModeStepProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-4xl rounded-3xl p-4 sm:p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Paso 1 · Elegí tu modo</p>
          <h2 className="text-3xl font-semibold text-white">¿Cómo querés jugar hoy?</h2>
          <p className="text-sm text-white/70">Elegí el modo que mejor representa tu estado actual.</p>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {MODE_ORDER.map((mode) => {
            const content = MODE_CARD_CONTENT[mode];
            const isActive = selected === mode;
            const bannerObjectPosition = getBannerObjectPosition(mode);

            return (
              <motion.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(mode)}
                aria-pressed={isActive}
                aria-label={`${content.title}${isActive ? ' seleccionado' : ''}`}
                data-selected={isActive ? 'true' : 'false'}
                className={[
                  'glass-card onboarding-surface-inner onboarding-glass-border-soft relative flex h-full overflow-hidden rounded-3xl border px-5 py-[1.35rem] text-left transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/80',
                  isActive
                    ? 'border-white/80 bg-white/[0.11] ring-2 ring-sky-300/85 shadow-[0_0_0_1px_rgba(255,255,255,0.28),0_0_28px_rgba(34,211,238,0.38),0_0_52px_rgba(139,92,246,0.34)] -translate-y-0.5 scale-[1.01] focus-visible:ring-4 focus-visible:ring-cyan-200/95'
                    : 'hover:border-white/30 hover:bg-white/[0.07] focus-visible:border-white/45 focus-visible:ring-sky-300/70',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_25%_15%,rgba(34,211,238,0.22)_0%,rgba(59,130,246,0.12)_35%,rgba(139,92,246,0.22)_70%,transparent_100%)] transition-all duration-250 ease-out',
                    isActive ? 'opacity-100' : 'opacity-0',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                />
                <span
                  className="absolute inset-y-0 left-0 z-10 w-[6px] rounded-l-3xl"
                  aria-hidden
                  style={{ backgroundColor: content.accentColor }}
                />
                <span className="relative z-10 ml-4 flex h-full w-full flex-col gap-3">
                  <span className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-[0.12em] text-white/95 sm:text-sm">{content.title}</span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-300/95 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-950 shadow-[0_0_14px_rgba(110,231,183,0.42)] sm:text-[0.62rem]">
                          <span aria-hidden>✓</span>
                          Seleccionado
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-white/80 sm:px-2.5 sm:text-[0.68rem]">
                      {content.frequency}
                    </span>
                  </span>

                  <span>
                    <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/45 sm:text-[0.68rem]">Estado</span>
                    <span className="mt-1 block text-[0.79rem] leading-[1.35] text-white/75 sm:text-[0.83rem]">{content.state}</span>
                  </span>

                  <span className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <img
                      src={content.avatarSrc}
                      alt={content.avatarAlt}
                      className="h-[110px] w-full object-cover sm:h-[124px]"
                      style={{ objectPosition: bannerObjectPosition }}
                      loading="lazy"
                    />
                  </span>

                  <span className="h-px w-full bg-white/10" aria-hidden />

                  <span>
                    <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/45 sm:text-[0.68rem]">Objetivo</span>
                    <span className="mt-1 block text-[0.79rem] leading-[1.35] text-white/75 sm:text-[0.83rem]">{content.objective}</span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
        <NavButtons
          showBack={Boolean(onBack)}
          onBack={onBack}
          onConfirm={onConfirm}
          confirmLabel={selected ? 'Entrar al modo' : 'Seleccioná un modo'}
          disabled={!selected}
        />
      </div>
    </motion.div>
  );
}
