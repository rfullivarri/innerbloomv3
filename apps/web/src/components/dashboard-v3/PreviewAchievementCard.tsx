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
  if (normalized === 'achieved' || normalized === 'valid') {
    return 'bg-emerald-300/90 border-emerald-200';
  }
  if (normalized === 'pending' || normalized === 'building') {
    return 'bg-amber-300/85 border-amber-200';
  }
  return 'bg-white/15 border-white/20';
}

function getMonthTone(state: string | null | undefined): string {
  const normalized = String(state ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') {
    return 'bg-emerald-300';
  }
  if (normalized === 'building' || normalized === 'pending') {
    return 'bg-amber-300';
  }
  return 'bg-rose-300/80';
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
          {previewAchievement.consolidationStrength != null && (
            <p className="text-[11px] text-[color:var(--color-slate-300)]">
              {language === 'es' ? 'Consolidación' : 'Consolidation'} · {Math.max(0, Math.min(100, Math.round(previewAchievement.consolidationStrength)))}%
            </p>
          )}
        </div>

        <svg className="h-24 w-24 shrink-0" viewBox="0 0 120 120" role="img" aria-label={`preview achievement score ${score}`}>
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
          <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" className="fill-[color:var(--color-text)] text-[22px] font-semibold">
            {score}
          </text>
        </svg>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-slate-400)]">3M</p>
          <div className="flex items-center gap-1">
            {slots.slice(0, 3).map((slot, index) => (
              <span
                key={slot.id ?? `slot-${index}`}
                data-testid="window-slot"
                className={cx('h-2.5 w-10 rounded-full border', getSlotTone(slot.state))}
                aria-label={slot.label ?? `slot-${index + 1}`}
              />
            ))}
          </div>
        </div>

        {recentMonths.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[color:var(--color-overlay-2)] px-2 py-2">
            <div className="flex items-end justify-between gap-2">
              {recentMonths.slice(-4).map((entry) => {
                const ratio = Math.min(1, Math.max(0, Number(entry.value ?? 0) / 100));
                const height = 10 + ratio * 30;
                return (
                  <div key={`${entry.month}-${entry.value ?? 0}`} data-testid="recent-month-item" className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="flex h-11 w-full items-end justify-center rounded-full bg-white/5">
                      <span
                        className={cx('w-3 rounded-full', getMonthTone(entry.state))}
                        style={{ height }}
                        aria-label={`${entry.month}-${entry.value ?? 0}`}
                      />
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

