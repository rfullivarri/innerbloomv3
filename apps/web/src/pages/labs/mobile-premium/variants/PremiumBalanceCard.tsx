import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useRequest } from '../../../../hooks/useRequest';
import { getUserXpByTrait, type TraitXpEntry } from '../../../../lib/api';

const PILLAR_ORDER = ['Body', 'Mind', 'Soul'] as const;
type Pillar = (typeof PILLAR_ORDER)[number];

type RadarAxis = {
  key: string;
  label: string;
  xp: number;
  pillar: Pillar;
  sortOrder: number;
};

type RadarDataset = {
  axes: RadarAxis[];
  maxValue: number;
};

type PillarMetric = {
  pillar: Pillar;
  label: string;
  xp: number;
  percent: number;
};

type BalanceReading = {
  label: string;
  dominant: PillarMetric;
  isBalanced: boolean;
};

const PILLAR_META: Record<Pillar, { color: string; label: string }> = {
  Body: { color: 'var(--mp-body)', label: 'Cuerpo' },
  Mind: { color: '#a78bfa', label: 'Mente' },
  Soul: { color: '#f5c56b', label: 'Alma' },
};

const DEMO_TRAITS: TraitXpEntry[] = [
  { trait: 'sleep', name: 'Recuperación', xp: 517, pillar: 'Body', sortOrder: 1 },
  { trait: 'movement', name: 'Movilidad', xp: 437, pillar: 'Body', sortOrder: 2 },
  { trait: 'nutrition', name: 'Nutrición', xp: 375, pillar: 'Body', sortOrder: 3 },
  { trait: 'focus', name: 'Enfoque', xp: 312, pillar: 'Mind', sortOrder: 4 },
  { trait: 'learning', name: 'Aprendizaje', xp: 397, pillar: 'Mind', sortOrder: 5 },
  { trait: 'meditation', name: 'Respiración', xp: 430, pillar: 'Soul', sortOrder: 6 },
  { trait: 'purpose', name: 'Propósito', xp: 223, pillar: 'Soul', sortOrder: 7 },
  { trait: 'connection', name: 'Vínculos', xp: 245, pillar: 'Soul', sortOrder: 8 },
  { trait: 'reflection', name: 'Reflexión', xp: 246, pillar: 'Mind', sortOrder: 9 },
  { trait: 'play', name: 'Juego', xp: 208, pillar: 'Soul', sortOrder: 10 },
  { trait: 'planning', name: 'Planificación', xp: 147, pillar: 'Mind', sortOrder: 11 },
  { trait: 'discipline', name: 'Disciplina', xp: 428, pillar: 'Body', sortOrder: 12 },
];

function normalizePillar(value: string | null | undefined): Pillar | null {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'body':
    case 'cuerpo':
      return 'Body';
    case 'mind':
    case 'mente':
      return 'Mind';
    case 'soul':
    case 'alma':
      return 'Soul';
    default:
      return null;
  }
}

function computeRadarDataset(entries: TraitXpEntry[]): RadarDataset {
  const totals = new Map<string, RadarAxis>();

  entries.forEach((entry, index) => {
    const pillar = normalizePillar(entry.pillar);
    if (!pillar) return;

    const key = entry.trait || entry.name || `trait-${index}`;
    const previous = totals.get(key);
    totals.set(key, {
      key,
      label: entry.name || entry.trait,
      xp: (previous?.xp ?? 0) + Math.max(0, Number(entry.xp) || 0),
      pillar,
      sortOrder: previous?.sortOrder ?? entry.sortOrder ?? index,
    });
  });

  const axes = [...totals.values()].sort((first, second) => {
    const pillarOrder = PILLAR_ORDER.indexOf(first.pillar) - PILLAR_ORDER.indexOf(second.pillar);
    return pillarOrder || first.sortOrder - second.sortOrder;
  });

  return { axes, maxValue: Math.max(10, ...axes.map((axis) => axis.xp)) };
}

function computePillarMetrics(dataset: RadarDataset): PillarMetric[] {
  const totals = PILLAR_ORDER.map((pillar) => ({
    pillar,
    xp: dataset.axes.filter((axis) => axis.pillar === pillar).reduce((sum, axis) => sum + axis.xp, 0),
  }));
  const total = totals.reduce((sum, metric) => sum + metric.xp, 0);

  return totals.map(({ pillar, xp }) => ({
    pillar,
    label: PILLAR_META[pillar].label,
    xp,
    percent: total ? Math.round((xp / total) * 100) : 0,
  }));
}

function resolveBalanceReading(metrics: PillarMetric[]): BalanceReading {
  const ordered = [...metrics].sort((first, second) => second.percent - first.percent);
  const dominant = ordered[0];
  const spread = dominant.percent - ordered[ordered.length - 1].percent;
  const isBalanced = spread <= 15;
  return {
    dominant,
    isBalanced,
    label: isBalanced ? 'En balance' : `Predominio ${dominant.label}`,
  };
}

