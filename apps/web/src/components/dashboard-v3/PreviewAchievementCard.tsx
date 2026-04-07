import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TaskInsightsResponse } from '../../lib/api';
import type { PostLoginLanguage } from '../../i18n/postLoginLanguage';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type PreviewAchievement = NonNullable<TaskInsightsResponse['previewAchievement']>;
type RecentMonthInput = NonNullable<PreviewAchievement['recentMonths']>[number];

type NormalizedRecentMonth = {
  key: string;
  sortKey: string;
  periodKey: string | null;
  state: string | null | undefined;
  closed: boolean;
  value?: number | null;
  projected: boolean;
};

type MonthNodeProps = {
  entry: NormalizedRecentMonth;
  language: PostLoginLanguage;
};

const statusConfig = {
  fragile: {
    label: { es: 'Hábito frágil', en: 'Fragile habit' },
    chip: 'bg-rose-300 text-rose-950',
    ring: 'stroke-rose-300',
  },
  building: {
    label: { es: 'Hábito en construcción', en: 'Habit in progress' },
    chip: 'bg-amber-300 text-amber-950',
    ring: 'stroke-amber-300',
  },
  strong: {
    label: { es: 'Hábito fuerte', en: 'Strong habit' },
    chip: 'bg-emerald-300 text-emerald-950',
    ring: 'stroke-emerald-300',
  },
} as const;

function getStatusTone(status: PreviewAchievement['status']) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'strong') return statusConfig.strong;
  if (normalized === 'building') return statusConfig.building;
  return statusConfig.fragile;
}

function monthLabel(value: string, language: PostLoginLanguage): string {
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', { month: 'short' }).format(parsed);
}

function asPeriodKey(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^\d{4}-\d{2}$/.test(text) ? text : null;
}

function normalizeRecentMonthEntry(entry: RecentMonthInput, index: number): NormalizedRecentMonth | null {
  if (!entry || typeof entry !== 'object') return null;

  const periodKey = asPeriodKey(entry.periodKey) ?? asPeriodKey(entry.month);
  const sortKey = periodKey ?? `zzzz-${String(index).padStart(2, '0')}`;
  const closed = entry.closed === true;
  const projectedValue = typeof entry.projectedCompletionRate === 'number' ? entry.projectedCompletionRate : null;
  const completionValue = typeof entry.completionRate === 'number' ? entry.completionRate : null;
  const legacyValue = typeof entry.value === 'number' ? entry.value : null;
  const value = closed ? (completionValue ?? legacyValue) : (projectedValue ?? completionValue ?? legacyValue);
  const projected = !closed && projectedValue != null;

  return {
    key: periodKey ?? `unknown-${index}`,
    sortKey,
    periodKey,
    state: entry.state,
    closed,
    value,
    projected,
  };
}

function normalizeRecentMonths(recentMonths: PreviewAchievement['recentMonths']): NormalizedRecentMonth[] {
  const list = Array.isArray(recentMonths) ? recentMonths : [];
  return list
    .map(normalizeRecentMonthEntry)
    .filter((entry): entry is NormalizedRecentMonth => entry != null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-8);
}

function getMonthTone(state: string | null | undefined): string {
  const normalized = String(state ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') {
    return 'bg-emerald-300/90 text-emerald-950';
  }
  if (normalized === 'building' || normalized === 'pending' || normalized === 'weak' || normalized === 'floor_only') {
    return 'bg-amber-300/85 text-amber-950';
  }
  if (normalized.startsWith('projected')) {
    return 'bg-violet-300/35 text-violet-100';
  }
  if (normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') {
    return 'bg-rose-300/80 text-rose-950';
  }
  return 'bg-white/10 text-[color:var(--color-slate-300)]';
}

