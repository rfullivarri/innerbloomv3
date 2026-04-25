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
  compact?: boolean;
};

const statusConfig = {
  fragile: {
    label: { es: 'Hábito frágil', en: 'Fragile habit' },
    chip: 'border border-rose-200/30 bg-gradient-to-r from-rose-300/90 to-rose-200/80 text-rose-950 shadow-[0_8px_24px_rgba(251,113,133,0.22)]',
    ringColor: '#fb7185',
    ringGradientStop: '#fda4af',
  },
  building: {
    label: { es: 'Hábito en construcción', en: 'Habit in progress' },
    chip: 'border border-amber-100/30 bg-gradient-to-r from-amber-300/90 to-yellow-200/85 text-amber-950 shadow-[0_8px_24px_rgba(251,191,36,0.2)]',
    ringColor: '#fbbf24',
    ringGradientStop: '#fde68a',
  },
  strong: {
    label: { es: 'Hábito fuerte', en: 'Strong habit' },
    chip: 'border border-emerald-100/30 bg-gradient-to-r from-emerald-300/92 to-teal-200/85 text-emerald-950 shadow-[0_8px_24px_rgba(74,222,128,0.24)]',
    ringColor: '#6ee7b7',
    ringGradientStop: '#99f6e4',
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
    return 'bg-gradient-to-br from-emerald-300/95 to-emerald-200/75 text-emerald-950 shadow-[0_6px_18px_rgba(16,185,129,0.25)]';
  }
  if (normalized === 'building' || normalized === 'pending' || normalized === 'weak' || normalized === 'floor_only') {
    return 'bg-gradient-to-br from-amber-300/92 to-yellow-200/72 text-amber-950 shadow-[0_6px_18px_rgba(245,158,11,0.24)]';
  }
  if (normalized.startsWith('projected')) {
    return 'bg-gradient-to-br from-violet-300/45 to-indigo-300/30 text-violet-100 shadow-[0_8px_24px_rgba(139,92,246,0.25)]';
  }
  if (normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') {
    return 'bg-gradient-to-br from-rose-300/88 to-rose-200/68 text-rose-950 shadow-[0_6px_18px_rgba(244,63,94,0.22)]';
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

function RecentMonthNode({ entry, language, compact = false }: MonthNodeProps) {
  const monthSymbol = getMonthSymbol(entry.state);
  return (
    <div
      key={`${entry.key}-${entry.value ?? 0}`}
      data-testid="recent-month-item"
      className={cx(
        'flex shrink-0 flex-col items-center gap-1 py-0',
        compact ? 'h-[3.8rem] w-[2.5rem] sm:h-[4rem] sm:w-[2.75rem]' : 'h-[4.8rem] w-[3.35rem] sm:h-[4.95rem] sm:w-[3.55rem]',
      )}
    >
      <div
        data-testid="recent-month-node"
        className={cx(
          compact
            ? 'relative inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none shadow-[0_8px_20px_rgba(5,10,35,0.4)] sm:h-7 sm:w-7 sm:text-sm'
            : 'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none shadow-[0_8px_20px_rgba(5,10,35,0.4)] sm:h-9 sm:w-9 sm:text-base',
          getMonthTone(entry.state),
        )}
        aria-label={`${entry.periodKey ?? 'unknown'}-${entry.state ?? 'unknown'}`}
        data-month-symbol={monthSymbol}
      >
        {monthSymbol}
      </div>
      <span className={cx('text-[color:var(--color-slate-300)] leading-none', compact ? 'text-[9px]' : 'text-[10px]')} data-testid="recent-month-label">
        {entry.periodKey ? monthLabel(entry.periodKey, language) : language === 'es' ? 'Sin mes' : 'No month'}
      </span>
      <span
        className={cx('font-semibold leading-none text-[color:var(--color-slate-300)]', compact ? 'text-[9px]' : 'text-[10px]')}
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
  size = 'default',
  surface = 'default',
}: {
  previewAchievement: PreviewAchievement;
  language: PostLoginLanguage;
  size?: 'default' | 'compact';
  surface?: 'default' | 'ghost';
}) {
  const isCompact = size === 'compact';
  const isGhostSurface = surface === 'ghost';
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
  const [animatedScore, setAnimatedScore] = useState(0);
  const ringGradientId = useId();
  const ringGlowId = useId();

  const ring = useMemo(() => {
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - animatedScore / 100);
    return { radius, circumference, offset };
  }, [animatedScore]);

  const [isScoreTooltipOpen, setIsScoreTooltipOpen] = useState(false);
  const scoreTooltipId = useId();
  const scoreTooltipRef = useRef<HTMLDivElement | null>(null);
  const scoreMarkerTop = `${Math.max(0, Math.min(100, 100 - score))}%`;
  const groupedProjectedMonth = groupedMonths.find((entry) => entry.projected);
  const windowTitle = language === 'es' ? 'Ventana activa' : 'Active window';
  const projectionNote =
    groupedProjectedMonth || orderedRecentMonths.some((entry) => entry.projected)
      ? previewAchievement.currentMonth?.expectedTargetSoFar != null && previewAchievement.currentMonth.expectedTargetSoFar <= 1
        ? language === 'es'
          ? '~ estimación temprana'
          : '~ early estimate'
        : language === 'es'
          ? '~ proyectado al ritmo actual'
          : '~ projected at current pace'
      : null;
  const rangeLabels = {
    strong: language === 'es' ? 'fuerte' : 'strong',
    building: language === 'es' ? 'en construcción' : 'building',
    fragile: language === 'es' ? 'frágil' : 'fragile',
  } as const;

  useEffect(() => {
    let frame = 0;
    let start = 0;
    const durationMs = 900;
    setAnimatedScore(0);
    const tick = (timestamp: number) => {
      if (start === 0) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      // Cubic-out easing keeps the first half energetic and settles gently near the final score.
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [score]);

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
    <section
      className={cx(
        'overflow-visible rounded-2xl',
        isGhostSurface ? 'border-transparent bg-transparent shadow-none' : 'border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] shadow-inner',
        isCompact ? 'p-2.5 pb-4' : 'p-3 pb-4',
      )}
    >
      <div className={cx('flex flex-col items-center', isCompact ? 'gap-1.5' : 'gap-2')}>
        <div className="w-full space-y-2 text-left">
          <p className={cx('font-semibold uppercase tracking-[0.08em] text-[color:var(--color-slate-100)]', isCompact ? 'text-[13px]' : 'text-sm')}>
            {language === 'es' ? 'Desarrollo del hábito' : 'Habit development'}
          </p>
          {previewAchievement.consolidationStrength != null && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>
        <div className="mx-auto flex w-full shrink-0 flex-col items-center" data-tour-anchor="achievement-preview-overview">
          <span className={cx('inline-flex items-center rounded-full font-semibold', isCompact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs', tone.chip)}>
            {tone.label[language]}
          </span>
          <div
            className={cx(
              'mt-2 flex w-full items-center justify-center md:col-start-2 md:justify-self-center',
              isCompact ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-4',
              'flex-wrap sm:flex-nowrap',
            )}
            data-testid="score-block"
            data-tour-anchor="achievement-preview-score"
          >
            <div className="relative shrink-0" ref={scoreTooltipRef}>
              <svg
                className={isCompact ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-24 w-24 sm:h-28 sm:w-28'}
                viewBox="0 0 120 120"
                role="img"
                aria-label={`preview achievement score ${score}`}
                data-testid="score-donut"
              >
                <defs>
                  <linearGradient id={ringGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={tone.ringGradientStop} />
                    <stop offset="100%" stopColor={tone.ringColor} />
                  </linearGradient>
                  <filter id={ringGlowId} x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={tone.ringColor} floodOpacity="0.32" />
                  </filter>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  strokeWidth={10}
                  className="fill-none"
                  stroke="rgba(79,70,229,0.2)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  strokeWidth={10}
                  strokeDasharray={`${ring.circumference} ${ring.circumference}`}
                  strokeDashoffset={ring.offset}
                  className="fill-none transition-[stroke-dashoffset] duration-500 ease-out"
                  strokeLinecap="round"
                  stroke={`url(#${ringGradientId})`}
                  filter={`url(#${ringGlowId})`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[30px] font-semibold leading-none text-[color:var(--color-text)] sm:text-[32px]">{score}</span>
                <span data-testid="score-affordance" className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-300)]">
                  <span className="font-semibold">{scoreLabel}</span>
                  <span className="sr-only">{language === 'es' ? 'fuerza actual del hábito' : 'current habit strength'}</span>
                </span>
              </div>
              <div className="absolute left-1/2 top-[67%] inline-flex -translate-x-1/2 items-center gap-1 text-[10px] text-[color:var(--color-slate-400)]">
                <button
                  type="button"
                  onClick={() => setIsScoreTooltipOpen((prev) => !prev)}
                  onFocus={() => setIsScoreTooltipOpen(true)}
                  aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/65 bg-white/20 text-[9px] font-semibold text-white shadow-[0_8px_20px_rgba(8,12,24,0.55)] backdrop-blur-xl"
                  data-testid="score-info-dot"
                  aria-describedby={isScoreTooltipOpen ? scoreTooltipId : undefined}
                >
                  i
                </button>
              </div>
              {isScoreTooltipOpen && (
                <div
                  id={scoreTooltipId}
                  role="tooltip"
                  className="absolute left-1/2 top-[74%] z-10 w-52 max-w-[88vw] -translate-x-1/2 rounded-lg border border-white/45 bg-[rgba(8,12,24,0.985)] p-2 text-[10px] leading-snug text-[color:var(--color-slate-100)] shadow-2xl backdrop-blur-2xl"
                >
                  {language === 'es'
                    ? 'El Score resume cómo viene hoy tu hábito con base en constancia reciente, cumplimiento de la ventana actual y tendencia.'
                    : 'Score summarizes how your habit is doing today based on recent consistency, completion in the current window, and trend.'}
                </div>
              )}
            </div>
            <div
              className={cx('relative flex items-center rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2', isCompact ? 'h-24 sm:h-28' : 'h-32 sm:h-36')}
              data-testid="score-range-rail"
              data-tour-anchor="achievement-preview-scale"
            >
              <div className={cx('relative h-full', isCompact ? 'w-[3.9rem]' : 'w-[4.5rem]')}>
                <div className="absolute bottom-1 left-1.5 top-1 w-2 overflow-hidden rounded-full bg-[rgba(79,70,229,0.18)]">
                  <button
                    type="button"
                    className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-emerald-200/90 to-emerald-300/75 focus:outline-none"
                    aria-label={rangeLabels.strong}
                  />
                  <button
                    type="button"
                    className="absolute inset-x-0 top-[20%] h-[30%] bg-gradient-to-b from-amber-200/90 to-amber-300/75 focus:outline-none"
                    aria-label={rangeLabels.building}
                  />
                  <button
                    type="button"
                    className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-b from-rose-200/85 to-rose-300/78 focus:outline-none"
                    aria-label={rangeLabels.fragile}
                  />
                  <span className="absolute inset-x-0 top-[20%] h-px bg-white/45" />
                  <span className="absolute inset-x-0 top-[50%] h-px bg-white/45" />
                  <span
                    className="pointer-events-none absolute -inset-x-0.5 h-0.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(10,14,26,0.4),0_0_12px_rgba(255,255,255,0.45)] transition-all duration-500 ease-out"
                    style={{ top: scoreMarkerTop }}
                    aria-hidden
                  />
                </div>
                <span className="absolute left-0 top-0 text-[8px] text-[color:var(--color-slate-400)]">100</span>
                <span className="absolute left-0 top-[20%] -translate-y-1/2 text-[8px] text-[color:var(--color-slate-300)]">80</span>
                <span className="absolute left-0 top-[50%] -translate-y-1/2 text-[8px] text-[color:var(--color-slate-300)]">50</span>
                <span className="absolute left-0 bottom-0 text-[8px] text-[color:var(--color-slate-500)]">0</span>
                <span className={cx('absolute top-[3%] text-left text-[9px] font-medium leading-none text-[color:var(--color-slate-300)]', isCompact ? 'left-[2.25rem]' : 'left-[2.6rem]')}>
                  {rangeLabels.strong}
                </span>
                <span className={cx('absolute top-[50%] -translate-y-1/2 text-left text-[9px] font-medium leading-none text-[color:var(--color-slate-300)]', isCompact ? 'left-[2.25rem]' : 'left-[2.6rem]')}>
                  {rangeLabels.building}
                </span>
                <span className={cx('absolute bottom-[3%] text-left text-[9px] font-medium leading-none text-[color:var(--color-slate-300)]', isCompact ? 'left-[2.25rem]' : 'left-[2.6rem]')}>
                  {rangeLabels.fragile}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cx(isCompact ? 'mt-2.5 space-y-1.5' : 'mt-3 space-y-2')}>
        {orderedRecentMonths.length > 0 && (
          <div className="px-0 py-0" data-tour-anchor="achievement-preview-months-section">
            <div className="flex items-center gap-1.5">
              <p className={cx('font-semibold uppercase tracking-[0.08em] text-[color:var(--color-slate-100)]', isCompact ? 'text-[13px]' : 'text-sm')}>
                {language === 'es' ? 'Resultado últimos meses' : 'Last months result'}
              </p>
              {language === 'es' && <span className="sr-only">Historial reciente</span>}
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
                  <p>{language === 'es' ? '~ = proyectado al ritmo actual' : '~ = projected at current pace'}</p>
                </div>
              </details>
            </div>
            <div className="w-full overflow-x-auto pb-2 pt-1" data-testid="recent-timeline" data-tour-anchor="achievement-preview-months">
              <div
                className={cx(
                  'flex items-end gap-1 md:gap-1.5',
                  shouldCenterRecentTimeline ? 'justify-center' : 'justify-start',
                  shouldUseOverflowTrack ? 'min-w-max' : 'w-full',
                )}
                data-testid="recent-timeline-track"
              >
                {leadingMonths.map((entry) => (
                  <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} compact={isCompact} />
                ))}
                {hasGroupedWindow && (
                  <div className="relative flex items-end rounded-xl bg-white/5 px-1.5 pb-1 pt-4">
                    <span className="pointer-events-none absolute inset-0 rounded-xl border border-violet-200/20 bg-violet-400/8 shadow-[0_0_24px_rgba(129,140,248,0.16)]" />
                    <p className="absolute left-2 top-1 text-[8px] font-medium uppercase tracking-[0.1em] text-[color:var(--color-slate-400)]">{windowTitle}</p>
                    <div
                      className="relative flex items-end gap-1 rounded-xl bg-white/5 md:gap-1.5"
                      data-testid="seal-window-group"
                      data-window-start={lastThreeStart}
                      data-window-end={lastThreeEnd - 1}
                      data-tour-anchor="achievement-preview-active-window"
                    >
                      {groupedMonths.map((entry) => (
                        <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} compact={isCompact} />
                      ))}
                    </div>
                    {groupedProjectedMonth && <span className="absolute -bottom-3 right-2 text-[9px] text-[color:var(--color-slate-400)]">{language === 'es' ? 'proyectado' : 'projected'}</span>}
                  </div>
                )}
              </div>
            </div>
            {projectionNote && (
              <p className="mt-1 text-[10px] text-[color:var(--color-slate-400)]" data-testid="recent-timeline-projection-note">
                {projectionNote}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
