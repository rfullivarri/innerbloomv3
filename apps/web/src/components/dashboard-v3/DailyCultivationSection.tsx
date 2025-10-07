import { useEffect, useMemo, useState } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserDailyXp, type DailyXpPoint } from '../../lib/api';

interface DailyCultivationSectionProps {
  userId: string;
}

type MonthBucket = {
  label: string;
  key: string;
  days: DailyXpPoint[];
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return { from: formatDate(from), to: formatDate(to) };
}

function groupByMonth(series: DailyXpPoint[]): MonthBucket[] {
  const map = new Map<string, DailyXpPoint[]>();

  for (const point of series) {
    const key = point.date.slice(0, 7);
    const arr = map.get(key) ?? [];
    arr.push(point);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([key, days]) => {
      const [year, month] = key.split('-');
      const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' });
      const label = formatter.format(new Date(Number(year), Number(month) - 1));
      return { key, label, days: days.sort((a, b) => (a.date > b.date ? 1 : -1)) } satisfies MonthBucket;
    });
}

export function DailyCultivationSection({ userId }: DailyCultivationSectionProps) {
  const range = useMemo(() => createRange(120), []);
  const { data, status } = useRequest(() => getUserDailyXp(userId, range), [userId, range.from, range.to]);

  const buckets = useMemo(() => groupByMonth(data?.series ?? []), [data?.series]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMonth && buckets.length > 0) {
      setSelectedMonth(buckets[0].key);
    }
  }, [buckets, selectedMonth]);

  const activeBucket = buckets.find((bucket) => bucket.key === selectedMonth) ?? buckets[0];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🪴 Daily Cultivation</h3>
        {buckets.length > 0 && (
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span>Mes</span>
            <select
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
              value={selectedMonth ?? ''}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {buckets.map((bucket) => (
                <option key={bucket.key} value={bucket.key}>
                  {bucket.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {status === 'loading' && (
        <div className="mt-6 h-48 w-full animate-pulse rounded-2xl bg-white/10" />
      )}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">No pudimos cargar tus XP diarios.</p>
      )}

      {status === 'success' && (!activeBucket || activeBucket.days.length === 0) && (
        <p className="mt-6 text-sm text-text-muted">Todavía no registraste XP este mes.</p>
      )}

      {status === 'success' && activeBucket && activeBucket.days.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-end gap-1 rounded-2xl border border-white/10 bg-white/5 p-4">
            <BarChart days={activeBucket.days} />
          </div>
          <p className="text-xs text-text-muted">
            Cada barra representa los XP obtenidos en el día. Replicamos la vista mensual del MVP usando los datos del endpoint
            <code className="ml-1 rounded bg-white/10 px-1 py-px text-[10px]">/users/:id/xp/daily</code>.
          </p>
        </div>
      )}
    </section>
  );
}

interface BarChartProps {
  days: DailyXpPoint[];
}

function BarChart({ days }: BarChartProps) {
  const maxValue = Math.max(...days.map((day) => day.xp_day), 1);

  return (
    <div className="flex w-full items-end gap-[6px]">
      {days.map((day) => {
        const height = Math.round((day.xp_day / maxValue) * 100);
        const date = new Date(day.date);
        const label = date.getDate();
        return (
          <div key={day.date} className="flex flex-1 flex-col items-center justify-end">
            <div
              className="flex w-full max-w-[18px] flex-col justify-end rounded-full bg-gradient-to-t from-purple-800 via-violet-500 to-violet-300"
              style={{ height: `${height}%`, minHeight: '8px' }}
              title={`${day.date}: ${day.xp_day} XP`}
            />
            <span className="mt-2 text-[10px] text-text-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
