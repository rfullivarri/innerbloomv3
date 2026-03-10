import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Card } from '../ui/Card';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';
import { useRequest } from '../../hooks/useRequest';
import { getUserXpByTrait, type TraitXpEntry } from '../../lib/api';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { OFFICIAL_LANDING_CSS_VARIABLES } from '../../content/officialDesignTokens';

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

const TRAIT_FALLBACK_LABELS: Record<(typeof TRAIT_ORDER)[number], string> = {
  core: 'Core',
  bienestar: 'Bienestar',
  autogestion: 'Autogestión',
  intelecto: 'Intelecto',
  psiquis: 'Psiquis',
  salud_fisica: 'Salud física',
};

const TRAIT_SYNONYMS: Record<(typeof TRAIT_ORDER)[number], string[]> = {
  core: ['core', 'corazon', 'core_total'],
  bienestar: ['bienestar', 'bien_estar'],
  autogestion: ['autogestion', 'auto_gestion', 'auto-gestion', 'gestion'],
  intelecto: ['intelecto', 'intelectual'],
  psiquis: ['psiquis', 'psique', 'psiquis_total'],
  salud_fisica: [
    'salud_fisica',
    'saludfisica',
    'salud_fisico',
    'salud-fisica',
    'salud_fisica_total',
    'salud_fisica_foundations',
  ],
};

const XP_NUMBER_FORMATTER = new Intl.NumberFormat('es-AR');

const TRAIT_SYNONYM_LOOKUP = new Map<string, string>();

for (const [canonical, synonyms] of Object.entries(TRAIT_SYNONYMS)) {
  const sanitizedCanonical = sanitizeTraitValue(canonical);

  if (sanitizedCanonical) {
    TRAIT_SYNONYM_LOOKUP.set(sanitizedCanonical, sanitizedCanonical);
  }

  for (const alias of synonyms) {
    const sanitizedAlias = sanitizeTraitValue(alias);

    if (!sanitizedAlias) {
      continue;
    }

    TRAIT_SYNONYM_LOOKUP.set(sanitizedAlias, sanitizedCanonical ?? sanitizedAlias);
  }
}

const PILLAR_ORDER = ['Body', 'Mind', 'Soul'] as const;

type RadarAxis = {
  key: string;
  label: string;
  xp: number;
  pillar?: string | null;
  sortOrder?: number | null;
};

type RadarDataset = {
  axes: RadarAxis[];
  maxValue: number;
};

type PillarMetrics = {
  values: Record<(typeof PILLAR_ORDER)[number], number>;
  percentages: Record<(typeof PILLAR_ORDER)[number], number>;
  total: number;
};

type BalanceStatus = 'balanced' | 'bodyDominant' | 'mindDominant' | 'soulDominant';

function sanitizeTraitValue(value: string | null | undefined): string | null {
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

  return normalized.length > 0 ? normalized : null;
}

function normalizeTraitKey(
  traitValue: string | null | undefined,
  labelValue?: string | null | undefined,
): string | null {
  const candidates = [traitValue, labelValue];

  for (const candidate of candidates) {
    const sanitized = sanitizeTraitValue(candidate);
    if (!sanitized) {
      continue;
    }

    const canonical = TRAIT_SYNONYM_LOOKUP.get(sanitized);
    if (canonical) {
      return canonical;
    }

    return sanitized;
  }

  return null;
}

