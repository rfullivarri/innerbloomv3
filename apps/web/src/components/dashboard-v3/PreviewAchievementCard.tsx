import { useMemo } from 'react';
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
    return 'bg-sky-300/35 text-sky-100';
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
  return (
    <div
      key={`${entry.key}-${entry.value ?? 0}`}
      data-testid="recent-month-item"
      className="flex h-[4.75rem] min-w-[3.1rem] shrink-0 flex-col items-center gap-0.5 py-0.5 sm:h-[5rem] sm:min-w-[3.35rem]"
    >
      <div
        data-testid="recent-month-node"
        className={cx(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none shadow-[0_6px_16px_rgba(5,10,35,0.35)] sm:h-9 sm:w-9 sm:text-base',
          getMonthTone(entry.state),
        )}
        aria-label={`${entry.periodKey ?? 'unknown'}-${entry.state ?? 'unknown'}`}
        data-month-symbol={getMonthSymbol(entry.state)}
      >
        {getMonthSymbol(entry.state)}
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

  return (
    <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start">
        <div className="space-y-2 md:col-start-1">
          <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', tone.chip)}>
            {tone.label[language]}
          </span>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
            {language === 'es' ? 'Desarrollo del hábito' : 'Habit development'}
          </p>
          {previewAchievement.consolidationStrength != null && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center md:col-start-2 md:justify-self-center" data-testid="score-block">
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
              {language === 'es' ? 'score' : 'score'}
            </text>
          </svg>
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-slate-400)]" data-testid="score-affordance">
            <span className="font-semibold uppercase tracking-[0.12em] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Score' : 'Score'}
            </span>
            <span
              aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
              title={
                language === 'es'
                  ? 'Resume constancia, cumplimiento reciente y tendencia.'
                  : 'Summarizes consistency, recent completion, and trend.'
              }
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 bg-white/20 text-[9px] font-semibold text-white shadow-sm"
              data-testid="score-info-dot"
            >
              i
            </span>
          </p>
        </div>
        <div className="hidden md:block" aria-hidden />
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
                  <p>{language === 'es' ? '~ = proyectado al ritmo actual' : '~ = projected at current pace'}</p>
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
                    className="rounded-xl border border-white/15 bg-white/5 px-0.5 py-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] md:px-1"
                    data-testid="seal-window-group"
                    data-window-start={lastThreeStart}
                    data-window-end={lastThreeEnd - 1}
                  >
                    <div className="flex items-end gap-1 md:gap-1.5" data-testid="seal-window-track">
                      {groupedMonths.map((entry) => (
                        <RecentMonthNode key={`${entry.key}-${entry.value ?? 0}`} entry={entry} language={language} />
                      ))}
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
