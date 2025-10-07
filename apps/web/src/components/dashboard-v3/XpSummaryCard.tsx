import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserLevel, getUserTotalXp } from '../../lib/api';

interface XpSummaryCardProps {
  userId: string;
}

type LevelSummary = {
  totalXp: number;
  level: number;
};

function estimateLevelBoundaries(level: number) {
  if (level <= 0) {
    return { start: 0, end: 120 };
  }

  const start = Math.max(0, Math.round(level * level * 120));
  const end = Math.max(start + 120, Math.round((level + 1) * (level + 1) * 120));

  return { start, end };
}

function buildSummary(data: LevelSummary | null) {
  if (!data) {
    return { percent: 0, remaining: 0, totalXp: 0, level: 0 };
  }

  const { start, end } = estimateLevelBoundaries(data.level);
  const span = Math.max(end - start, 1);
  const progress = Math.max(0, data.totalXp - start);
  const percent = Math.min(100, Math.round((progress / span) * 100));
  const remaining = Math.max(end - data.totalXp, 0);

  return { percent, remaining, totalXp: data.totalXp, level: data.level };
}

export function XpSummaryCard({ userId }: XpSummaryCardProps) {
  const { data, status } = useRequest(async () => {
    const [total, level] = await Promise.all([
      getUserTotalXp(userId),
      getUserLevel(userId),
    ]);

    return {
      totalXp: total.total_xp ?? 0,
      level: level.level ?? 0,
    } satisfies LevelSummary;
  }, [userId]);

  const summary = useMemo(() => buildSummary(data), [data]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🏆 Total XP · 🎯 Level</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          Estimación client-side
        </span>
      </header>

      {status === 'loading' && (
        <div className="mt-6 space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        </div>
      )}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">No pudimos cargar tu progreso. Intentalo más tarde.</p>
      )}

      {status === 'success' && (
        <div className="mt-6 space-y-4">
          <p className="text-3xl font-semibold text-white">{summary.totalXp.toLocaleString('es-AR')}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span className="rounded-full bg-white/10 px-3 py-1 text-white">Nivel {summary.level}</span>
            <span>Te faltan {summary.remaining.toLocaleString('es-AR')} XP para el próximo nivel</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-amber-100"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
