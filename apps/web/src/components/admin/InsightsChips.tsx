import type { AdminInsights } from '../../lib/types';

type InsightsProps = {
  insights: AdminInsights | null;
  loading: boolean;
};

function SkeletonChip() {
  return <div className="h-20 w-full animate-pulse rounded-xl bg-slate-800/80" />;
}

export function InsightsChips({ insights, loading }: InsightsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonChip key={index} />
        ))}
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-300">
        Seleccioná un usuario para ver sus insights.
      </div>
    );
  }

  const { level, xp, streaks, constancyWeekly, emotions } = insights;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-sky-500/20 to-blue-500/10 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Nivel</p>
        <p className="mt-2 text-3xl font-bold text-sky-50">{level.level}</p>
        <p className="mt-1 text-xs text-sky-100/80">
          {level.xpCurrent} XP · {level.xpToNext} para el siguiente nivel
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">XP</p>
        <p className="mt-2 text-lg font-semibold text-emerald-50">Total {xp.total}</p>
        <p className="mt-1 text-xs text-emerald-100/80">30d: {xp.last30d} · 90d: {xp.last90d}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-100/80">
          <span>Cuerpo {xp.byPillar.body}</span>
          <span>Mente {xp.byPillar.mind}</span>
          <span>Alma {xp.byPillar.soul}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-fuchsia-500/15 to-purple-500/10 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Rachas</p>
        <p className="mt-2 text-lg font-semibold text-fuchsia-50">Diaria {streaks.dailyCurrent}</p>
        <p className="text-xs text-fuchsia-100/80">Semanal {streaks.weeklyCurrent} · Máxima {streaks.longest}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <span className="rounded-lg bg-fuchsia-500/10 px-2 py-1">Body {constancyWeekly.body}</span>
          <span className="rounded-lg bg-fuchsia-500/10 px-2 py-1">Mind {constancyWeekly.mind}</span>
          <span className="rounded-lg bg-fuchsia-500/10 px-2 py-1">Soul {constancyWeekly.soul}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Emociones</p>
        <p className="mt-2 text-sm font-semibold text-amber-50">Top 3</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-amber-100/80">
          {emotions.top3.map((emotion) => (
            <span key={emotion} className="rounded-full bg-amber-500/20 px-2 py-1">
              {emotion}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-amber-100/70">
          Últimos 7 días: {emotions.last7.join(', ') || '—'}
        </p>
      </div>
    </div>
  );
}