function normalizeLabel(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.toString().trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePillar(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.toString().trim();
  if (!normalized) return null;

  const normalizedTitle = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  const matchedPillar = PILLAR_ORDER.find(
    (pillar) => pillar.toLowerCase() === normalized.toLowerCase(),
  );

  return matchedPillar ?? normalizedTitle;
}

function normalizeSortOrder(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getPillarOrderIndex(pillar: string | null | undefined): number {
  if (!pillar) return Number.POSITIVE_INFINITY;

  const normalized = normalizePillar(pillar);
  const index = normalized ? PILLAR_ORDER.indexOf(normalized as (typeof PILLAR_ORDER)[number]) : -1;
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function formatTraitLabel(key: string, providedLabel?: string | null): string {
  const normalized = normalizeLabel(providedLabel);
  if (normalized) {
    return normalized;
  }

  if (key in TRAIT_FALLBACK_LABELS) {
    return TRAIT_FALLBACK_LABELS[key as keyof typeof TRAIT_FALLBACK_LABELS];
  }

  return key
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function computeRadarDataset(entries: TraitXpEntry[] = []): RadarDataset {
  const totals = new Map<
    string,
    { xp: number; label?: string | null; pillar?: string | null; sortOrder?: number | null }
  >();

  for (const entry of entries) {
    const key = normalizeTraitKey(entry?.trait, entry?.name);
    if (!key) continue;

    const xp = Number(entry?.xp ?? 0);
    const previous = totals.get(key) ?? { xp: 0, label: null };
    const label = normalizeLabel(entry?.name);

    totals.set(key, {
      xp: previous.xp + (Number.isFinite(xp) ? xp : 0),
      label: previous.label ?? label,
      pillar: previous.pillar ?? normalizePillar(entry?.pillar),
      sortOrder: previous.sortOrder ?? normalizeSortOrder(entry?.sortOrder),
    });
  }

  const axes: RadarAxis[] = Array.from(totals.entries())
    .map(([key, { xp, label, pillar, sortOrder }]) => ({
      key,
      label: formatTraitLabel(key, label ?? undefined),
      xp,
      pillar: pillar ?? null,
      sortOrder: sortOrder ?? null,
    }))
    .sort((a, b) => {
      const pillarIndexA = getPillarOrderIndex(a.pillar);
      const pillarIndexB = getPillarOrderIndex(b.pillar);

      if (pillarIndexA !== pillarIndexB) {
        return pillarIndexA - pillarIndexB;
      }

      const sortOrderA = normalizeSortOrder(a.sortOrder);
      const sortOrderB = normalizeSortOrder(b.sortOrder);

      if (sortOrderA != null || sortOrderB != null) {
        return (sortOrderA ?? Number.POSITIVE_INFINITY) - (sortOrderB ?? Number.POSITIVE_INFINITY);
      }

      return a.label.localeCompare(b.label);
    });

  const values = axes.map((axis) => axis.xp);
  const maxValue = Math.max(10, ...values);
  return { axes, maxValue };
}

function computePillarMetrics(axes: RadarAxis[]): PillarMetrics {
  const values: Record<(typeof PILLAR_ORDER)[number], number> = {
    Body: 0,
    Mind: 0,
    Soul: 0,
  };

  axes.forEach((axis) => {
    const pillar = normalizePillar(axis.pillar) as (typeof PILLAR_ORDER)[number] | null;
    if (!pillar) {
      return;
    }

    values[pillar] += Math.max(0, Number(axis.xp ?? 0));
  });

  const total = values.Body + values.Mind + values.Soul;
  const percentages: Record<(typeof PILLAR_ORDER)[number], number> = {
    Body: total > 0 ? Math.round((values.Body / total) * 100) : 0,
    Mind: total > 0 ? Math.round((values.Mind / total) * 100) : 0,
    Soul: total > 0 ? Math.round((values.Soul / total) * 100) : 0,
  };

  return { values, percentages, total };
}

function computeBalanceStatus(metrics: PillarMetrics): BalanceStatus {
  const points = PILLAR_ORDER.map((pillar) => metrics.percentages[pillar]);
  const max = Math.max(...points);
  const min = Math.min(...points);

  if (max - min <= 15) {
    return 'balanced';
  }

  const dominantPillar = PILLAR_ORDER.reduce((current, pillar) =>
    metrics.percentages[pillar] > metrics.percentages[current] ? pillar : current,
  );

  if (dominantPillar === 'Body') return 'bodyDominant';
  if (dominantPillar === 'Mind') return 'mindDominant';
  return 'soulDominant';
}

export function RadarChartCard({ userId }: RadarChartCardProps) {
  const { t } = usePostLoginLanguage();
  const { data, status } = useRequest(() => getUserXpByTrait(userId), [userId]);
  const dataset = useMemo(() => computeRadarDataset(data?.traits ?? []), [data?.traits]);
  const pillarMetrics = useMemo(() => computePillarMetrics(dataset.axes), [dataset.axes]);
  const balanceStatus = useMemo(() => computeBalanceStatus(pillarMetrics), [pillarMetrics]);
  const hasAxes = dataset.axes.length > 0;

  const balanceStatusLabelByKey: Record<BalanceStatus, string> = {
    balanced: t('dashboard.radar.status.balanced'),
    bodyDominant: t('dashboard.radar.status.bodyDominant'),
    mindDominant: t('dashboard.radar.status.mindDominant'),
    soulDominant: t('dashboard.radar.status.soulDominant'),
  };

  const statusChipToneByKey: Record<BalanceStatus, string> = {
    balanced:
      'border-[color:color-mix(in_srgb,var(--color-border-subtle)_75%,#93c5fd_25%)] bg-[color:color-mix(in_srgb,var(--color-bg-elevated)_74%,#bfdbfe_26%)] text-[color:var(--color-text-strong)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border-subtle)_82%,transparent)] dark:border-[color:color-mix(in_srgb,var(--color-border-subtle)_68%,#bfdbfe_32%)] dark:bg-[color:color-mix(in_srgb,var(--color-overlay-2)_74%,#7dd3fc_26%)] dark:text-[color:color-mix(in_srgb,var(--color-text-strong)_84%,white_16%)] dark:shadow-[0_0_22px_color-mix(in_srgb,#7dd3fc_26%,transparent)]',
    bodyDominant:
      'border-[color:color-mix(in_srgb,var(--color-border-subtle)_62%,#38bdf8_38%)] bg-[color:color-mix(in_srgb,var(--color-bg-elevated)_62%,#bae6fd_38%)] text-[color:color-mix(in_srgb,var(--color-text-strong)_78%,#0c4a6e_22%)] shadow-[0_0_0_1px_color-mix(in_srgb,#7dd3fc_18%,transparent)] dark:border-[color:color-mix(in_srgb,var(--color-border-subtle)_56%,#67e8f9_44%)] dark:bg-[color:color-mix(in_srgb,var(--color-overlay-2)_64%,#22d3ee_36%)] dark:text-white dark:shadow-[0_0_20px_color-mix(in_srgb,#22d3ee_32%,transparent)]',
    mindDominant:
      'border-[color:color-mix(in_srgb,var(--color-border-subtle)_58%,#a78bfa_42%)] bg-[color:color-mix(in_srgb,var(--color-bg-elevated)_60%,#ddd6fe_40%)] text-[color:color-mix(in_srgb,var(--color-text-strong)_78%,#4c1d95_22%)] shadow-[0_0_0_1px_color-mix(in_srgb,#a78bfa_16%,transparent)] dark:border-[color:color-mix(in_srgb,var(--color-border-subtle)_54%,#c4b5fd_46%)] dark:bg-[color:color-mix(in_srgb,var(--color-overlay-2)_66%,#8b5cf6_34%)] dark:text-white dark:shadow-[0_0_20px_color-mix(in_srgb,#8b5cf6_30%,transparent)]',
    soulDominant:
      'border-[color:color-mix(in_srgb,var(--color-border-subtle)_56%,#facc15_44%)] bg-[color:color-mix(in_srgb,var(--color-bg-elevated)_58%,#fef3c7_42%)] text-[color:color-mix(in_srgb,var(--color-text-strong)_78%,#78350f_22%)] shadow-[0_0_0_1px_color-mix(in_srgb,#fcd34d_16%,transparent)] dark:border-[color:color-mix(in_srgb,var(--color-border-subtle)_52%,#fbbf24_48%)] dark:bg-[color:color-mix(in_srgb,var(--color-overlay-2)_66%,#f59e0b_34%)] dark:text-[color:color-mix(in_srgb,white_86%,#fef3c7_14%)] dark:shadow-[0_0_20px_color-mix(in_srgb,#f59e0b_30%,transparent)]',
  };

  return (
    <Card
      title={t('dashboard.radar.title')}
      subtitle={t('dashboard.radar.subtitle')}
      rightSlot={
        <InfoDotTarget id="radar" placement="right" className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.01em] transition-colors ${statusChipToneByKey[balanceStatus]}`}
          >
            {balanceStatusLabelByKey[balanceStatus]}
          </span>
        </InfoDotTarget>
      }
    >
      {status === 'loading' && <div className="h-[260px] w-full animate-pulse rounded-ib-md bg-[color:var(--color-overlay-2)]" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">{t('dashboard.radar.loadError')}</p>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-[520px] p-4 sm:p-6">
            <div className="flex w-full justify-center px-1 sm:px-2">
              {hasAxes ? (
                <Radar
                  dataset={dataset}
                  pillarPercentages={pillarMetrics.percentages}
                  pillarLabels={{
                    Body: t('dashboard.radar.pillars.body'),
                    Mind: t('dashboard.radar.pillars.mind'),
                    Soul: t('dashboard.radar.pillars.soul'),
                  }}
                />
              ) : (
                <div className="flex h-[260px] w-full max-w-[420px] items-center justify-center text-center text-sm text-[color:var(--color-text-muted)]">
                  <p className="px-6 leading-relaxed">
                    {t('dashboard.radar.empty')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

interface RadarProps {
  dataset: RadarDataset;
  pillarPercentages: Record<(typeof PILLAR_ORDER)[number], number>;
  pillarLabels: Record<(typeof PILLAR_ORDER)[number], string>;
}

function Radar({ dataset, pillarPercentages, pillarLabels }: RadarProps) {
  const radius = 130;
  const outerPadding = 82;
  const center = radius + outerPadding;
  const { axes, maxValue } = dataset;
  const count = axes.length;
  const ringRadius = radius + 8;
  const pillarLabelRadius = ringRadius + 8;
  const traitLabelRadius = ringRadius + 24;
  const ringThickness = 4.8;
  const uniqueId = useId().replace(/:/g, '_');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [openPillars, setOpenPillars] = useState<Array<(typeof PILLAR_ORDER)[number]>>([]);
  const [hoveredPillar, setHoveredPillar] = useState<(typeof PILLAR_ORDER)[number] | null>(null);
  const [pressedPillar, setPressedPillar] = useState<(typeof PILLAR_ORDER)[number] | null>(null);

  if (count === 0) {
    return null;
  }

  const angleFor = (index: number) => -Math.PI / 2 + (index * (2 * Math.PI)) / count;
  const angleStep = (2 * Math.PI) / count;

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
  const viewBoxSize = center * 2;
  const PILLAR_COLORS: Record<(typeof PILLAR_ORDER)[number], string> = {
    Body: '#5DD4FF',
    Mind: '#A78BFA',
    Soul: '#F6D365',
  };
  const hasOpenPillars = openPillars.length > 0;
  const hasHoverOrPress = hoveredPillar !== null || pressedPillar !== null;

  const pillarRanges = PILLAR_ORDER
    .map((pillar) => {
      let startIndex = -1;
      let endIndex = -1;

      for (let index = 0; index < axes.length; index += 1) {
        if (normalizePillar(axes[index].pillar) !== pillar) {
          continue;
        }

        if (startIndex === -1) {
          startIndex = index;
        }

        endIndex = index;
      }

      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      return {
        pillar,
        color: PILLAR_COLORS[pillar],
        startAngle: angleFor(startIndex) - angleStep / 2,
        endAngle: angleFor(endIndex) + angleStep / 2,
      };
    })
    .filter(Boolean) as Array<{
    pillar: (typeof PILLAR_ORDER)[number];
    color: string;
    startAngle: number;
    endAngle: number;
  }>;

  const pointAtAngle = (distance: number, angle: number) => ({
    x: center + distance * Math.cos(angle),
    y: center + distance * Math.sin(angle),
  });

  const arcPath = (distance: number, startAngle: number, endAngle: number) => {
    const start = pointAtAngle(distance, startAngle);
    const end = pointAtAngle(distance, endAngle);
    const delta = endAngle - startAngle;
    const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    const sweep = delta >= 0 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${distance} ${distance} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };

  const sectorPath = (distance: number, startAngle: number, endAngle: number) => {
    const start = pointAtAngle(distance, startAngle);
    const end = pointAtAngle(distance, endAngle);
    const delta = endAngle - startAngle;
    const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;

    return `M ${center} ${center} L ${start.x} ${start.y} A ${distance} ${distance} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };
  const togglePillar = (pillar: (typeof PILLAR_ORDER)[number]) => {
    setOpenPillars((current) =>
      current.includes(pillar) ? current.filter((item) => item !== pillar) : [...current, pillar],
    );
  };

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!svgRef.current) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!svgRef.current.contains(target)) {
        setOpenPillars([]);
        setHoveredPillar(null);
        setPressedPillar(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, []);

  const labelStyle: CSSProperties = {
    fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
    fontSize: 'clamp(11px, 3.2vw, 14px)',
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="h-auto w-full max-w-[420px] overflow-visible"
      role="img"
      aria-label="Radar de GP por rasgo"
    >
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(126,58,242,0.9)" />
          <stop offset="70%" stopColor="rgba(59,130,246,0.4)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0.15)" />
        </radialGradient>
        {pillarRanges.map((range) => (
          <radialGradient
            key={`${range.pillar}-sector-gradient`}
            id={`${uniqueId}-${range.pillar.toLowerCase()}-sector-gradient`}
            cx="50%"
            cy="50%"
            r="80%"
          >
            <stop offset="0%" stopColor={range.color} stopOpacity={0.1} />
            <stop offset="100%" stopColor={range.color} stopOpacity={0.04} />
          </radialGradient>
        ))}
        {pillarRanges.map((range) => (
          <radialGradient
            key={`${range.pillar}-hover-gradient`}
            id={`${uniqueId}-${range.pillar.toLowerCase()}-hover-gradient`}
            cx="50%"
            cy="50%"
            r="92%"
          >
            <stop offset="0%" stopColor={range.color} stopOpacity={0.24} />
            <stop offset="100%" stopColor={range.color} stopOpacity={0.02} />
          </radialGradient>
        ))}
        {pillarRanges.map((range) => {
          const midAngle = (range.startAngle + range.endAngle) / 2;
          const reverseForBottomHalf = Math.sin(midAngle) > 0;
          const textPathId = `${uniqueId}-${range.pillar.toLowerCase()}-label-path`;
          const labelRadius = range.pillar === 'Mind' ? pillarLabelRadius + 5 : pillarLabelRadius;

          return (
            <path
              key={textPathId}
              id={textPathId}
              d={arcPath(
                labelRadius,
                reverseForBottomHalf ? range.endAngle : range.startAngle,
                reverseForBottomHalf ? range.startAngle : range.endAngle,
              )}
              fill="none"
            />
          );
        })}
      </defs>

      <circle
        cx={center}
        cy={center}
        r={radius + 16}
        fill="url(#radarGlow)"
        className="opacity-[0.08] dark:opacity-[0.14]"
      />

      {pillarRanges.map((range) => (
        <path
          key={`${range.pillar}-sector`}
          d={sectorPath(radius, range.startAngle, range.endAngle)}
          fill={`url(#${uniqueId}-${range.pillar.toLowerCase()}-sector-gradient)`}
          opacity={hasOpenPillars && !openPillars.includes(range.pillar) ? 0.42 : 1}
          style={{ transition: 'opacity 160ms ease' }}
        />
      ))}

      {pillarRanges.map((range) => {
        const isCandidate = hoveredPillar === range.pillar || pressedPillar === range.pillar;
        return (
          <path
            key={`${range.pillar}-hover-overlay`}
            d={sectorPath(radius, range.startAngle, range.endAngle)}
            fill={`url(#${uniqueId}-${range.pillar.toLowerCase()}-hover-gradient)`}
            opacity={isCandidate ? 0.95 : 0}
            style={{ transition: 'opacity 150ms ease' }}
            pointerEvents="none"
          />
        );
      })}

      {gridLevels.map((level) => {
        const points = axes
          .map((_, index) => {
            const { x, y } = basePointFor(radius * level, index);
            return `${x},${y}`;
          })
          .join(' ');
        return <polygon key={level} points={points} fill="none" className="stroke-[color-mix(in_srgb,var(--color-text-strong)_8%,transparent)] dark:stroke-[color-mix(in_srgb,var(--color-border-subtle)_78%,white_8%)]" strokeWidth={1.1} />;
      })}

      {axes.map((axis, index) => {
        const lineEnd = basePointFor(radius, index);
        const normalized = maxValue > 0 ? Math.min(Math.max(axis.xp / maxValue, 0), 1) : 0;
        const valueDistance = normalized * radius;
        const xpLabelOffset = normalized > 0 ? 24 : 36;
        const xpLabelPoint = basePointFor(Math.min(radius + 48, valueDistance + xpLabelOffset), index);
        const xpLabel = XP_NUMBER_FORMATTER.format(Math.round(axis.xp ?? 0));
        const axisPillar = normalizePillar(axis.pillar) as (typeof PILLAR_ORDER)[number] | null;
        const isOpen = axisPillar ? openPillars.includes(axisPillar) : false;

        return (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={lineEnd.x}
              y2={lineEnd.y}
              className="stroke-[color-mix(in_srgb,var(--color-text-strong)_8%,transparent)] dark:stroke-[color-mix(in_srgb,var(--color-border-subtle)_78%,white_8%)]"
              strokeWidth={1.1}
              opacity={hasOpenPillars && !isOpen ? 0.35 : 1}
              style={{ transition: 'opacity 160ms ease' }}
            />
            <text
              x={xpLabelPoint.x}
              y={xpLabelPoint.y}
              fill={isOpen ? 'color-mix(in_srgb,var(--color-text-strong)_90%,white_10%)' : 'var(--color-text-subtle)'}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
                fontSize: 'clamp(12px, 3.4vw, 16px)',
                fontWeight: 600,
                letterSpacing: '0.01em',
                lineHeight: 1.2,
              }}
              opacity={hasOpenPillars && !isOpen ? 0.45 : 1}
              filter={isOpen ? 'drop-shadow(0 0 6px rgba(255,255,255,0.25))' : undefined}
            >
              {xpLabel}
            </text>
          </g>
        );
      })}

      <polygon
        points={polygonPoints}
        className="fill-[rgba(99,102,241,0.22)] stroke-[rgba(99,102,241,0.82)] dark:fill-[rgba(248,250,252,0.18)] dark:stroke-[rgba(248,250,252,0.82)]"
        strokeWidth={2.5}
      />

      {pillarRanges.map((range) => {
        const isOpen = openPillars.includes(range.pillar);
        const isCandidate = hoveredPillar === range.pillar || pressedPillar === range.pillar;

        return (
          <g key={`${range.pillar}-interaction`}>
            <path
              d={sectorPath(radius + 18, range.startAngle, range.endAngle)}
              fill="transparent"
              className="cursor-pointer"
              onPointerEnter={() => setHoveredPillar(range.pillar)}
              onPointerLeave={() => {
                setHoveredPillar((current) => (current === range.pillar ? null : current));
                setPressedPillar((current) => (current === range.pillar ? null : current));
              }}
              onPointerDown={() => setPressedPillar(range.pillar)}
              onPointerUp={() => setPressedPillar((current) => (current === range.pillar ? null : current))}
              onClick={() => togglePillar(range.pillar)}
            />
            <path
              d={arcPath(ringRadius, range.startAngle, range.endAngle)}
              fill="none"
              stroke={hasOpenPillars && !isOpen ? 'var(--color-text-muted)' : range.color}
              strokeOpacity={hasOpenPillars ? (isOpen ? 1 : 0.33) : 0.86}
              strokeWidth={isOpen || isCandidate ? ringThickness + 0.7 : ringThickness}
              strokeLinecap="round"
              pointerEvents="none"
              style={{
                transition: 'stroke-opacity 180ms ease, filter 180ms ease, stroke-width 180ms ease',
                filter: isOpen
                  ? `drop-shadow(0 0 8px ${range.color}cc) drop-shadow(0 0 16px ${range.color}99)`
                  : isCandidate
                    ? `drop-shadow(0 0 8px ${range.color}88)`
                    : hasOpenPillars
                      ? 'saturate(0.2)'
                      : `drop-shadow(0 0 4px ${range.color}66)`,
              }}
            />
          </g>
        );
      })}

      {pillarRanges.map((range) => (
        <text
          key={`${range.pillar}-label`}
          fill={hasOpenPillars && !openPillars.includes(range.pillar) ? 'var(--color-text-muted)' : '#eef2ff'}
          fillOpacity={hasOpenPillars ? (openPillars.includes(range.pillar) ? 0.99 : 0.56) : 0.96}
          className="pointer-events-none"
          style={{
            fontFamily: OFFICIAL_LANDING_CSS_VARIABLES['--font-heading'],
            fontSize: 'clamp(12px, 3.4vw, 16px)',
            letterSpacing: '0.24em',
            fontWeight: 600,
            textTransform: 'uppercase',
            transition: 'fill-opacity 180ms ease, filter 180ms ease',
            filter: openPillars.includes(range.pillar)
              ? `drop-shadow(0 0 9px rgba(255,255,255,0.46)) drop-shadow(0 0 12px ${range.color}66)`
              : hasHoverOrPress && (hoveredPillar === range.pillar || pressedPillar === range.pillar)
                ? `drop-shadow(0 0 7px rgba(255,255,255,0.3))`
                : 'drop-shadow(0 0 4px rgba(255,255,255,0.16))',
          }}
        >
          <textPath
            href={`#${uniqueId}-${range.pillar.toLowerCase()}-label-path`}
            startOffset="50%"
            textAnchor="middle"
          >
            {`${pillarLabels[range.pillar]} ${pillarPercentages[range.pillar]}%`.toUpperCase()}
          </textPath>
        </text>
      ))}

      {axes.map((axis, index) => {
        const angle = angleFor(index);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const labelPoint = basePointFor(traitLabelRadius, index);
        const axisPillar = normalizePillar(axis.pillar) as (typeof PILLAR_ORDER)[number] | null;
        const isVisible = axisPillar ? openPillars.includes(axisPillar) : false;

        const axisLabelAnchor: 'start' | 'middle' | 'end' =
          cos > 0.34 ? 'start' : cos < -0.34 ? 'end' : 'middle';
        const axisLabelDx = cos > 0.34 ? 4 : cos < -0.34 ? -4 : 0;
        const axisLabelDy = sin > 0.56 ? 4 : sin < -0.56 ? -4 : 0;

        return (
          <text
            key={`${axis.key}-label`}
            x={labelPoint.x}
            y={labelPoint.y}
            fill="var(--color-text-strong)"
            textAnchor={axisLabelAnchor}
            dominantBaseline="middle"
            dx={axisLabelDx}
            dy={axisLabelDy}
            style={{
              ...labelStyle,
              paintOrder: 'stroke',
              stroke: 'var(--color-bg-elevated)',
              strokeWidth: 2.4,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
            opacity={isVisible ? 1 : 0}
          >
            {axis.label}
          </text>
        );
      })}

      <circle cx={center} cy={center} r={6} fill="rgba(224,231,255,0.95)" />
    </svg>
  );
}
