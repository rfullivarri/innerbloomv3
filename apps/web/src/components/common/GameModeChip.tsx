import type { CSSProperties } from 'react';
import { type AvatarProfile } from '../../lib/avatarProfile';
import { resolveAvatarChipColor } from '../../lib/avatarChipPalette';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

interface GameModeChipStyle {
  label: string;
  animate: boolean;
  style: CSSProperties;
}

interface GameModeChipProps extends GameModeChipStyle {
  size?: 'default' | 'compact';
  className?: string;
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
  const chipColor = resolveAvatarChipColor(options?.avatarProfile ?? null);
  const style = {
    '--ib-chip-accent': chipColor,
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

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function GameModeChip({ label, animate, style, size = 'default', className }: GameModeChipProps) {
  return (
    <span
      className={cx(
        'ib-game-mode-chip relative inline-flex items-center',
        animate && 'ib-game-mode-chip--animated',
        size === 'compact' && 'ib-game-mode-chip--compact',
        className,
      )}
      style={style}
    >
      <span
        className="ib-game-mode-chip__glow absolute rounded-full"
        aria-hidden
      />
      <span className="ib-game-mode-chip__inner relative inline-flex items-center gap-2 rounded-full border px-3 py-[0.24rem] text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
        <span className="ib-game-mode-chip__dot h-[0.28rem] w-[0.28rem] rounded-full" />
        {label}
      </span>
    </span>
  );
}
