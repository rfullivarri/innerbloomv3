import { useMemo, type CSSProperties } from 'react';
import { Card } from '../ui/Card';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';
import { useRequest } from '../../hooks/useRequest';
import { getUserXpByTrait, type TraitXpEntry } from '../../lib/api';

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
  const { data, status } = useRequest(() => getUserXpByTrait(userId), [userId]);
  const dataset = useMemo(() => computeRadarDataset(data?.traits ?? []), [data?.traits]);

  return (
    <Card
      title="🧿 Radar Chart"
      subtitle="XP · total acumulado"
      rightSlot={
        <InfoDotTarget id="radar" placement="right" className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
            Rasgos clave
          </span>
        </InfoDotTarget>
      }
    >
      {status === 'loading' && <div className="h-[260px] w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos construir el radar. Probá más tarde.</p>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:p-6">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22)_0%,_rgba(76,29,149,0.18)_42%,_rgba(2,6,23,0.94)_100%)]"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5 opacity-70" aria-hidden />
            <div className="relative flex w-full justify-center px-1 sm:px-2">
              <Radar dataset={dataset} />
            </div>
          </div>
        </div>
      )}
    </Card>
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
  const viewBoxSize = (center + 20) * 2;
  const labelStyle: CSSProperties = {
    fontSize: 'clamp(12px, 3.6vw, 15px)',
    fontWeight: 600,
    letterSpacing: '0.03em',
    paintOrder: 'stroke fill',
    stroke: 'rgba(15,23,42,0.7)',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="h-auto w-full max-w-[420px]"
      role="img"
      aria-label="Radar de XP por rasgo"
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
        const labelPoint = basePointFor(radius + 30, index);
        const normalized = maxValue > 0 ? Math.min(Math.max(axis.xp / maxValue, 0), 1) : 0;
        const valuePoint = pointFor(axis.xp, index);

        return (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={lineEnd.x}
              y2={lineEnd.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              fill="rgba(226,232,240,0.9)"
              textAnchor="middle"
              dominantBaseline="middle"
              style={labelStyle}
            >
              {axis.label}
            </text>
            <circle cx={valuePoint.x} cy={valuePoint.y} r={4 + normalized * 4} fill="rgba(125,211,252,0.65)" />
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="url(#radarFill)" stroke="rgba(129,140,248,0.5)" strokeWidth={2} />
      <circle cx={center} cy={center} r={6} fill="rgba(224,231,255,0.95)" />
    </svg>
  );
}
