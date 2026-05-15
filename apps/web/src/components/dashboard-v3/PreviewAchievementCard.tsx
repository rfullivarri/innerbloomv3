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
  variant?: 'default' | 'landing';
};

const statusConfig = {
  fragile: {
    label: { es: 'Hábito frágil', en: 'Fragile habit' },
    chip: 'bg-rose-300 text-rose-950',
    ringColor: '#fb7185',
    ringGradientStop: '#fda4af',
    ringTrack: 'rgba(251,113,133,0.24)',
  },
  building: {
    label: { es: 'Hábito en construcción', en: 'Habit in progress' },
    chip: 'bg-amber-300 text-amber-950',
    ringColor: '#fbbf24',
    ringGradientStop: '#fde68a',
    ringTrack: 'rgba(251,191,36,0.25)',
  },
  strong: {
    label: { es: 'Hábito fuerte', en: 'Strong habit' },
    chip: 'bg-emerald-300 text-emerald-950',
    ringColor: '#6ee7b7',
    ringGradientStop: '#99f6e4',
    ringTrack: 'rgba(110,231,183,0.25)',
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
    return 'bg-emerald-400 text-white';
  }
  if (normalized === 'building' || normalized === 'pending' || normalized === 'floor_only') {
    return 'bg-amber-400 text-amber-950';
  }
  if (normalized.startsWith('projected')) {
    return 'bg-indigo-900 text-indigo-100';
  }
  if (normalized === 'weak' || normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') {
    return 'bg-rose-500 text-white';
  }
  return 'bg-white/10 text-[color:var(--color-slate-300)]';
}

