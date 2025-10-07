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

const XP_NUMBER_FORMATTER = new Intl.NumberFormat('es-AR');

function formatNumber(value: number): string {
  return XP_NUMBER_FORMATTER.format(Math.round(value));
}

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

  const activeBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === selectedMonth) ?? buckets[0],
    [buckets, selectedMonth],
  );

  const monthlySummary = useMemo(() => {
    if (!activeBucket || activeBucket.days.length === 0) {
      return { total: 0, average: 0 };
    }

    const total = activeBucket.days.reduce((sum, entry) => sum + entry.xp_day, 0);
    const average = total / activeBucket.days.length;
    return { total, average };
  }, [activeBucket]);

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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <LineChart days={activeBucket.days} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
            <span>
              Total XP del mes: <span className="font-semibold text-white">{formatNumber(monthlySummary.total)}</span>
            </span>
            <span>
              Promedio diario: <span className="font-semibold text-white">{formatNumber(monthlySummary.average)}</span> XP
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Replicamos la vista mensual del MVP usando los datos del endpoint
            <code className="ml-1 rounded bg-white/10 px-1 py-px text-[10px]">/users/:id/xp/daily</code>.
          </p>
        </div>
      )}
    </section>
  );
}

interface LineChartProps {
  days: DailyXpPoint[];
}

function LineChart({ days }: LineChartProps) {
  const sorted = [...days].sort((a, b) => (a.date > b.date ? 1 : -1));
  const maxValue = Math.max(...sorted.map((day) => day.xp_day), 1);

  const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric' });

  const width = 640;
  const height = 220;
  const paddingX = 32;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const baselineY = paddingY + innerHeight;

  const points = sorted.map((day, index) => {
    const ratio = sorted.length === 1 ? 0.5 : index / (sorted.length - 1);
    const x = paddingX + innerWidth * ratio;
    const y = baselineY - (day.xp_day / maxValue) * innerHeight;
    return { x, y, day };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = points.length > 0
    ? [`M${points[0].x.toFixed(2)} ${baselineY}`, ...points.map((point) => `L${point.x.toFixed(2)} ${point.y.toFixed(2)}`), `L${points[points.length - 1].x.toFixed(2)} ${baselineY}`, 'Z'].join(' ')
    : '';

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const ticks = (() => {
    if (points.length === 0) return [] as Array<{ index: number; label: string }>;
    const tickCount = Math.min(points.length, 5);
    const step = points.length > 1 ? (points.length - 1) / (tickCount - 1) : 1;
    const set = new Set<number>();
    for (let i = 0; i < tickCount; i += 1) {
      set.add(Math.round(i * step));
    }
    return Array.from(set)
      .sort((a, b) => a - b)
      .map((index) => {
        const point = points[index];
        const date = new Date(point.day.date);
        return { index, label: dayFormatter.format(date) };
      });
  })();

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
        <defs>
          <linearGradient id="cultivationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(147, 197, 253, 0.8)" />
            <stop offset="100%" stopColor="rgba(147, 197, 253, 0.05)" />
          </linearGradient>
          <linearGradient id="cultivationStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>

        <rect
          x={paddingX}
          y={paddingY}
          width={innerWidth}
          height={innerHeight}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeDasharray="4 4"
        />

        {gridLevels.map((level) => {
          const y = baselineY - innerHeight * level;
          return <line key={level} x1={paddingX} y1={y} x2={paddingX + innerWidth} y2={y} stroke="rgba(255,255,255,0.05)" />;
        })}

        {areaPath && <path d={areaPath} fill="url(#cultivationGradient)" />}
        {linePath && <path d={linePath} fill="none" stroke="url(#cultivationStroke)" strokeWidth={3} strokeLinecap="round" />}

        {points.map((point) => (
          <circle
            key={point.day.date}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#FDE68A"
            stroke="#1F2937"
            strokeWidth={1.5}
          >
            <title>{`${point.day.date}: ${point.day.xp_day} XP`}</title>
          </circle>
        ))}
      </svg>

      {ticks.length > 0 && (
        <div className="mt-2 flex w-full justify-between text-[10px] uppercase tracking-wide text-text-muted">
          {ticks.map((tick) => (
            <span key={tick.index}>{tick.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
