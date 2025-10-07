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
  const progressLabel = `${progressPercent.toFixed(1)}%`;
  const xpToNextLabel = showContent
    ? data.xpToNext === null
      ? 'Nivel Máximo'
      : `${formatInteger(data.xpToNext)} XP`
    : '—';
  const xpToNextMessage = showContent
    ? data.xpToNext === null
      ? 'Alcanzaste el nivel máximo disponible en esta etapa.'
      : `Te faltan ${formatInteger(data.xpToNext)} XP para el próximo nivel.`
    : '';

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🏆 Total XP · 🎯 Level</h3>
      </header>

      {showSkeleton && (
        <div className="mt-6 space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        </div>
      )}

      {showError && (
        <p className="mt-6 text-sm text-rose-300">No pudimos cargar tu progreso. Intentalo más tarde.</p>
      )}

      {showContent && (
        <div className="mt-6 space-y-4 text-text-muted">
          <p className="text-3xl font-semibold text-white">
            XP Total: {formatInteger(data.xpTotal)}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-white">
              Nivel {data.currentLevel}
            </span>
            <span>XP para el próximo nivel: {xpToNextLabel}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide">
              <span>Progreso al próximo nivel</span>
              <span className="text-sm font-semibold text-white">{progressLabel}</span>
            </div>

            <div
              className="h-3 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Progreso hacia el próximo nivel"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(progressPercent.toFixed(1))}
              aria-valuetext={`${progressLabel} completado`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-amber-100"
                style={{ width: `${progressPercent.toFixed(1)}%` }}
              />
            </div>
          </div>

          {xpToNextMessage && <p className="text-xs text-text-muted">{xpToNextMessage}</p>}
        </div>
      )}
    </section>
  );
}
