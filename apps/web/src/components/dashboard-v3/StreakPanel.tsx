import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getTasks, getUserDailyXp, type DailyXpPoint, type UserTask } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

interface StreakPanelProps {
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

export function StreakPanel({ userId }: StreakPanelProps) {
  const range = useMemo(() => buildRange(30), []);
  const { data, status } = useRequest<PanelData>(async () => {
    const [tasks, xp] = await Promise.all([
      getTasks(userId),
      getUserDailyXp(userId, range),
    ]);

    console.info('[DASH] dataset', { keyNames: Object.keys(tasks ?? {}), isArray: Array.isArray(tasks) });
    console.info('[DASH] dataset', { keyNames: Object.keys(xp ?? {}), isArray: Array.isArray(xp) });

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
    };
  }, [userId, range.from, range.to]);

  const weeklyXp = useMemo(() => computeWeeklyXp(data?.xpSeries ?? []), [data?.xpSeries]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🔥 Panel de Rachas</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Vista read-only
        </span>
      </header>

      {status === 'loading' && <div className="mt-6 h-56 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">No pudimos cargar tus tareas activas.</p>
      )}

      {status === 'success' && data && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-text-muted">
            La API actual aún no expone <code className="rounded bg-white/10 px-1 py-px text-[10px]">daily_log_raw</code>. Listamos tus tareas activas y
            calculamos el XP semanal total como referencia.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-text-muted">XP total últimos 7 días</p>
            <p className="text-2xl font-semibold text-white">{weeklyXp.toLocaleString('es-AR')} XP</p>
          </div>

          <div className="space-y-3">
            {data.tasks.slice(0, 8).map((task) => (
              <article key={task.task_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{task.task}</p>
                    <p className="text-xs text-text-muted">Pilar: {task.pillar_id ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-white/10 px-2 py-1 text-white">+{task.xp_base} XP</span>
                    <span className="rounded-full border border-white/10 px-2 py-1">✓×—</span>
                  </div>
                </div>
              </article>
            ))}

            {data.tasks.length === 0 && (
              <p className="text-sm text-text-muted">Sin tareas activas para mostrar.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
