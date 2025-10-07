import { useRequest } from '../../hooks/useRequest';
import { getUserLevel, getUserTotalXp } from '../../lib/api';

interface XpSummaryCardProps {
  userId: string;
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

export function XpSummaryCard({ userId }: XpSummaryCardProps) {
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

  return (
    <section className="rounded-2xl bg-[var(--card)] p-4 text-sm text-white">
      <header className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-medium">
          <span className="flex items-center gap-1">
            <span aria-hidden>🏆</span>
            <span className="text-white/70">Total XP:</span>
            <span className="font-semibold text-white">{totalXpLabel}</span>
          </span>
          <span className="text-white/40">·</span>
          <span className="flex items-center gap-1">
            <span aria-hidden>🎯</span>
            <span className="text-white/70">Level:</span>
            <span className="font-semibold text-white">{levelLabel}</span>
          </span>
        </p>

        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-xs text-white/70"
        >
          i
        </span>
      </header>

      {showSkeleton && (
        <div className="mt-6 space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-56 animate-pulse rounded bg-white/10" />
        </div>
      )}

      {showError && (
        <p className="mt-6 text-sm text-rose-300">
          No pudimos cargar tu progreso. Intentalo más tarde.
        </p>
      )}

      {showContent && (
        <div className="mt-6 space-y-3">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Progreso hacia el próximo nivel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(progressPercent.toFixed(1))}
            aria-valuetext={`${progressLabel} completado`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f7d14a] via-[#f3b940] to-[#ef9f38]"
              style={{ width: `${progressPercent.toFixed(1)}%` }}
            />
          </div>

          {xpToNextMessage && (
            <p className="text-sm text-white/70">{xpToNextMessage}</p>
          )}
        </div>
      )}
    </section>
  );
}
