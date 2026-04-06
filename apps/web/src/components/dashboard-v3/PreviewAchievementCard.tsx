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
  value?: number | null;
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

  return {
    key: periodKey ?? `unknown-${index}`,
    sortKey,
    periodKey,
    state: entry.state,
    value: entry.value ?? null,
  };
}

function normalizeRecentMonths(recentMonths: PreviewAchievement['recentMonths']): NormalizedRecentMonth[] {
  const list = Array.isArray(recentMonths) ? recentMonths : [];
  return list
    .map(normalizeRecentMonthEntry)
    .filter((entry): entry is NormalizedRecentMonth => entry != null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-7);
}

function getMonthTone(state: string | null | undefined): string {
  const normalized = String(state ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') {
    return 'border-emerald-200/80 bg-emerald-300/90 text-emerald-950';
  }
  if (normalized === 'building' || normalized === 'pending' || normalized === 'weak' || normalized === 'floor_only') {
    return 'border-amber-200/80 bg-amber-300/85 text-amber-950';
  }
  if (normalized.startsWith('projected')) {
    return 'border-sky-200/70 bg-sky-300/35 text-sky-100';
  }
  if (normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') {
    return 'border-rose-200/80 bg-rose-300/80 text-rose-950';
  }
  return 'border-white/20 bg-white/10 text-[color:var(--color-slate-300)]';
}

function getMonthSymbol(monthState: string | null | undefined): string {
  const normalized = String(monthState ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') return '✓';
  if (normalized === 'building' || normalized === 'pending' || normalized === 'weak' || normalized === 'floor_only') return '•';
  if (normalized.startsWith('projected')) return '~';
  if (normalized === 'invalid' || normalized === 'bad' || normalized === 'locked') return '✕';
  return '○';
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
  const olderMonths = orderedRecentMonths.slice(0, lastThreeStart);
  const sealWindowMonths = orderedRecentMonths.slice(lastThreeStart);

  const ring = useMemo(() => {
    const radius = 47;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);
    return { radius, circumference, offset };
  }, [score]);

  return (
    <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', tone.chip)}>
            {tone.label[language]}
          </span>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
            {language === 'es' ? 'Camino al sello' : 'Seal path'}
          </p>
          {previewAchievement.consolidationStrength != null && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center">
          <svg className="h-20 w-20 sm:h-24 sm:w-24" viewBox="0 0 120 120" role="img" aria-label={`preview achievement score ${score}`}>
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
            <text x="60" y="56" textAnchor="middle" dominantBaseline="middle" className="fill-[color:var(--color-text)] text-[24px] font-semibold">
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
            <span aria-hidden>·</span>
            <span>{language === 'es' ? 'fuerza actual del hábito' : 'current habit strength'}</span>
            <span
              aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
              title={language === 'es' ? 'Mide la fuerza actual del hábito.' : 'Shows current habit strength.'}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/30 text-[9px]"
            >
              i
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {orderedRecentMonths.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[color:var(--color-overlay-2)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
              {language === 'es' ? 'Historial reciente' : 'Recent history'}
            </p>
            <p className="mb-2 text-[10px] text-[color:var(--color-slate-400)]" data-testid="timeline-window-subtitle">
              {language === 'es' ? 'Los últimos 3 meses cuentan para el sello' : 'The last 3 months count toward the seal'}
            </p>
            <div className="flex items-start gap-2 overflow-x-auto pb-1" data-testid="recent-timeline">
              {olderMonths.map((entry) => (
                <div key={`${entry.key}-${entry.value ?? 0}`} data-testid="recent-month-item" className="flex min-w-[2.5rem] flex-col items-center gap-1">
                  <div
                    data-testid="recent-month-node"
                    className={cx(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold shadow-inner sm:h-10 sm:w-10',
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
                </div>
              ))}

              <div
                className="flex items-start gap-2 rounded-2xl border border-white/15 bg-white/5 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                data-testid="seal-window-group"
              >
                {sealWindowMonths.map((entry) => (
                  <div key={`${entry.key}-${entry.value ?? 0}`} data-testid="recent-month-item" className="flex min-w-[2.5rem] flex-col items-center gap-1">
                    <div
                      data-testid="recent-month-node"
                      className={cx(
                        'inline-flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold shadow-inner sm:h-10 sm:w-10',
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