export function PremiumBalanceCard({
  backendUserId,
  localTraits,
}: {
  backendUserId: string | null;
  localTraits?: TraitXpEntry[] | null;
}) {
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const traitRequest = useRequest(() => getUserXpByTrait(backendUserId ?? ''), [backendUserId], {
    enabled: Boolean(backendUserId),
  });
  const traits = localTraits ?? (backendUserId ? traitRequest.data?.traits ?? [] : DEMO_TRAITS);
  const dataset = useMemo(() => computeRadarDataset(traits), [traits]);
  const metrics = useMemo(() => computePillarMetrics(dataset), [dataset]);
  const reading = useMemo(() => resolveBalanceReading(metrics), [metrics]);
  const isLoading = Boolean(backendUserId) && traitRequest.status === 'loading';

  return (
    <section className="overflow-hidden px-0 pb-4 pt-1">
      <div className="text-center">
        {dataset.axes.length ? (
            <p className="mx-auto max-w-[18rem] text-[1.08rem] font-medium leading-7 text-[color:var(--mp-text)]">
              <span style={{ color: PILLAR_META[reading.dominant.pillar].color }}>{reading.dominant.label}</span>{' '}
              concentra el {reading.dominant.percent}% del GP
            </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex h-[21rem] items-center justify-center text-sm text-[color:var(--mp-text-secondary)]">
          Cargando balance...
        </div>
      ) : dataset.axes.length ? (
        <>
          <PremiumRadar dataset={dataset} metrics={metrics} onSelectionChange={setSelectedPillar} />
          <p className="mt-1 text-center text-xs text-[color:var(--mp-text-muted)]">
            {selectedPillar ? `${PILLAR_META[selectedPillar].label} · rasgos visibles` : 'Tocá un arco para ver sus rasgos'}
          </p>
        </>
      ) : (
        <div className="flex h-[21rem] items-center justify-center text-sm text-[color:var(--mp-text-secondary)]">
          Aún no hay GP para mostrar.
        </div>
      )}
    </section>
  );
}