function getMonthSymbol(monthState: string | null | undefined): string {
  const normalized = String(monthState ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') return '✓';
  if (normalized === 'building' || normalized === 'pending' || normalized === 'floor_only') return '•';
  if (normalized.startsWith('projected')) return '~';
  if (normalized === 'weak' || normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') return '✕';
  return '○';
}

function formatCompletionRatePercent(rate: number | null | undefined): string {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return '--';
  const safeRate = Math.max(0, rate);
  const percent = safeRate > 3 ? safeRate : safeRate * 100;
  return `${Math.round(percent)}%`;
}

function getMonthMetric(value: number | null | undefined): string {
  return formatCompletionRatePercent(value);
}

function RecentMonthNode({ entry, language, compact = false, variant = 'default' }: MonthNodeProps) {
  const monthSymbol = getMonthSymbol(entry.state);
  const normalized = String(entry.state ?? '').toLowerCase();
  const isProjected = normalized.startsWith('projected');
  const isBuilding = normalized === 'building' || normalized === 'pending' || normalized === 'floor_only';
  const isLanding = variant === 'landing';
  return (
    <div
      key={`${entry.key}-${entry.value ?? 0}`}
      data-testid="recent-month-item"
      className={cx(
        'mt-1 flex shrink-0 flex-col items-center py-0',
        isLanding ? 'gap-1.5' : 'gap-1',
        isLanding
          ? compact
            ? 'h-[4.2rem] w-[2.7rem] sm:h-[4.45rem] sm:w-[2.95rem]'
            : 'h-[5.25rem] w-[3.6rem] sm:h-[5.5rem] sm:w-[3.85rem]'
          : compact
            ? 'h-[3.8rem] w-[2.35rem] sm:h-[4rem] sm:w-[2.65rem]'
            : 'h-[4.8rem] w-[3.1rem] sm:h-[4.95rem] sm:w-[3.45rem]',
      )}
    >
      <div
        data-testid="recent-month-node"
        className={cx(
          isLanding
            ? compact
              ? 'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-black leading-none shadow-[0_9px_20px_rgba(5,10,35,0.38)] sm:h-9 sm:w-9 sm:text-lg'
              : 'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-xl font-black leading-none shadow-[0_10px_22px_rgba(5,10,35,0.4)] sm:h-11 sm:w-11 sm:text-2xl'
            : compact
              ? 'relative inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none shadow-[0_7px_16px_rgba(5,10,35,0.34)] sm:h-7 sm:w-7 sm:text-sm'
              : 'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none shadow-[0_7px_16px_rgba(5,10,35,0.34)] sm:h-9 sm:w-9 sm:text-base',
          getMonthTone(entry.state),
        )}
        aria-label={`${entry.periodKey ?? 'unknown'}-${entry.state ?? 'unknown'}`}
        data-month-symbol={monthSymbol}
      >
        {isProjected ? (
          <span
            className={cx(
              'inline-flex rounded-full border-2 border-indigo-100/80 border-t-transparent animate-spin',
              isLanding ? (compact ? 'h-4 w-4' : 'h-5 w-5') : compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
            )}
            aria-hidden
          />
        ) : isBuilding ? (
          <span className={cx('inline-flex rounded-full bg-amber-50', isLanding ? (compact ? 'h-2 w-2' : 'h-2.5 w-2.5') : compact ? 'h-1.5 w-1.5' : 'h-2 w-2')} aria-hidden />
        ) : (
          monthSymbol
        )}
      </div>
      <span className={cx('leading-none', isLanding ? (compact ? 'text-[12px] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-sm text-[color:var(--color-text-muted)] dark:text-slate-300') : compact ? 'text-[9px] text-[color:var(--color-slate-300)]' : 'text-[10px] text-[color:var(--color-slate-300)]')} data-testid="recent-month-label">
        {entry.periodKey ? monthLabel(entry.periodKey, language) : language === 'es' ? 'Sin mes' : 'No month'}
      </span>
      <span
        className={cx('font-semibold leading-none', isLanding ? (compact ? 'text-sm text-[color:var(--color-text)] dark:text-slate-50' : 'text-base text-[color:var(--color-text)] dark:text-slate-50') : compact ? 'text-[9px] text-[color:var(--color-slate-100)]' : 'text-[10px] text-[color:var(--color-slate-100)]')}
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
  variant = 'default',
  showInfoControls = true,
}: {
  previewAchievement: PreviewAchievement;
  language: PostLoginLanguage;
  size?: 'default' | 'compact';
  surface?: 'default' | 'ghost';
  variant?: 'default' | 'landing';
  showInfoControls?: boolean;
}) {
  const isCompact = size === 'compact';
  const isGhostSurface = surface === 'ghost';
  const isLanding = variant === 'landing';
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
        'overflow-visible',
        isLanding ? 'rounded-[1.55rem]' : 'rounded-2xl',
        isGhostSurface
          ? 'border-transparent bg-transparent shadow-none'
          : isLanding
            ? 'border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-elevated)] shadow-[var(--color-card-shadow)] dark:border-white/10 dark:bg-gradient-to-b dark:from-[rgba(7,10,16,0.96)] dark:to-[rgba(8,12,18,0.9)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'border border-[color:var(--color-border-subtle)] bg-[color:var(--ib-surface-card)] shadow-inner',
        isLanding ? (isCompact ? 'p-2.5 pb-3 sm:p-3' : 'p-4 pb-4 sm:p-5') : isCompact ? 'p-2.5 pb-4' : 'p-3 pb-4',
      )}
    >
      <div className={cx('flex flex-col items-center', isLanding ? (isCompact ? 'gap-2' : 'gap-3') : isCompact ? 'gap-1.5' : 'gap-2')}>
        <div className="w-full space-y-2 text-left">
          <p className={cx('font-semibold uppercase', isLanding ? 'text-[11px] tracking-[0.22em] text-[color:var(--color-text-muted)] dark:text-slate-300' : isCompact ? 'text-[13px] tracking-[0.08em] text-[color:var(--color-slate-100)]' : 'text-sm tracking-[0.08em] text-[color:var(--color-slate-100)]')}>
            {language === 'es' ? 'Desarrollo del hábito' : 'Habit development'}
          </p>
          {previewAchievement.consolidationStrength != null && !isLanding && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>
        <div className="mx-auto flex w-full shrink-0 flex-col items-center" data-tour-anchor="achievement-preview-overview">
          <span className={cx('inline-flex items-center rounded-full font-semibold', isLanding ? (isCompact ? 'px-2.5 py-0.5 text-xs' : 'px-4 py-1.5 text-sm') : isCompact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs', tone.chip)}>
            {tone.label[language]}
          </span>
          <div
            className={cx(
              'mt-2 w-full items-center justify-center md:col-start-2 md:justify-self-center',
              isLanding
                ? cx('flex flex-nowrap', isCompact ? 'gap-4 sm:gap-5' : 'gap-8 sm:gap-10')
                : cx('flex', isCompact ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-4', 'flex-wrap sm:flex-nowrap'),
            )}
            data-testid="score-block"
            data-tour-anchor="achievement-preview-score"
          >
            <div className={cx('relative shrink-0', isLanding && 'justify-self-center')} ref={scoreTooltipRef}>
              <svg
                className={isLanding ? (isCompact ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-[8.5rem] w-[8.5rem] sm:h-[9.5rem] sm:w-[9.5rem]') : isCompact ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-24 w-24 sm:h-28 sm:w-28'}
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
                  stroke={tone.ringTrack}
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
                <span className={cx('font-semibold leading-none', isLanding ? (isCompact ? 'text-[48px] text-[color:var(--color-text)] dark:text-slate-50 sm:text-[56px]' : 'text-[60px] text-[color:var(--color-text)] dark:text-slate-50 sm:text-[68px]') : 'text-[30px] text-[color:var(--color-text)] sm:text-[32px]')}>{score}</span>
                <span data-testid="score-affordance" className={cx('mt-1 inline-flex items-center gap-1 uppercase', isLanding ? 'text-[11px] tracking-[0.2em] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-[10px] tracking-[0.12em] text-[color:var(--color-slate-300)]')}>
                  <span className="font-semibold">{scoreLabel}</span>
                  <span className="sr-only">{language === 'es' ? 'fuerza actual del hábito' : 'current habit strength'}</span>
                </span>
              </div>
              {showInfoControls && (
                <div className={cx('absolute left-1/2 inline-flex -translate-x-1/2 items-center gap-1 text-[10px]', isLanding ? 'top-[72%] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'top-[70%] text-[color:var(--color-slate-400)]')}>
                  <button
                    type="button"
                    onClick={() => setIsScoreTooltipOpen((prev) => !prev)}
                    onFocus={() => setIsScoreTooltipOpen(true)}
                    aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
                    className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-white/60 bg-white/20 text-[7px] font-semibold text-white shadow-[0_7px_18px_rgba(8,12,24,0.52)] backdrop-blur-xl sm:h-3.5 sm:w-3.5 sm:text-[8px]"
                    data-testid="score-info-dot"
                    aria-describedby={isScoreTooltipOpen ? scoreTooltipId : undefined}
                  >
                    i
                  </button>
                </div>
              )}
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
            <div className={cx('relative flex items-center px-1 py-1', isLanding ? (isCompact ? 'h-32 sm:h-36' : 'h-[8.5rem] sm:h-[9.5rem]') : isCompact ? 'h-24 sm:h-28' : 'h-32 sm:h-36')} data-testid="score-range-rail" data-tour-anchor="achievement-preview-scale">
              <div className={cx('relative h-full', isLanding ? 'w-[3.6rem]' : isCompact ? 'w-[3.35rem]' : 'w-[3.65rem]')}>
                <div className={cx('absolute bottom-1 top-1 overflow-hidden rounded-full bg-white/10', isLanding ? 'left-4 w-2.5' : 'left-3.5 w-2')}>
                  <button
                    type="button"
                    className="absolute inset-x-0 top-0 h-[20%] bg-emerald-400 focus:outline-none"
                    aria-label={rangeLabels.strong}
                  />
                  <button
                    type="button"
                    className="absolute inset-x-0 top-[20%] h-[30%] bg-amber-400 focus:outline-none"
                    aria-label={rangeLabels.building}
                  />
                  <button
                    type="button"
                    className="absolute inset-x-0 bottom-0 h-[50%] bg-rose-400 focus:outline-none"
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
                <span className={cx('absolute left-0 top-0', isLanding ? 'text-[11px] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-[8px] text-[color:var(--color-slate-400)]')}>100</span>
                <span className={cx('absolute left-0 top-[20%] -translate-y-1/2', isLanding ? 'text-[11px] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-[8px] text-[color:var(--color-slate-300)]')}>80</span>
                <span className={cx('absolute left-0 top-[50%] -translate-y-1/2', isLanding ? 'text-[11px] text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-[8px] text-[color:var(--color-slate-300)]')}>50</span>
                <span className={cx('absolute left-0 bottom-0', isLanding ? 'text-[11px] text-[color:var(--color-text-subtle)] dark:text-slate-400' : 'text-[8px] text-[color:var(--color-slate-500)]')}>0</span>
                <span className={cx('absolute top-[3%] text-left font-medium leading-none text-[color:var(--color-slate-300)]', isLanding ? 'hidden' : isCompact ? 'left-[1.95rem] text-[9px]' : 'left-[2.05rem] text-[9px]')}>
                  {rangeLabels.strong}
                </span>
                <span className={cx('absolute top-[50%] -translate-y-1/2 text-left font-medium leading-none text-[color:var(--color-slate-300)]', isLanding ? 'hidden' : isCompact ? 'left-[1.95rem] text-[9px]' : 'left-[2.05rem] text-[9px]')}>
                  {rangeLabels.building}
                </span>
                <span className={cx('absolute bottom-[3%] text-left font-medium leading-none text-[color:var(--color-slate-300)]', isLanding ? 'hidden' : isCompact ? 'left-[1.95rem] text-[9px]' : 'left-[2.05rem] text-[9px]')}>
                  {rangeLabels.fragile}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cx(isLanding ? (isCompact ? 'mt-1.5 space-y-1.5' : 'mt-3 space-y-2') : isCompact ? 'mt-2.5 space-y-1.5' : 'mt-3 space-y-2')}>
        {orderedRecentMonths.length > 0 && (
          <div className="px-0 py-0" data-tour-anchor="achievement-preview-months-section">
            <div className={cx('flex items-center gap-1.5', isLanding && 'sr-only')}>
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
                <div className="pointer-events-none absolute left-0 top-6 z-10 hidden min-w-[11rem] rounded-lg border border-white/20 bg-[color:var(--ib-surface-card)] p-2 text-[10px] leading-snug text-[color:var(--color-slate-100)] shadow-xl backdrop-blur-sm group-open:block group-hover:block">
                  <p>{language === 'es' ? '✓ = mes fuerte' : '✓ = strong month'}</p>
                  <p>{language === 'es' ? '• = en construcción' : '• = building'}</p>
                  <p>{language === 'es' ? '✕ = mes débil' : '✕ = weak month'}</p>
                  <p>{language === 'es' ? '~ = proyectado al ritmo actual' : '~ = projected at current pace'}</p>
                </div>
              </details>
            </div>
            <div className={cx('w-full overflow-x-auto pb-2 pt-1', isLanding && 'overflow-visible pb-0')} data-testid="recent-timeline" data-tour-anchor="achievement-preview-months">
              <div
	                className={cx(
	                  isLanding
	                    ? 'mx-auto flex w-fit max-w-full items-end gap-2 rounded-[1.7rem] bg-transparent px-4 py-3 sm:gap-3 sm:px-5'
	                    : 'flex items-end gap-0.5 md:gap-1',
                  shouldCenterRecentTimeline ? 'justify-center' : 'justify-start',
                  shouldUseOverflowTrack ? 'min-w-max' : 'w-full',
                )}
                data-testid="recent-timeline-track"
              >
                {leadingMonths.map((entry) => (
                  <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} compact={isCompact} variant={variant} />
                ))}
                {hasGroupedWindow && (
	                  <div
	                    className={cx(
	                      'relative flex items-end gap-0.5 rounded-xl bg-indigo-400/10 px-0.5 pb-1 pt-[1.1rem] shadow-[0_0_18px_rgba(99,102,241,0.12)] sm:gap-1 md:gap-1',
	                      isLanding && 'rounded-none bg-transparent px-0 pb-0 pt-5 shadow-none',
	                    )}
                    data-testid="seal-window-group"
                    data-window-start={lastThreeStart}
                    data-window-end={lastThreeEnd - 1}
                    data-tour-anchor="achievement-preview-active-window"
                  >
	                    {isLanding ? (
	                      <div className="pointer-events-none absolute left-1/2 top-0 flex w-[calc(100%-0.8rem)] -translate-x-1/2 items-center gap-2" aria-hidden>
	                        <span className="h-px flex-1 bg-[color:var(--color-text-muted)]/80 dark:bg-white/25" />
	                        <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)] dark:text-slate-400">
	                          {windowTitle}
	                        </span>
	                        <span className="h-px flex-1 bg-[color:var(--color-text-muted)]/80 dark:bg-white/25" />
	                      </div>
	                    ) : (
	                      <p className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium uppercase tracking-[0.09em] text-[color:var(--color-slate-400)]">
	                        {windowTitle}
	                      </p>
	                    )}
                    {groupedMonths.map((entry) => (
                      <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} compact={isCompact} variant={variant} />
                    ))}
                    {groupedProjectedMonth && <span className={cx('absolute -bottom-3 right-1 text-[9px]', isLanding ? 'text-[color:var(--color-text-muted)] dark:text-slate-300' : 'text-[color:var(--color-slate-400)]')}>{language === 'es' ? 'proyectado' : 'projected'}</span>}
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
