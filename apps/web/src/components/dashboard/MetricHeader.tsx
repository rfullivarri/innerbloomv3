import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import { getUserLevel, getUserTotalXp } from '../../lib/api';

interface MetricHeaderProps {
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

export function MetricHeader({ userId }: MetricHeaderProps) {
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
      subtitle={headline}
      rightSlot={
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">
          XP Tracker
        </span>
      }
    >
      {showSkeleton && (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricStat label="Total XP" value={totalXpLabel} helper="Acumulado histórico" />
            <MetricStat label="Nivel actual" value={levelLabel} helper="Escala estimada MVP" />
            <MetricStat label="Progreso" value={progressLabel} helper="Hacia el próximo nivel" />
          </div>

          <div className="space-y-3">
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
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
                style={{ width: `${progressPercent.toFixed(1)}%` }}
              />
            </div>
            {xpToNextMessage && <p className="text-sm text-slate-400">{xpToNextMessage}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

interface MetricStatProps {
  label: string;
  value: string;
  helper: string;
}

function MetricStat({ label, value, helper }: MetricStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  );
}
