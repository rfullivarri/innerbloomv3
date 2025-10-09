import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserDailyXp, type DailyXpPoint } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';
import { Card } from '../ui/Card';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';

interface DailyCultivationSectionProps {
  userId: string;
}

type NormalizedDailyXpPoint = DailyXpPoint & { day: string };

type MonthBucket = {
  label: string;
  key: string;
  days: NormalizedDailyXpPoint[];
};

const XP_NUMBER_FORMATTER = new Intl.NumberFormat('es-AR');
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });

function formatNumber(value: number): string {
  return XP_NUMBER_FORMATTER.format(Math.round(value));
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return DAY_MONTH_FORMATTER.format(parsed);
}

function createRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return { from: dateStr(from), to: dateStr(to) };
}

function groupByMonth(series: NormalizedDailyXpPoint[]): MonthBucket[] {
  const map = new Map<string, NormalizedDailyXpPoint[]>();

  for (const point of series) {
    const rawKey = point.day ?? point.date ?? '';
    const keySource = typeof rawKey === 'string' ? rawKey : dateStr(rawKey);
    const key = keySource ? String(keySource).slice(0, 7) : '';
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(point);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([key, days]) => {
      const [year, month] = key.split('-');
      const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' });
      const parsedYear = Number(year);
      const parsedMonth = Number(month) - 1;
      const label = Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)
        ? formatter.format(new Date(parsedYear, parsedMonth))
        : key;
      return { key, label, days: days.sort((a, b) => (a.date > b.date ? 1 : -1)) } satisfies MonthBucket;
    });
}

