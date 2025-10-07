import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserStateTimeseries, type EnergyTimeseriesPoint } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

interface RadarChartCardProps {
  userId: string;
}

function buildRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return { from: dateStr(from), to: dateStr(to) };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return Math.round(value * 100);
  return Math.round(Math.min(value, 120));
}

function computeDataset(series: EnergyTimeseriesPoint[] | null) {
  if (!series || series.length === 0) {
    return {
      values: [0, 0, 0],
      max: 100,
    };
  }

  const body = toPercent(average(series.map((row) => row.Body ?? 0)));
  const mind = toPercent(average(series.map((row) => row.Mind ?? 0)));
  const soul = toPercent(average(series.map((row) => row.Soul ?? 0)));
  const max = Math.max(100, body, mind, soul);

  return { values: [body, mind, soul], max };
}

export function RadarChartCard({ userId }: RadarChartCardProps) {
  const range = useMemo(() => buildRange(60), []);
  const { data, status } = useRequest(() => getUserStateTimeseries(userId, range), [userId, range.from, range.to]);
  const series = useMemo(() => {
    console.info('[DASH] dataset', { keyNames: Object.keys(data ?? {}), isArray: Array.isArray(data) });
    return asArray<EnergyTimeseriesPoint>(data);
  }, [data]);
  const dataset = useMemo(() => computeDataset(series), [series]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🧿 Radar Chart</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Energía promedio · últimos 60 días
        </span>
      </header>

      {status === 'loading' && <div className="mt-6 h-64 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">No pudimos construir el radar. Probá más tarde.</p>
      )}

      {status === 'success' && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <Radar values={dataset.values} max={dataset.max} />
          <p className="text-xs text-text-muted text-center">
            Ante la falta del agregado <code className="rounded bg-white/10 px-1 py-px text-[10px]">habitos_by_rasgo</code>, usamos la
            energía media de cada pilar como proxy visual.
          </p>
        </div>
      )}
    </section>
  );
}

interface RadarProps {
  values: number[];
  max: number;
}

function Radar({ values, max }: RadarProps) {
  const radius = 120;
  const center = radius + 12;
  const axes = ['Body', 'Mind', 'Soul'];

  const angleFor = (index: number) => (-Math.PI / 2) + (index * (2 * Math.PI / axes.length));

  const pointFor = (value: number, index: number) => {
    const normalized = Math.max(0, Math.min(value / max, 1));
    const angle = angleFor(index);
    const x = center + radius * normalized * Math.cos(angle);
    const y = center + radius * normalized * Math.sin(angle);
    return `${x},${y}`;
  };

  const polygonPoints = values.map((value, index) => pointFor(value, index)).join(' ');

  const gridLevels = [0.33, 0.66, 1];

  return (
    <svg width={center * 2} height={center * 2} viewBox={`0 0 ${center * 2} ${center * 2}`} className="max-w-full">
      <defs>
        <linearGradient id="radarFill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(102, 0, 204, 0.45)" />
          <stop offset="100%" stopColor="rgba(102, 0, 204, 0.15)" />
        </linearGradient>
      </defs>

      {gridLevels.map((level) => {
        const points = axes
          .map((_, index) => {
            const angle = angleFor(index);
            const x = center + radius * level * Math.cos(angle);
            const y = center + radius * level * Math.sin(angle);
            return `${x},${y}`;
          })
          .join(' ');
        return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.12)" />;
      })}

      {axes.map((axis, index) => {
        const angle = angleFor(index);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        return (
          <g key={axis}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />
            <text
              x={center + (radius + 16) * Math.cos(angle)}
              y={center + (radius + 16) * Math.sin(angle)}
              textAnchor="middle"
              alignmentBaseline="middle"
              className="fill-white text-xs font-semibold"
            >
              {axis}
            </text>
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="url(#radarFill)" stroke="rgba(102,0,204,0.7)" strokeWidth={2} />
    </svg>
  );
}