function PremiumRadar({
  dataset,
  metrics,
  onSelectionChange,
}: {
  dataset: RadarDataset;
  metrics: PillarMetric[];
  onSelectionChange: (pillar: Pillar | null) => void;
}) {
  const uniqueId = useId().replace(/:/g, '_');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const radius = 106;
  const outerPadding = 96;
  const center = radius + outerPadding;
  const ringRadius = radius + 7;
  const count = dataset.axes.length;
  const step = (Math.PI * 2) / count;

  useEffect(() => onSelectionChange(selectedPillar), [onSelectionChange, selectedPillar]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (svgRef.current && event.target instanceof Node && !svgRef.current.contains(event.target)) {
        setSelectedPillar(null);
      }
    }

    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  const angleFor = (index: number) => -Math.PI / 2 + index * step;
  const pointAt = (distance: number, angle: number) => ({
    x: center + distance * Math.cos(angle),
    y: center + distance * Math.sin(angle),
  });
  const axisPoint = (index: number, distance: number) => pointAt(distance, angleFor(index));
  const arcPath = (distance: number, start: number, end: number) => {
    const first = pointAt(distance, start);
    const last = pointAt(distance, end);
    return `M ${first.x} ${first.y} A ${distance} ${distance} 0 ${end - start > Math.PI ? 1 : 0} 1 ${last.x} ${last.y}`;
  };
  const sectorPath = (distance: number, start: number, end: number) => {
    const first = pointAt(distance, start);
    const last = pointAt(distance, end);
    return `M ${center} ${center} L ${first.x} ${first.y} A ${distance} ${distance} 0 ${end - start > Math.PI ? 1 : 0} 1 ${last.x} ${last.y} Z`;
  };
  const ranges = PILLAR_ORDER.map((pillar) => {
    const indexes = dataset.axes.flatMap((axis, index) => axis.pillar === pillar ? [index] : []);
    return {
      pillar,
      start: angleFor(indexes[0]) - step / 2,
      end: angleFor(indexes[indexes.length - 1]) + step / 2,
    };
  }).filter((range) => Number.isFinite(range.start));
  const polygon = dataset.axes.map((axis, index) => {
    const point = axisPoint(index, radius * Math.min(axis.xp / dataset.maxValue, 1));
    return `${point.x},${point.y}`;
  }).join(' ');

  function togglePillar(pillar: Pillar) {
    setSelectedPillar((current) => current === pillar ? null : pillar);
  }

  return (
    <svg
      aria-label="Distribución de GP por rasgo"
      className="mx-auto mt-4 h-auto w-full max-w-[23rem] overflow-visible"
      ref={svgRef}
      role="img"
      viewBox={`0 0 ${center * 2} ${center * 2}`}
    >
      <defs>
        <linearGradient id={`${uniqueId}-shape`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(85,214,239,0.28)" />
          <stop offset="55%" stopColor="rgba(167,139,250,0.3)" />
          <stop offset="100%" stopColor="rgba(245,197,107,0.18)" />
        </linearGradient>
        <radialGradient id={`${uniqueId}-glow`}>
          <stop offset="0%" stopColor="rgba(167,139,250,0.16)" />
          <stop offset="100%" stopColor="rgba(167,139,250,0)" />
        </radialGradient>
        {ranges.map(({ pillar, start, end }) => (
          <path d={arcPath(ringRadius + 17, start, end)} fill="none" id={`${uniqueId}-${pillar}`} key={`${pillar}-label-path`} />
        ))}
      </defs>

      <circle cx={center} cy={center} fill={`url(#${uniqueId}-glow)`} r={radius + 27} />
      {ranges.map(({ pillar, start, end }) => (
        <path
          d={sectorPath(radius, start, end)}
          fill={PILLAR_META[pillar].color}
          fillOpacity={selectedPillar === pillar ? 0.17 : selectedPillar ? 0.025 : 0.06}
          key={`${pillar}-sector`}
        />
      ))}
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          fill="none"
          key={`grid-${level}`}
          points={dataset.axes.map((_, index) => {
            const point = axisPoint(index, radius * level);
            return `${point.x},${point.y}`;
          }).join(' ')}
          stroke="var(--mp-chart-grid)"
          strokeWidth="1"
        />
      ))}
      {dataset.axes.map((axis, index) => {
        const end = axisPoint(index, radius);
        const value = axisPoint(index, radius * Math.min(axis.xp / dataset.maxValue, 1));
        const label = axisPoint(index, Math.min(radius + 10, radius * (axis.xp / dataset.maxValue) + 17));
        const open = selectedPillar === axis.pillar;
        const dimmed = selectedPillar !== null && !open;
        return (
          <g key={axis.key} opacity={dimmed ? 0.42 : 1}>
            <line stroke="var(--mp-chart-grid)" x1={center} x2={end.x} y1={center} y2={end.y} />
            <circle cx={value.x} cy={value.y} fill="var(--mp-chart-point)" r={open ? '2.8' : '2.3'} />
            <text fill="var(--mp-chart-label)" fontSize="9.5" fontWeight={open ? 700 : 500} textAnchor="middle" x={label.x} y={label.y + 3}>
              {axis.xp}
            </text>
          </g>
        );
      })}
      <polygon fill={`url(#${uniqueId}-shape)`} points={polygon} stroke="rgba(167,139,250,0.9)" strokeLinejoin="round" strokeWidth="2.5" />
      {ranges.map(({ pillar, start, end }) => {
        const isOpen = selectedPillar === pillar;
        const percent = metrics.find((metric) => metric.pillar === pillar)?.percent ?? 0;
        return (
          <g key={`${pillar}-interaction`}>
            <path
              aria-label={`Ver rasgos de ${PILLAR_META[pillar].label}`}
              d={sectorPath(ringRadius + 29, start, end)}
              fill="transparent"
              onClick={() => togglePillar(pillar)}
              onFocus={() => setSelectedPillar(pillar)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  togglePillar(pillar);
                }
              }}
              className="focus:outline-none"
              role="button"
              style={{ cursor: 'pointer', outline: 'none' }}
              tabIndex={0}
            />
            <path
              d={arcPath(ringRadius, start, end)}
              fill="none"
              stroke={PILLAR_META[pillar].color}
              strokeLinecap="round"
              strokeOpacity={selectedPillar && !isOpen ? 0.3 : 1}
              strokeWidth={isOpen ? 6.5 : 5}
              style={{ filter: isOpen ? `drop-shadow(0 0 9px ${PILLAR_META[pillar].color})` : undefined }}
            />
            <text fill="var(--mp-chart-label)" fillOpacity={selectedPillar && !isOpen ? 0.42 : 1} fontSize="10" fontWeight={isOpen ? 700 : 600} letterSpacing="1.7">
              <textPath href={`#${uniqueId}-${pillar}`} startOffset="50%" textAnchor="middle">
                {PILLAR_META[pillar].label.toUpperCase()} {percent}%
              </textPath>
            </text>
          </g>
        );
      })}
      {dataset.axes.map((axis, index) => {
        if (selectedPillar !== axis.pillar) return null;
        const point = axisPoint(index, ringRadius + 37);
        return (
          <text fill="var(--mp-chart-label)" fontSize="9" fontWeight="600" key={`${axis.key}-trait`} textAnchor="middle" x={point.x} y={point.y + 3}>
            {axis.label}
          </text>
        );
      })}
      <circle cx={center} cy={center} fill="var(--mp-chart-point)" r="4" />
    </svg>
  );
}
