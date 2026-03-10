import { useId, useMemo, useState, type CSSProperties } from 'react';
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

type PillarStats = {
  percentages: Record<(typeof PILLAR_ORDER)[number], number>;
  dominantPillar: (typeof PILLAR_ORDER)[number] | null;
  isBalanced: boolean;
};

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

export function RadarChartCard({ userId }: RadarChartCardProps) {
  const { t } = usePostLoginLanguage();
  const { data, status } = useRequest(() => getUserXpByTrait(userId), [userId]);
  const dataset = useMemo(() => computeRadarDataset(data?.traits ?? []), [data?.traits]);
  const pillarStats = useMemo(() => computePillarStats(dataset.axes), [dataset.axes]);
  const hasAxes = dataset.axes.length > 0;

  const dominantStatusKey: Record<(typeof PILLAR_ORDER)[number], 'dashboard.radar.balanceStatus.dominant.body' | 'dashboard.radar.balanceStatus.dominant.mind' | 'dashboard.radar.balanceStatus.dominant.soul'> = {
    Body: 'dashboard.radar.balanceStatus.dominant.body',
    Mind: 'dashboard.radar.balanceStatus.dominant.mind',
    Soul: 'dashboard.radar.balanceStatus.dominant.soul',
  };
  const balanceStatusLabel = pillarStats.isBalanced || !pillarStats.dominantPillar
    ? t('dashboard.radar.balanceStatus.balanced')
    : t(dominantStatusKey[pillarStats.dominantPillar]);

  return (
    <Card
      title={t('dashboard.radar.title')}
      subtitle={t('dashboard.radar.subtitle')}
      rightSlot={
        <InfoDotTarget id="radar" placement="right" className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-text-secondary)]">
            {balanceStatusLabel}
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
                  percentages={pillarStats.percentages}
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
  percentages: Record<(typeof PILLAR_ORDER)[number], number>;
  pillarLabels: Record<(typeof PILLAR_ORDER)[number], string>;
}

