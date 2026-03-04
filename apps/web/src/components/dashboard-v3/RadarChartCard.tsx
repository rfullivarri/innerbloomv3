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
  const { data, status } = useRequest(() => getUserXpByTrait(userId), [userId]);
  const dataset = useMemo(() => computeRadarDataset(data?.traits ?? []), [data?.traits]);
  const hasAxes = dataset.axes.length > 0;

  return (
    <Card
      title="🧿 Radar Chart"
      subtitle="GP · total acumulado"
      rightSlot={
        <InfoDotTarget id="radar" placement="right" className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-2.5 py-1 text-xs text-[color:var(--color-text-muted)]">
            Rasgos clave
          </span>
        </InfoDotTarget>
      }
    >
      {status === 'loading' && <div className="h-[260px] w-full animate-pulse rounded-ib-md bg-[color:var(--color-overlay-2)]" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos construir el radar. Probá más tarde.</p>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-[520px] p-4 sm:p-6">
            <div className="flex w-full justify-center px-1 sm:px-2">
              {hasAxes ? (
                <Radar dataset={dataset} />
              ) : (
                <div className="flex h-[260px] w-full max-w-[420px] items-center justify-center text-center text-sm text-[color:var(--color-text-muted)]">
                  <p className="px-6 leading-relaxed">
                    Todavía no registraste GP por rasgo. Completá misiones para ver cómo evoluciona tu radar.
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
}

function Radar({ dataset }: RadarProps) {
  const radius = 130;
  const outerPadding = 96;
  const center = radius + outerPadding;
  const { axes, maxValue } = dataset;
  const count = axes.length;

  if (count === 0) {
    return null;
  }

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
  const viewBoxSize = center * 2;
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
      className="h-auto w-full max-w-[420px]"
      role="img"
      aria-label="Radar de GP por rasgo"
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
        return <polygon key={level} points={points} fill="none" className="stroke-[color-mix(in_srgb,var(--color-text-muted)_62%,transparent)] dark:stroke-[var(--color-border-subtle)]" strokeWidth={1.35} />;
      })}

      {axes.map((axis, index) => {
        const lineEnd = basePointFor(radius, index);
        const labelPoint = basePointFor(radius + 30, index);
        const normalized = maxValue > 0 ? Math.min(Math.max(axis.xp / maxValue, 0), 1) : 0;
        const valueDistance = normalized * radius;
        const xpLabelOffset = normalized > 0 ? 24 : 36;
        const xpLabelPoint = basePointFor(Math.min(radius + 48, valueDistance + xpLabelOffset), index);
        const xpLabel = XP_NUMBER_FORMATTER.format(Math.round(axis.xp ?? 0));

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
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              fill="var(--color-text-subtle)"
              textAnchor="middle"
              dominantBaseline="middle"
              style={labelStyle}
            >
              {axis.label}
            </text>
            <text
              x={xpLabelPoint.x}
              y={xpLabelPoint.y}
              fill="var(--color-text-muted)"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
                fontSize: 'clamp(12px, 3.4vw, 16px)',
                fontWeight: 600,
                letterSpacing: '0.01em',
                lineHeight: 1.2,
              }}
            >
              {xpLabel}
            </text>
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="url(#radarFill)" className="stroke-[rgba(99,102,241,0.82)] dark:stroke-[rgba(129,140,248,0.5)]" strokeWidth={2.4} />
      <circle cx={center} cy={center} r={6} fill="rgba(224,231,255,0.95)" />
    </svg>
  );
}
