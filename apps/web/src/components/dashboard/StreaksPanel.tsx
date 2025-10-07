import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import { getTasks, getUserDailyXp, type DailyXpPoint, type UserTask } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

interface StreaksPanelProps {
  userId: string;
}

type NormalizedDailyXpPoint = DailyXpPoint & { day: string };

type PanelData = {
  tasks: UserTask[];
  xpSeries: NormalizedDailyXpPoint[];
};

function buildRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return { from: dateStr(from), to: dateStr(to) };
}

function computeWeeklyXp(series: NormalizedDailyXpPoint[]): number {
  const sorted = [...series].sort((a, b) => (a.date > b.date ? -1 : 1));
  const recent = sorted.slice(0, 7);
  return recent.reduce((sum, entry) => sum + (entry.xp_day ?? 0), 0);
}

const PILLAR_FILTERS = [
  { label: 'Body', value: 'Body' },
  { label: 'Mind', value: 'Mind' },
  { label: 'Soul', value: 'Soul' },
] as const;

const SCOPE_FILTERS = [
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
  { label: '3M', value: 'quarter' },
] as const;

export function StreaksPanel({ userId }: StreaksPanelProps) {
  const range = useMemo(() => buildRange(30), []);
  const { data, status } = useRequest<PanelData>(async () => {
    const [tasks, xp] = await Promise.all([
      getTasks(userId),
      getUserDailyXp(userId, range),
    ]);

    const normalizedTasks = asArray<UserTask>(tasks, 'tasks');
    const normalizedSeries = asArray<DailyXpPoint>(xp, 'series').map((row) => {
      const rawDate = (row as any)?.day ?? row.date ?? (row as any)?.created_at ?? (row as any)?.timestamp;
      const day = dateStr(rawDate);
      const fallbackDate = day || row.date || '';
      return {
        ...row,
        day,
        date: fallbackDate,
      } satisfies NormalizedDailyXpPoint;
    });

    return {
      tasks: normalizedTasks,
      xpSeries: normalizedSeries,
    } satisfies PanelData;
  }, [userId, range.from, range.to]);

  const weeklyXp = useMemo(() => computeWeeklyXp(data?.xpSeries ?? []), [data?.xpSeries]);

  const [pillarFilter, setPillarFilter] = useState<(typeof PILLAR_FILTERS)[number]['value']>('Body');
  const [scopeFilter, setScopeFilter] = useState<(typeof SCOPE_FILTERS)[number]['value']>('week');

  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter((task) => {
      if (!pillarFilter) return true;
      return (task.pillar_id ?? '').toString().toLowerCase().includes(pillarFilter.toLowerCase());
    });
  }, [data?.tasks, pillarFilter]);

  return (
    <Card
      title="🔥 Panel de Rachas"
      subtitle="Vista read-only"
      rightSlot={
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 md:inline-flex">
            Beta
          </span>
          <span aria-hidden>⚡</span>
        </span>
      }
    >
      <div className="flex flex-wrap gap-2">
        {PILLAR_FILTERS.map((filter) => {
          const isActive = pillarFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPillarFilter(filter.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                isActive
                  ? 'border-indigo-300/60 bg-indigo-300/15 text-indigo-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPE_FILTERS.map((filter) => {
          const isActive = scopeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setScopeFilter(filter.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                isActive
                  ? 'border-amber-300/60 bg-amber-300/15 text-amber-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {status === 'loading' && <div className="h-56 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos cargar tus tareas activas.</p>
      )}

      {status === 'success' && data && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400">
            La API actual aún no expone <code className="rounded bg-white/10 px-1 py-px text-[10px]">daily_log_raw</code>. Listamos tus tareas activas y calculamos el XP semanal total como referencia.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">XP total últimos 7 días</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{weeklyXp.toLocaleString('es-AR')} XP</p>
            <p className="mt-1 text-xs text-slate-400">Filtro: {pillarFilter} · Alcance: {scopeFilter === 'week' ? 'Semana' : scopeFilter === 'month' ? 'Mes' : '3 meses'}</p>
          </div>

          <div className="space-y-3">
            {filteredTasks.slice(0, 8).map((task) => (
              <article key={task.task_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{task.task}</p>
                    <p className="text-xs text-slate-400">Pilar: {task.pillar_id ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100">+{task.xp_base} XP</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">✓×—</span>
                  </div>
                </div>
              </article>
            ))}

            {filteredTasks.length === 0 && (
              <p className="text-sm text-slate-400">Sin tareas activas para mostrar con el filtro seleccionado.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