function Radar({ dataset, percentages, pillarLabels }: RadarProps) {
  const radius = 130;
  const outerPadding = 128;
  const center = radius + outerPadding;
  const { axes, maxValue } = dataset;
  const count = axes.length;
  const ringRadius = radius + 20;
  const labelRadius = ringRadius + 22;
  const ringThickness = 3.6;
  const uniqueId = useId().replace(/:/g, '_');
  const [expandedPillars, setExpandedPillars] = useState<Set<(typeof PILLAR_ORDER)[number]>>(
    () => new Set(),
  );

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

  const openedPillarCount = expandedPillars.size;
  const isPillarOpen = (pillar: (typeof PILLAR_ORDER)[number]) => expandedPillars.has(pillar);
  const togglePillar = (pillar: (typeof PILLAR_ORDER)[number]) => {
    setExpandedPillars((current) => {
      const next = new Set(current);

      if (next.has(pillar)) {
        next.delete(pillar);
      } else {
        next.add(pillar);
      }

      return next;
    });
  };

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
  const labelStyle: CSSProperties = {
    fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
    fontSize: 'clamp(11px, 3.2vw, 14px)',
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
  };

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="h-auto w-full max-w-[440px] overflow-visible"
      role="img"
      aria-label="Radar de GP por rasgo"
    >
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(191,219,254,0.45)" />
          <stop offset="70%" stopColor="rgba(167,139,250,0.18)" />
          <stop offset="100%" stopColor="rgba(148,163,184,0.05)" />
        </radialGradient>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(129,140,248,0.38)" />
          <stop offset="100%" stopColor="rgba(96,165,250,0.22)" />
        </linearGradient>
        <linearGradient id="radarFillDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(241,245,249,0.34)" />
          <stop offset="100%" stopColor="rgba(226,232,240,0.18)" />
        </linearGradient>
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
        {pillarRanges.map((range) => {
          const midAngle = (range.startAngle + range.endAngle) / 2;
          const reverseForBottomHalf = Math.sin(midAngle) > 0;
          const textPathId = `${uniqueId}-${range.pillar.toLowerCase()}-label-path`;

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

      <circle cx={center} cy={center} r={radius + 24} fill="url(#radarGlow)" opacity={0.12} />

      {pillarRanges.map((range) => (
        <path
          key={`${range.pillar}-sector`}
          d={sectorPath(radius, range.startAngle, range.endAngle)}
          fill={`url(#${uniqueId}-${range.pillar.toLowerCase()}-sector-gradient)`}
        />
      ))}

      {gridLevels.map((level) => {
        const points = axes
          .map((_, index) => {
            const { x, y } = basePointFor(radius * level, index);
            return `${x},${y}`;
          })
          .join(' ');
        return <polygon key={level} points={points} fill="none" className="stroke-[color-mix(in_srgb,var(--color-text-muted)_45%,transparent)] dark:stroke-[color-mix(in_srgb,var(--color-text-muted)_24%,transparent)]" strokeWidth={1.15} />;
      })}

      {axes.map((axis, index) => {
        const lineEnd = basePointFor(radius, index);
        const isExpanded = axis.pillar ? isPillarOpen(normalizePillar(axis.pillar) as (typeof PILLAR_ORDER)[number]) : false;
        const labelPoint = basePointFor(radius + 42, index);
        const angle = angleFor(index);
        const isRightSide = Math.cos(angle) > 0.22;
        const isLeftSide = Math.cos(angle) < -0.22;
        const anchor = isRightSide ? 'start' : isLeftSide ? 'end' : 'middle';
        const xOffset = isRightSide ? 8 : isLeftSide ? -8 : 0;
        const yOffset = Math.sin(angle) > 0.65 ? 8 : Math.sin(angle) < -0.65 ? -8 : 0;

        return (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={lineEnd.x}
              y2={lineEnd.y}
              className="stroke-[color-mix(in_srgb,var(--color-text-subtle)_72%,transparent)] dark:stroke-[color-mix(in_srgb,var(--color-text-subtle)_40%,transparent)]"
              strokeWidth={1.6}
            />
            {isExpanded && (
              <text
                x={labelPoint.x + xOffset}
                y={labelPoint.y + yOffset}
                fill="var(--color-text-primary)"
                textAnchor={anchor}
                dominantBaseline="middle"
                style={labelStyle}
              >
                {axis.label}
              </text>
            )}
          </g>
        );
      })}

      <polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        className="stroke-[rgba(99,102,241,0.58)] dark:hidden"
        strokeWidth={2.4}
      />
      <polygon
        points={polygonPoints}
        fill="url(#radarFillDark)"
        className="hidden stroke-[rgba(248,250,252,0.74)] dark:block"
        strokeWidth={2.3}
      />

      {pillarRanges.map((range) => {
        const opened = isPillarOpen(range.pillar);
        const dimmed = openedPillarCount > 0 && !opened;

        return (
          <g key={`${range.pillar}-ring`}>
            <path
              d={arcPath(ringRadius, range.startAngle, range.endAngle)}
              fill="none"
              stroke={range.color}
              strokeOpacity={dimmed ? 0.34 : opened ? 0.95 : 0.72}
              strokeWidth={opened ? ringThickness + 0.9 : ringThickness}
              strokeLinecap="round"
              className="transition-all"
            />
            <path
              d={arcPath(ringRadius, range.startAngle, range.endAngle)}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
              strokeLinecap="round"
              className="cursor-pointer"
              role="button"
              aria-label={pillarLabels[range.pillar]}
              onClick={() => togglePillar(range.pillar)}
            />
          </g>
        );
      })}

      {pillarRanges.map((range) => {
        const opened = isPillarOpen(range.pillar);
        const dimmed = openedPillarCount > 0 && !opened;
        const percentageLabel = `${percentages[range.pillar]}%`;

        return (
          <g key={`${range.pillar}-label`}>
            <text
              fill={range.color}
              fillOpacity={dimmed ? 0.52 : opened ? 0.96 : 0.72}
              style={{
                fontFamily: OFFICIAL_LANDING_CSS_VARIABLES['--font-heading'],
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                letterSpacing: '0.24em',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <textPath
                href={`#${uniqueId}-${range.pillar.toLowerCase()}-label-path`}
                startOffset="42%"
                textAnchor="middle"
              >
                {pillarLabels[range.pillar].toUpperCase()}
              </textPath>
            </text>
            <text
              fill={range.color}
              fillOpacity={dimmed ? 0.5 : 0.92}
              style={{
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
                fontSize: 'clamp(11px, 2.8vw, 14px)',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <textPath
                href={`#${uniqueId}-${range.pillar.toLowerCase()}-label-path`}
                startOffset="74%"
                textAnchor="middle"
              >
                {percentageLabel}
              </textPath>
            </text>
          </g>
        );
      })}

      <circle cx={center} cy={center} r={6} fill="rgba(224,231,255,0.95)" />
    </svg>
  );
}

function computePillarStats(axes: RadarAxis[]): PillarStats {
  const totals: Record<(typeof PILLAR_ORDER)[number], number> = {
    Body: 0,
    Mind: 0,
    Soul: 0,
  };

  for (const axis of axes) {
    const normalizedPillar = normalizePillar(axis.pillar) as (typeof PILLAR_ORDER)[number] | null;
    if (!normalizedPillar || !(normalizedPillar in totals)) {
      continue;
    }

    totals[normalizedPillar] += Number.isFinite(axis.xp) ? axis.xp : 0;
  }

  const totalXp = PILLAR_ORDER.reduce((acc, pillar) => acc + totals[pillar], 0);
  const percentages: Record<(typeof PILLAR_ORDER)[number], number> = {
    Body: 0,
    Mind: 0,
    Soul: 0,
  };

  for (const pillar of PILLAR_ORDER) {
    percentages[pillar] = totalXp > 0 ? Math.round((totals[pillar] / totalXp) * 100) : 0;
  }

  const sorted = [...PILLAR_ORDER].sort((a, b) => percentages[b] - percentages[a]);
  const dominantPillar = sorted[0] ?? null;
  const spread = dominantPillar ? percentages[dominantPillar] - percentages[sorted[sorted.length - 1]] : 0;

  return {
    percentages,
    dominantPillar,
    isBalanced: spread <= 15,
  };
}
