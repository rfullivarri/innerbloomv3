import { useMemo } from 'react';
import type { TaskInsightsResponse } from '../../lib/api';
import type { PostLoginLanguage } from '../../i18n/postLoginLanguage';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type PreviewAchievement = NonNullable<TaskInsightsResponse['previewAchievement']>;

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

function getSlotTone(slotState: string | null | undefined): string {
  const normalized = String(slotState ?? '').toLowerCase();
  if (normalized === 'achieved' || normalized === 'valid' || normalized === 'projected_valid') {
    return 'border-emerald-200 bg-emerald-300/90 text-emerald-950';
  }
  if (normalized === 'floor_only' || normalized === 'building' || normalized === 'pending') {
    return 'border-amber-200 bg-amber-300/85 text-amber-950';
  }
  if (normalized === 'projected_floor_only' || normalized === 'projected_pending') {
    return 'border-amber-100/80 bg-amber-200/45 text-amber-100';
  }
  if (normalized === 'projected_invalid' || normalized === 'invalid' || normalized === 'locked') {
    return 'border-rose-200/70 bg-rose-300/45 text-rose-50';
  }
  return 'border-white/20 bg-white/10 text-[color:var(--color-slate-300)]';
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

function getSlotSymbol(slotState: string | null | undefined): string {
  const normalized = String(slotState ?? '').toLowerCase();
  if (normalized === 'achieved' || normalized === 'valid') return '✓';
  if (normalized === 'projected_valid' || normalized === 'projected_floor_only' || normalized === 'projected_pending') return '~';
  if (normalized === 'floor_only' || normalized === 'building' || normalized === 'pending') return '•';
  if (normalized === 'invalid' || normalized === 'projected_invalid' || normalized === 'locked') return '✕';
  return '○';
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
  const slots = previewAchievement.windowProximity?.slots ?? [];
  const recentMonths = previewAchievement.recentMonths ?? [];

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
            <span>{language === 'es' ? 'fuerza actual' : 'current strength'}</span>
            <span
              aria-label={language === 'es' ? 'Qué significa este score' : 'What this score means'}
              title={language === 'es' ? 'Score de fuerza del hábito actual.' : 'Current habit strength score.'}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/30 text-[9px]"
            >
              i
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-xl border border-white/10 bg-[color:var(--color-overlay-2)] px-2 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-slate-400)]">3M</p>
            <p className="text-[10px] text-[color:var(--color-slate-400)]">{language === 'es' ? 'ventana activa' : 'active window'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {slots.slice(0, 3).map((slot, index) => (
              <div key={slot.id ?? `slot-${index}`} className="flex min-w-0 flex-1 items-center gap-1">
                {index > 0 ? <span aria-hidden className="h-px flex-1 bg-white/15" /> : null}
                <span
                  data-testid="window-slot"
                  className={cx(
                    'inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full border px-2 text-[11px] font-semibold',
                    getSlotTone(slot.state),
                  )}
                  aria-label={slot.label ?? `slot-${index + 1}`}
                  data-slot-symbol={getSlotSymbol(slot.state)}
                >
                  {getSlotSymbol(slot.state)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {recentMonths.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[color:var(--color-overlay-2)] px-2 py-2">
            <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">
              {language === 'es' ? 'Meses recientes' : 'Recent months'}
            </p>
            <div className="flex items-end justify-between gap-1.5">
              {recentMonths.slice(-4).map((entry) => {
                return (
                  <div key={`${entry.month}-${entry.value ?? 0}`} data-testid="recent-month-item" className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className={cx(
                        'inline-flex h-8 w-full items-center justify-center rounded-lg border text-[11px] font-semibold',
                        getMonthTone(entry.state),
                      )}
                      aria-label={`${entry.month}-${entry.state ?? 'unknown'}`}
                      data-month-symbol={getMonthSymbol(entry.state)}
                    >
                      {getMonthSymbol(entry.state)}
                    </div>
                    <span className="text-[10px] text-[color:var(--color-slate-400)]">{monthLabel(entry.month, language)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
