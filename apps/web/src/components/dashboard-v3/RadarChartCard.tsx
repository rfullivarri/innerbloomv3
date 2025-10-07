import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserXpByTrait, type TraitXpEntry } from '../../lib/api';
import { dateStr } from '../../lib/safe';

interface RadarChartCardProps {
  userId: string;
}

const TRAIT_ORDER = [
  'core',
  'bienestar',
  'autogestion',
  'intelecto',
  'psiquis',
  'salud_fisica',
] as const;

type TraitKey = (typeof TRAIT_ORDER)[number];

const TRAIT_LABELS: Record<TraitKey, string> = {
  core: 'Core',
  bienestar: 'Bienestar',
  autogestion: 'Autogestión',
  intelecto: 'Intelecto',
  psiquis: 'Psiquis',
  salud_fisica: 'Salud física',
};

type RadarAxis = {
  key: TraitKey;
  label: string;
  xp: number;
};

type RadarDataset = {
  axes: RadarAxis[];
  maxValue: number;
};

function buildRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack + 1);
  return { from: dateStr(from), to: dateStr(to) };
}

function normalizeTraitKey(value: string | null | undefined): TraitKey | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return TRAIT_ORDER.find((trait) => trait === normalized) ?? null;
}

function computeRadarDataset(entries: TraitXpEntry[] = []): RadarDataset {
  const totals: Record<TraitKey, number> = {
    core: 0,
    bienestar: 0,
    autogestion: 0,
    intelecto: 0,
    psiquis: 0,
    salud_fisica: 0,
  };

  for (const entry of entries) {
    const key = normalizeTraitKey(entry?.trait);
    if (!key) continue;

    const xp = Number(entry?.xp ?? 0);
    totals[key] = (totals[key] ?? 0) + (Number.isFinite(xp) ? xp : 0);
  }

  const axes: RadarAxis[] = TRAIT_ORDER.map((key) => ({
    key,
    label: TRAIT_LABELS[key],
    xp: totals[key] ?? 0,
  }));

  const values = axes.map((axis) => axis.xp);
  const maxValue = Math.max(10, ...values);
  return { axes, maxValue };
}

export function RadarChartCard({ userId }: RadarChartCardProps) {
  const range = useMemo(() => buildRange(60), []);
  const { data, status } = useRequest(() => getUserXpByTrait(userId, range), [userId, range.from, range.to]);
  const dataset = useMemo(() => computeRadarDataset(data?.traits ?? []), [data?.traits]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1120]/80 p-6 text-sm text-white backdrop-blur">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(76,29,149,0.55)_0%,_rgba(15,23,42,0.92)_60%,_rgba(3,7,18,0.95)_100%)]" />
      <div className="relative z-10">
        <header className="flex flex-wrap items-center justify-between gap-3 text-white">
          <h3 className="text-lg font-semibold">🧿 Radar Chart</h3>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            XP · últimos 60 días
          </span>
        </header>

        {status === 'loading' && <div className="mt-6 h-72 w-full animate-pulse rounded-2xl bg-white/10" />}

        {status === 'error' && (
          <p className="mt-6 text-sm text-rose-300">No pudimos construir el radar. Probá más tarde.</p>
        )}

        {status === 'success' && (
          <div className="mt-6 flex flex-col items-center gap-5">
            <Radar dataset={dataset} />
            <p className="max-w-xs text-center text-xs text-white/60">
              Distribución de XP por rasgo en los últimos 60 días. Valores tomados directamente desde los logs recientes.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface RadarProps {
  dataset: RadarDataset;
}

function Radar({ dataset }: RadarProps) {
  const radius = 130;
  const center = radius + 32;
  const { axes, maxValue } = dataset;
  const count = axes.length;

  const angleFor = (index: number) => -Math.PI / 2 + (index * (2 * Math.PI)) / count;

  const pointFor = (value: number, index: number, distance = radius) => {
    const normalized = maxValue > 0 ? Math.min(Math.max(value / maxValue, 0), 1) : 0;
    const r = distance * normalized;
    const angle = angleFor(index);
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const basePointFor = (distance: number, index: number) => {
    const angle = angleFor(index);
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = axes
    .map((axis, index) => {
      const { x, y } = pointFor(axis.xp, index);
      return `${x},${y}`;
    })
    .join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={(center + 20) * 2}
      height={(center + 20) * 2}
      viewBox={`0 0 ${(center + 20) * 2} ${(center + 20) * 2}`}
      className="max-w-full drop-shadow-[0_0_30px_rgba(59,130,246,0.15)]"
    >
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(126,58,242,0.9)" />
          <stop offset="70%" stopColor="rgba(59,130,246,0.4)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0.15)" />
        </radialGradient>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.55)" />
          <stop offset="100%" stopColor="rgba(79,70,229,0.2)" />
        </linearGradient>
      </defs>

      <circle cx={center} cy={center} r={radius + 24} fill="url(#radarGlow)" opacity={0.12} />

      {gridLevels.map((level) => {
        const points = axes
          .map((_, index) => {
            const { x, y } = basePointFor(radius * level, index);
            return `${x},${y}`;
          })
          .join(' ');
        return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />;
      })}

      {axes.map((axis, index) => {
        const lineEnd = basePointFor(radius, index);
        const labelPoint = basePointFor(radius + 36, index);
        const normalized = maxValue > 0 ? Math.min(Math.max(axis.xp / maxValue, 0), 1) : 0;
        const valuePoint = pointFor(axis.xp, index);
        const valueLabelPoint = basePointFor(Math.max(radius * normalized + 20, radius * 0.35), index);

        const anchor = Math.abs(labelPoint.x - center) < 10 ? 'middle' : labelPoint.x > center ? 'start' : 'end';
        const valueAnchor = Math.abs(valueLabelPoint.x - center) < 10 ? 'middle' : valueLabelPoint.x > center ? 'start' : 'end';

        return (
          <g key={axis.key}>
            <line x1={center} y1={center} x2={lineEnd.x} y2={lineEnd.y} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={anchor}
              alignmentBaseline="middle"
              className="fill-white text-xs font-semibold uppercase tracking-widest"
            >
              {axis.label}
            </text>
            <text
              x={valueLabelPoint.x}
              y={valueLabelPoint.y}
              textAnchor={valueAnchor}
              alignmentBaseline="middle"
              className="fill-white text-sm font-semibold"
            >
              {axis.xp.toLocaleString('es-AR')}
            </text>
            <circle cx={valuePoint.x} cy={valuePoint.y} r={5} fill="rgba(129,140,248,0.9)" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="url(#radarFill)" stroke="rgba(129,140,248,0.85)" strokeWidth={2.5} />
    </svg>
  );
}
