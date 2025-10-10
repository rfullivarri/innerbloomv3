import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';
import { useRequest } from '../../hooks/useRequest';
import { getUserLevel, getUserTotalXp } from '../../lib/api';

interface MetricHeaderProps {
  userId: string;
  gameMode?: string | null;
}

type XpProgressData = {
  xpTotal: number;
  currentLevel: number;
  xpToNext: number | null;
  progressPercent: number;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('es-AR');

function formatInteger(value: number) {
  return NUMBER_FORMATTER.format(Math.max(0, Math.round(value)));
}

export function MetricHeader({ userId, gameMode }: MetricHeaderProps) {
  const { data, status } = useRequest<XpProgressData>(async () => {
    const [total, level] = await Promise.all([
      getUserTotalXp(userId),
      getUserLevel(userId),
    ]);

    const xpTotal = Math.max(0, Math.round(total.total_xp ?? 0));
    const currentLevel = Number.isFinite(level.current_level)
      ? Math.max(0, Math.round(level.current_level))
      : 0;
    const rawXpToNext = level.xp_to_next ?? null;
    const xpToNext = rawXpToNext === null ? null : Math.max(0, Math.round(rawXpToNext));
    const progressPercentRaw = Number(level.progress_percent ?? 0);
    const progressPercent = Number.isFinite(progressPercentRaw)
      ? Math.min(100, Math.max(0, progressPercentRaw))
      : 0;

    return {
      xpTotal,
      currentLevel,
      xpToNext,
      progressPercent,
    } satisfies XpProgressData;
  }, [userId]);

  const showSkeleton = status === 'loading';
  const showError = status === 'error';
  const showContent = status === 'success' && data;

  const progressPercent = showContent ? data.progressPercent : 0;
  const progressLabel = `${progressPercent.toFixed(0)}%`;
  const xpToNextMessage = showContent
    ? data.xpToNext === null
      ? '✨ Alcanzaste el nivel máximo disponible en esta etapa.'
      : `✨ Te faltan ${formatInteger(data.xpToNext)} XP para el próximo nivel`
    : '';
  const levelLabel = showContent ? formatInteger(data.currentLevel) : '—';
  const totalXpLabel = showContent ? formatInteger(data.xpTotal) : '—';
  const chipStyle = useMemo(() => buildGameModeChip(gameMode), [gameMode]);

  const headline = useMemo(() => {
    if (showError) {
      return 'No pudimos cargar tu progreso.';
    }
    if (showSkeleton) {
      return 'Actualizando progreso…';
    }
    return 'Resumen de tu aventura';
  }, [showError, showSkeleton]);

  return (
    <Card
      className="ring-1 ring-indigo-400/20"
      title="Progreso general"
      rightSlot={
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {chipStyle ? <GameModeChip {...chipStyle} /> : null}
          <InfoDotTarget
            id="xpLevel"
            placement="right"
            className="inline-flex items-center"
          >
            <span className="sr-only">Más información sobre tu progreso general</span>
          </InfoDotTarget>
        </div>
      }
      subtitle={headline}
    >
      {showSkeleton && (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      )}

      {showError && (
        <div className="flex flex-col gap-3 text-sm text-rose-200">
          <p>No pudimos conectar con el servicio de XP. Probá actualizar más tarde.</p>
          <p className="text-xs text-rose-200/70">Los datos de progreso se recalculan automáticamente cada pocas horas.</p>
        </div>
      )}

      {showContent && (
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-[2.5em] leading-none">🏆</span>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-semibold text-slate-50 sm:text-5xl">{totalXpLabel}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Total XP
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[2.5em] leading-none">🎯</span>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-semibold text-slate-50 sm:text-5xl">{levelLabel}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Nivel
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Progreso</p>
            <div
              className="relative h-6 w-full overflow-hidden rounded-full border border-white/5 bg-slate-950/60 shadow-[inset_0_2px_8px_rgba(8,15,40,0.6)] sm:h-[30px]"
              role="progressbar"
              aria-label="Progreso hacia el próximo nivel"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(progressPercent.toFixed(1))}
              aria-valuetext={`${progressLabel} completado`}
            >
              <div
                className="absolute inset-0"
                aria-hidden
              >
                <div className="h-full bg-gradient-to-r from-indigo-400/20 via-fuchsia-400/25 to-amber-300/20" />
              </div>
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 transition-[width] duration-500 ease-out progress-fill--typing"
                style={{ width: `${progressPercent.toFixed(1)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)]">
                {progressLabel}
              </span>
            </div>
            {xpToNextMessage && <p className="text-sm text-slate-300">{xpToNextMessage}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

type NormalizedGameMode = 'Flow' | 'Chill' | 'Evolve' | 'Low';

interface GameModeChipStyle {
  label: string;
  backgroundClass: string;
  glowClass: string;
  animate: boolean;
}

function normalizeGameMode(mode?: string | null): NormalizedGameMode | null {
  if (!mode) {
    return null;
  }

  const normalized = mode.trim().toLowerCase();

  switch (normalized) {
    case 'low':
      return 'Low';
    case 'chill':
      return 'Chill';
    case 'evolve':
    case 'evol':
      return 'Evolve';
    case 'flow':
    case 'flow mood':
    case 'flow_mood':
    default:
      return 'Flow';
  }
}

const GAME_MODE_STYLES: Record<NormalizedGameMode, GameModeChipStyle> = {
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

function buildGameModeChip(mode?: string | null): GameModeChipStyle | null {
  if (!mode) {
    return DEFAULT_CHIP_STYLE;
  }

  const normalized = normalizeGameMode(mode);
  if (!normalized) {
    return DEFAULT_CHIP_STYLE;
  }

  return GAME_MODE_STYLES[normalized] ?? DEFAULT_CHIP_STYLE;
}

function GameModeChip({ label, backgroundClass, glowClass, animate }: GameModeChipStyle) {
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