export function DailyCultivationSection({ userId }: DailyCultivationSectionProps) {
  const range = useMemo(() => createRange(120), []);
  const { data, status } = useRequest(() => getUserDailyXp(userId, range), [userId, range.from, range.to]);
  const series = useMemo<NormalizedDailyXpPoint[]>(() => {
    const rawSeries = (data as any)?.series ?? data;
    console.info('[DASH] dataset', { keyNames: Object.keys(rawSeries ?? {}), isArray: Array.isArray(rawSeries) });
    return asArray<DailyXpPoint>(data, 'series')
      .map((row) => {
        const rawDate = (row as any)?.day ?? row.date ?? (row as any)?.created_at ?? (row as any)?.timestamp;
        const day = dateStr(rawDate);
        return {
          ...row,
          day,
          date: row.date ?? day,
        } satisfies NormalizedDailyXpPoint;
      })
      .filter((row) => !!row.day);
  }, [data]);

  const buckets = useMemo(() => groupByMonth(series), [series]);
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
    <Card
      title="🪴 Daily Cultivation"
      subtitle="Tendencia mensual de XP"
      rightSlot={
        <InfoDotTarget id="dailyCultivation" placement="left" className="ml-auto inline-flex items-center gap-2">
          {buckets.length > 0 ? (
            <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] text-slate-300">
              <span className="text-[11px]">Mes</span>
              <select
                className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 focus:border-white/20 focus:outline-none sm:w-32"
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
          ) : null}
        </InfoDotTarget>
      }
    >
      {status === 'loading' && (
        <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />
      )}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos cargar tus XP diarios.</p>
      )}

      {status === 'success' && (!activeBucket || activeBucket.days.length === 0) && (
        <p className="text-sm text-slate-400">Todavía no registraste XP este mes.</p>
      )}

      {status === 'success' && activeBucket && activeBucket.days.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <LineChart days={activeBucket.days} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Total XP del mes: <span className="font-semibold text-slate-100">{formatNumber(monthlySummary.total)}</span>
            </span>
            <span>
              Promedio diario: <span className="font-semibold text-slate-100">{formatNumber(monthlySummary.average)}</span> XP
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

interface LineChartProps {
  days: DailyXpPoint[];
}

function getIsoDateLabel(point: DailyXpPoint): string {
  const raw = (point as any)?.day ?? point.date ?? (point as any)?.created_at ?? (point as any)?.timestamp;
  if (!raw) return '';
  if (typeof raw === 'string') {
    return raw.slice(0, 10);
  }
  return dateStr(raw) ?? '';
}

function LineChart({ days }: LineChartProps) {
  const sorted = [...days].sort((a, b) => (a.date > b.date ? 1 : -1));
  const maxValue = Math.max(...sorted.map((day) => day.xp_day), 1);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const labels = points.map((point) => getIsoDateLabel(point.day));
  const [layout, setLayout] = useState({
    tickStep: 1,
    dataLabelFontSize: 10,
    axisLabelFontSize: 10,
    axisRowHeight: 36,
    axisMarginTop: 6,
    axisLabelYOffset: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateLayout = () => {
      const elementWidth = containerRef.current?.offsetWidth ?? window.innerWidth ?? 0;
      const clampedMax = Math.max(6, Math.min(12, Math.floor(elementWidth / 90)));
      const tickStep = labels.length > clampedMax ? Math.ceil(labels.length / clampedMax) : 1;
      const dataLabelFontSize = elementWidth < 640 ? 9 : 10;
      const isCompact = elementWidth < 480;
      const axisLabelFontSize = isCompact ? 9 : 10;
      const axisRowHeight = isCompact ? 30 : 36;
      const axisMarginTop = isCompact ? 4 : 6;
      const axisLabelYOffset = isCompact ? -2 : 0;

      setLayout((prev) => {
        if (
          prev.tickStep === tickStep
          && prev.dataLabelFontSize === dataLabelFontSize
          && prev.axisLabelFontSize === axisLabelFontSize
          && prev.axisRowHeight === axisRowHeight
          && prev.axisMarginTop === axisMarginTop
          && prev.axisLabelYOffset === axisLabelYOffset
        ) {
          return prev;
        }
        return {
          tickStep,
          dataLabelFontSize,
          axisLabelFontSize,
          axisRowHeight,
          axisMarginTop,
          axisLabelYOffset,
        };
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
    // NOTE: The layout hook adapts tick density and label font size to match the responsive spec.
  }, [labels.length]);

  const formattedLabels = labels.map((label) => formatDateLabel(label));
  const shouldShowLabel = (index: number) => {
    if (layout.tickStep <= 1) return true;
    if (index === labels.length - 1) return true;
    return index % layout.tickStep === 0;
  };

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative">
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
            key={getIsoDateLabel(point.day)}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#FDE68A"
            stroke="#1F2937"
            strokeWidth={1.5}
          >
            <title>{`${getIsoDateLabel(point.day)}: ${point.day.xp_day} XP`}</title>
          </circle>
        ))}
      </svg>

        <div className="pointer-events-none absolute inset-0">
          {points.map((point) => (
            <div
              key={`${getIsoDateLabel(point.day)}-label`}
              className="absolute flex -translate-x-1/2 flex-col items-center text-xs text-white opacity-80"
              style={{
                left: `${(point.x / width) * 100}%`,
                top: `${(point.y / height) * 100}%`,
                transform: 'translate(-50%, calc(-100% - 6px))',
              }}
            >
              <span
                className="rounded bg-slate-900/80 px-2 py-0.5 font-medium leading-tight shadow-sm shadow-black/40"
                style={{ fontSize: `${layout.dataLabelFontSize}px` }}
              >
                {formatNumber(point.day.xp_day)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {labels.length > 0 && (
        <div
          className="grid gap-1.5 pb-3 text-text-muted"
          style={{
            gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
            marginTop: `${layout.axisMarginTop}px`,
          }}
        >
          {formattedLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="flex items-end justify-center"
              style={{ height: `${layout.axisRowHeight}px` }}
            >
              <span
                className={shouldShowLabel(index) ? 'inline-block leading-tight' : 'invisible'}
                style={{
                  fontSize: `${layout.axisLabelFontSize}px`,
                  letterSpacing: '0.08em',
                  transform: `rotate(-45deg) translateY(${layout.axisLabelYOffset}px)`,
                  transformOrigin: 'top right',
                }}
              >
                {label}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
