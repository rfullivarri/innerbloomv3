import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

interface GameModeChipStyle {
  label: string;
  backgroundClass: string;
  glowClass: string;
  animate: boolean;
}

const GAME_MODE_STYLES: Record<GameMode, GameModeChipStyle> = {
  Flow: {
    label: 'FLOW',
    backgroundClass: 'bg-gradient-to-r from-sky-500/25 via-indigo-500/30 to-purple-500/25 text-slate-100',
    glowClass: 'bg-sky-400/40',
    animate: true,
  },
  Chill: {
    label: 'CHILL',
    backgroundClass: 'bg-gradient-to-r from-emerald-400/25 via-teal-400/30 to-cyan-400/25 text-emerald-50',
    glowClass: 'bg-emerald-400/40',
    animate: true,
  },
  Evolve: {
    label: 'EVOLVE',
    backgroundClass: 'bg-gradient-to-r from-fuchsia-400/25 via-rose-400/30 to-amber-300/25 text-rose-50',
    glowClass: 'bg-fuchsia-400/40',
    animate: true,
  },
  Low: {
    label: 'LOW',
    backgroundClass: 'bg-gradient-to-r from-amber-300/25 via-orange-400/30 to-yellow-300/25 text-amber-50',
    glowClass: 'bg-amber-400/35',
    animate: true,
  },
};

const DEFAULT_CHIP_STYLE: GameModeChipStyle = {
  label: 'Modo sin definir',
  backgroundClass: 'bg-white/10 text-slate-200',
  glowClass: 'bg-slate-400/20',
  animate: false,
};

export function buildGameModeChip(mode?: string | null): GameModeChipStyle {
  if (!mode) {
    return DEFAULT_CHIP_STYLE;
  }

  const normalized = normalizeGameModeValue(mode);
  if (!normalized) {
    return DEFAULT_CHIP_STYLE;
  }

  return GAME_MODE_STYLES[normalized] ?? DEFAULT_CHIP_STYLE;
}

export function GameModeChip({ label, backgroundClass, glowClass, animate }: GameModeChipStyle) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className={`absolute -inset-[2px] rounded-full blur-md ${glowClass} ${animate ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      <span
        className={`relative inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-[0.26rem] text-[10px] font-semibold uppercase tracking-[0.2em] shadow-[0_0_18px_rgba(15,23,42,0.3)] backdrop-blur ${backgroundClass}`}
      >
        <span className="h-[0.32rem] w-[0.32rem] rounded-full bg-white/80" />
        {label}
      </span>
    </span>
  );
}
