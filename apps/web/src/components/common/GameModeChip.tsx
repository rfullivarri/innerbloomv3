import type { CSSProperties } from 'react';
import { resolveAvatarTheme, type AvatarProfile } from '../../lib/avatarProfile';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

interface GameModeChipStyle {
  label: string;
  animate: boolean;
  style: CSSProperties;
}

const GAME_MODE_LABELS: Record<GameMode, string> = {
  Flow: 'FLOW',
  Chill: 'CHILL',
  Evolve: 'EVOLVE',
  Low: 'LOW',
};

const DEFAULT_CHIP_STYLE: GameModeChipStyle = {
  label: 'Modo sin definir',
  animate: false,
  style: {},
};

export function buildGameModeChip(
  mode?: string | null,
  options?: { avatarProfile?: AvatarProfile | null },
): GameModeChipStyle {
  const theme = resolveAvatarTheme(options?.avatarProfile ?? null);
  const style = {
    '--ib-chip-accent': theme.accent,
  } as CSSProperties;

  if (!mode) {
    return { ...DEFAULT_CHIP_STYLE, style };
  }

  const normalized = normalizeGameModeValue(mode);
  if (!normalized) {
    return { ...DEFAULT_CHIP_STYLE, style };
  }

  return {
    label: GAME_MODE_LABELS[normalized] ?? DEFAULT_CHIP_STYLE.label,
    animate: true,
    style,
  };
}

export function GameModeChip({ label, animate, style }: GameModeChipStyle) {
  return (
    <span className="ib-game-mode-chip relative inline-flex items-center" style={style}>
      <span
        className={`ib-game-mode-chip__glow absolute -inset-[2px] rounded-full blur-md ${animate ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      <span className="ib-game-mode-chip__inner relative inline-flex items-center gap-2 rounded-full border px-3 py-[0.26rem] text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
        <span className="h-[0.32rem] w-[0.32rem] rounded-full bg-white/80" />
        {label}
      </span>
    </span>
  );
}