function getMonthSymbol(monthState: string | null | undefined): string {
  const normalized = String(monthState ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') return '✓';
  if (normalized === 'building' || normalized === 'pending' || normalized === 'weak' || normalized === 'floor_only') return '•';
  if (normalized.startsWith('projected')) return '~';
  if (normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') return '✕';
  return '○';
}

function getMonthMetric(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.max(0, Math.min(100, Math.round(normalized)))}%`;
}

function RecentMonthNode({ entry, language }: MonthNodeProps) {
  const isProjected = entry.projected;
  const monthSymbol = getMonthSymbol(entry.state);
  return (
    <div
      key={`${entry.key}-${entry.value ?? 0}`}
      data-testid="recent-month-item"
      className="flex h-[5.2rem] min-w-[3.1rem] shrink-0 flex-col items-center gap-0.5 py-0.5 sm:h-[5.45rem] sm:min-w-[3.35rem]"
    >
      <div
        data-testid="recent-month-node"
        className={cx(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none shadow-[0_6px_16px_rgba(5,10,35,0.35)] sm:h-9 sm:w-9 sm:text-base',
          getMonthTone(entry.state),
        )}
        aria-label={`${entry.periodKey ?? 'unknown'}-${entry.state ?? 'unknown'}`}
        data-month-symbol={monthSymbol}
      >
        {isProjected ? (
          <span
            aria-hidden
            className="inline-flex h-3.5 w-3.5 animate-[spin_4.8s_linear_infinite] rounded-full border border-white/12 border-t-white/70 border-r-white/35 sm:h-[0.9rem] sm:w-[0.9rem]"
          />
        ) : (
          monthSymbol
        )}
      </div>
      <span className="text-[10px] text-[color:var(--color-slate-300)]" data-testid="recent-month-label">
        {entry.periodKey ? monthLabel(entry.periodKey, language) : language === 'es' ? 'Sin mes' : 'No month'}
      </span>
      <span
        className="text-[10px] font-semibold leading-none text-[color:var(--color-slate-300)]"
        data-testid="recent-month-progress"
      >
        {getMonthMetric(entry.value)}
      </span>
    </div>
  );
}

export function PreviewAchievementCard({
  previewAchievement,
  language,
}: {
  previewAchievement: PreviewAchievement;
  language: PostLoginLanguage;
}) {
  const tone = getStatusTone(previewAchievement.status);
  const score = Math.max(0, Math.min(100, Math.round(Number(previewAchievement.score ?? 0))));
  const scoreLabel = 'Score';
  const recentMonths = normalizeRecentMonths(previewAchievement.recentMonths);
  const orderedRecentMonths = recentMonths;
  const lastThreeStart = Math.max(0, orderedRecentMonths.length - 3);
  const lastThreeEnd = Math.min(orderedRecentMonths.length, lastThreeStart + 3);
  const hasGroupedWindow = orderedRecentMonths.length >= 3;
  const leadingMonths = hasGroupedWindow ? orderedRecentMonths.slice(0, lastThreeStart) : orderedRecentMonths;
  const groupedMonths = hasGroupedWindow ? orderedRecentMonths.slice(lastThreeStart, lastThreeEnd) : [];
  const shouldCenterRecentTimeline = orderedRecentMonths.length <= 5;
  const shouldUseOverflowTrack = orderedRecentMonths.length > 5;

  const ring = useMemo(() => {
    const radius = 47;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);
    return { radius, circumference, offset };
  }, [score]);

  const [isScoreTooltipOpen, setIsScoreTooltipOpen] = useState(false);
  const [activeRangeLabel, setActiveRangeLabel] = useState<'strong' | 'building' | 'fragile' | null>(null);
  const scoreTooltipId = useId();
  const scoreTooltipRef = useRef<HTMLDivElement | null>(null);
  const scoreMarkerTop = `${Math.max(0, Math.min(100, 100 - score))}%`;
  const groupedProjectedMonth = groupedMonths.find((entry) => entry.projected);
  const windowTitle = language === 'es' ? 'Estado actual' : 'Current state';
  const rangeLabels = {
    strong: language === 'es' ? 'fuerte' : 'strong',
    building: language === 'es' ? 'en construcción' : 'building',
    fragile: language === 'es' ? 'frágil' : 'fragile',
  } as const;

  useEffect(() => {
    if (!isScoreTooltipOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!scoreTooltipRef.current?.contains(target)) {
        setIsScoreTooltipOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsScoreTooltipOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isScoreTooltipOpen]);

  return (
    <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
      <div className="flex flex-col items-center gap-2">
        <div className="space-y-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
            {language === 'es' ? 'Desarrollo del hábito' : 'Habit development'}
          </p>
          {previewAchievement.consolidationStrength != null && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>
        <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', tone.chip)}>
          {tone.label[language]}
        </span>

        <div className="flex shrink-0 flex-col items-center" data-testid="score-block">
          <div className="flex items-center gap-4 sm:gap-5">
            <svg
              className="h-32 w-32 sm:h-36 sm:w-36"
              viewBox="0 0 120 120"
              role="img"
              aria-label={`preview achievement score ${score}`}
              data-testid="score-donut"
            >
              <circle
                cx="60"
                cy="60"
                r={ring.radius}
                strokeWidth={11}
                className="fill-none stroke-[color:var(--color-border-subtle)]"
              />
              <circle
                cx="60"
                cy="60"
                r={ring.radius}
                strokeWidth={11}
                strokeDasharray={`${ring.circumference} ${ring.circumference}`}
                strokeDashoffset={ring.offset}
                className={cx('fill-none transition-[stroke-dashoffset] duration-500 ease-out', tone.ring)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="56" textAnchor="middle" dominantBaseline="middle" className="fill-[color:var(--color-text)] text-[26px] font-semibold">
                {score}
              </text>
              <text x="60" y="74" textAnchor="middle" dominantBaseline="middle" className="fill-[color:var(--color-slate-400)] text-[10px] uppercase tracking-[0.14em]">
                {scoreLabel}
              </text>
            </svg>
            <div className="relative flex h-32 items-center sm:h-36" data-testid="score-range-rail">
              <div className="relative h-full w-[3.35rem]">
                <div className="absolute bottom-1 left-4 top-1 w-3 overflow-hidden rounded-full border border-white/24 bg-[color:var(--color-overlay-1)]/45">
                  <button
                    type="button"
                    onMouseEnter={() => setActiveRangeLabel('strong')}
                    onMouseLeave={() => setActiveRangeLabel(null)}
                    onFocus={() => setActiveRangeLabel('strong')}
                    onBlur={() => setActiveRangeLabel(null)}
                    onClick={() => setActiveRangeLabel((prev) => (prev === 'strong' ? null : 'strong'))}
                    className="absolute inset-x-0 top-0 h-[20%] bg-emerald-300/95 focus:outline-none"
                    aria-label={rangeLabels.strong}
                  />
                  <button
                    type="button"
                    onMouseEnter={() => setActiveRangeLabel('building')}
                    onMouseLeave={() => setActiveRangeLabel(null)}
                    onFocus={() => setActiveRangeLabel('building')}
                    onBlur={() => setActiveRangeLabel(null)}
                    onClick={() => setActiveRangeLabel((prev) => (prev === 'building' ? null : 'building'))}
                    className="absolute inset-x-0 top-[20%] h-[30%] bg-amber-300/95 focus:outline-none"
                    aria-label={rangeLabels.building}
                  />
                  <button
                    type="button"
                    onMouseEnter={() => setActiveRangeLabel('fragile')}
                    onMouseLeave={() => setActiveRangeLabel(null)}
                    onFocus={() => setActiveRangeLabel('fragile')}
                    onBlur={() => setActiveRangeLabel(null)}
                    onClick={() => setActiveRangeLabel((prev) => (prev === 'fragile' ? null : 'fragile'))}
                    className="absolute inset-x-0 bottom-0 h-[50%] bg-rose-300/95 focus:outline-none"
                    aria-label={rangeLabels.fragile}
                  />
                  <span className="absolute inset-x-0 top-[20%] h-px bg-white/35" />
                  <span className="absolute inset-x-0 top-[50%] h-px bg-white/35" />
                  <span
                    className="pointer-events-none absolute inset-x-0 h-px bg-white/90 transition-all duration-500 ease-out"
                    style={{ top: scoreMarkerTop }}
                    aria-hidden
                  />
                </div>
                <span className="absolute left-8 top-0 text-[8px] text-[color:var(--color-slate-400)]">100</span>
                <span className="absolute left-8 top-[20%] -translate-y-1/2 text-[8px] text-[color:var(--color-slate-300)]">80</span>
                <span className="absolute left-8 top-[50%] -translate-y-1/2 text-[8px] text-[color:var(--color-slate-300)]">50</span>
                <span className="absolute left-8 bottom-0 text-[8px] text-[color:var(--color-slate-500)]">0</span>
                <span
                  className="pointer-events-none absolute left-[1.1rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/80 bg-[color:var(--color-overlay-1)] shadow-[0_0_0_2px_rgba(255,255,255,0.18)] transition-all duration-500 ease-out"
                  style={{ top: scoreMarkerTop }}
                  aria-hidden
                />
                {activeRangeLabel && (
                  <span className="absolute -right-5 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-[color:var(--color-overlay-1)]/85 px-1.5 py-0.5 text-[9px] font-medium text-[color:var(--color-slate-200)] shadow-sm">
                    {rangeLabels[activeRangeLabel]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className="relative mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-slate-400)]"
            data-testid="score-affordance"
            ref={scoreTooltipRef}
          >
            <span className="font-semibold uppercase tracking-[0.12em] text-[color:var(--color-slate-300)]">
              {scoreLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsScoreTooltipOpen((prev) => !prev)}
              onFocus={() => setIsScoreTooltipOpen(true)}
              aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 bg-white/20 text-[9px] font-semibold text-white shadow-sm"
              data-testid="score-info-dot"
              aria-describedby={isScoreTooltipOpen ? scoreTooltipId : undefined}
            >
              i
            </button>
            {isScoreTooltipOpen && (
              <div
                id={scoreTooltipId}
                role="tooltip"
                className="absolute left-1/2 top-6 z-10 w-52 -translate-x-1/2 rounded-lg border border-white/20 bg-[color:var(--color-overlay-1)]/95 p-2 text-[10px] leading-snug text-[color:var(--color-slate-100)] shadow-xl backdrop-blur-sm"
              >
                {language === 'es'
                  ? 'El Score resume cómo viene hoy tu hábito con base en constancia reciente, cumplimiento de la ventana actual y tendencia.'
                  : 'Score summarizes how your habit is doing today based on recent consistency, completion in the current window, and trend.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {orderedRecentMonths.length > 0 && (
          <div className="px-0 py-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
                {language === 'es' ? 'Historial reciente' : 'Recent history'}
              </p>
              <details className="group relative" data-testid="timeline-legend">
                <summary
                  className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-white/40 bg-white/20 text-[10px] font-semibold leading-none text-white shadow-sm transition-colors hover:bg-white/30"
                  aria-label={language === 'es' ? 'Leyenda de historial' : 'History legend'}
                  data-testid="timeline-legend-trigger"
                >
                  i
                </summary>
                <div className="pointer-events-none absolute left-0 top-6 z-10 hidden min-w-[11rem] rounded-lg border border-white/20 bg-[color:var(--color-overlay-1)]/95 p-2 text-[10px] leading-snug text-[color:var(--color-slate-100)] shadow-xl backdrop-blur-sm group-open:block group-hover:block">
                  <p>{language === 'es' ? '✓ = mes fuerte' : '✓ = strong month'}</p>
                  <p>{language === 'es' ? '• = en construcción' : '• = building'}</p>
                  <p>{language === 'es' ? '✕ = mes débil' : '✕ = weak month'}</p>
                  <p>{language === 'es' ? '↻ = mes proyectado en curso' : '↻ = projected month in progress'}</p>
                </div>
              </details>
            </div>
            <div className="w-full overflow-x-auto pb-1" data-testid="recent-timeline">
              <div
                className={cx(
                  'flex items-end gap-1 md:gap-1.5',
                  shouldCenterRecentTimeline ? 'justify-center' : 'justify-start',
                  shouldUseOverflowTrack ? 'min-w-max' : 'w-full',
                )}
                data-testid="recent-timeline-track"
              >
                {leadingMonths.map((entry) => (
                  <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} />
                ))}
                {hasGroupedWindow && (
                  <div
                    className="relative rounded-[1.15rem] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(10,14,26,0.62))] px-0.5 py-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] md:px-1"
                    data-testid="seal-window-group"
                    data-window-start={lastThreeStart}
                    data-window-end={lastThreeEnd - 1}
                  >
                    <div className="rounded-t-[1rem] border border-white/20 bg-[color:var(--color-overlay-2)]/70 px-2 py-1">
                      <p className="text-center text-[9px] uppercase tracking-[0.11em] text-[color:var(--color-slate-200)]">
                        {windowTitle}
                      </p>
                    </div>
                    <div className="relative rounded-b-[1rem] border border-t-0 border-white/16 bg-[color:var(--color-overlay-1)]/68 px-1.5 pb-3 pt-2">
                      <div className="flex items-end gap-1 md:gap-1.5" data-testid="seal-window-track">
                        {groupedMonths.map((entry) => (
                          <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} />
                        ))}
                      </div>
                      <span className="pointer-events-none absolute -bottom-1 right-4 h-1.5 w-7 rounded-b-[0.75rem] border-b border-x border-white/15 bg-[color:var(--color-overlay-1)]/72" />
                      {groupedProjectedMonth && (
                        <span className="pointer-events-none absolute -bottom-4 right-1 text-[9px] leading-none text-[color:var(--color-slate-400)]">
                          {language === 'es' ? 'proyectado' : 'projected'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
