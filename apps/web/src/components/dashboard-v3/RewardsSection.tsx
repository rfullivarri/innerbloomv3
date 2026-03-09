import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { useRequest } from '../../hooks/useRequest';
import { getAchievements, type Achievement, type WeeklyWrappedRecord } from '../../lib/api';
import type { WeeklyWrappedPayload } from '../../lib/weeklyWrapped';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { resolveEmotionCopy } from '../../config/emotionMessages';

interface RewardsSectionProps {
  userId: string;
  weeklyWrappedCurrent?: WeeklyWrappedRecord | null;
  weeklyWrappedPrevious?: WeeklyWrappedRecord | null;
  onOpenWeeklyWrapped?: (record?: WeeklyWrappedRecord | null) => void;
}

function parseDateKey(dateKey: string): Date {
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function getStartOfWeekUtc(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = copy.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - daysSinceMonday);
  return copy;
}

function isSameUtcWeek(dateKey: string, reference: Date): boolean {
  const referenceStart = getStartOfWeekUtc(reference);
  const targetStart = getStartOfWeekUtc(parseDateKey(dateKey));
  return referenceStart.getTime() === targetStart.getTime();
}

export function RewardsSection({
  userId,
  weeklyWrappedCurrent,
  weeklyWrappedPrevious,
  onOpenWeeklyWrapped,
}: RewardsSectionProps) {
  const { language, t } = usePostLoginLanguage();
  const { data, status, error, reload } = useRequest(() => getAchievements(userId), [userId], {
    enabled: Boolean(userId),
  });

  const achievements = data?.achievements ?? [];

  const { visibleAchievements, hasMockedAchievements } = useMemo(() => {
    if (achievements.length === 0) {
      return { visibleAchievements: [], hasMockedAchievements: false };
    }

    const mockIds = new Set(['ach_streak_7', 'ach_level_5']);
    const mockNames = new Set(['7-Day Flame', 'Level 5']);

    const isMocked = achievements.every((achievement) => {
      const normalizedName = achievement.name?.trim() ?? '';
      return mockIds.has(achievement.id) || (normalizedName && mockNames.has(normalizedName));
    });

    return {
      visibleAchievements: isMocked ? [] : achievements,
      hasMockedAchievements: isMocked,
    };
  }, [achievements]);

  const weeklyWrappedItems = useMemo(() => {
    const items: { label: string; record: WeeklyWrappedRecord }[] = [];
    if (weeklyWrappedCurrent) {
      const isCurrentWeek = isSameUtcWeek(weeklyWrappedCurrent.weekEnd, new Date());
      items.push({
        label: isCurrentWeek ? t('dashboard.rewards.currentWeek') : t('dashboard.rewards.latestWeek'),
        record: weeklyWrappedCurrent,
      });
    }
    if (weeklyWrappedPrevious && weeklyWrappedPrevious.id !== weeklyWrappedCurrent?.id) {
      items.push({ label: t('dashboard.rewards.previousWeek'), record: weeklyWrappedPrevious });
    }
    return items;
  }, [t, weeklyWrappedCurrent, weeklyWrappedPrevious]);

  const { unlockedCount, inProgressCount } = useMemo(() => {
    let unlocked = 0;
    let inProgress = 0;

    for (const achievement of visibleAchievements) {
      const target = Math.max(0, achievement.progress.target ?? 0);
      const current = Math.max(0, achievement.progress.current ?? 0);
      const isUnlocked = target === 0 ? current > 0 : current >= target;
      if (isUnlocked) {
        unlocked += 1;
      } else {
        inProgress += 1;
      }
    }

    return { unlockedCount: unlocked, inProgressCount: inProgress };
  }, [visibleAchievements]);

  const showSkeleton = status === 'idle' || status === 'loading';
  const showError = status === 'error';
  const showContent = status === 'success';

  return (
    <Card
      title="🎁 Rewards"
      subtitle={t('dashboard.rewards.subtitle')}
      rightSlot={
        <button
          type="button"
          onClick={reload}
          disabled={status === 'loading'}
          className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] disabled:opacity-60"
        >
          {t('dashboard.rewards.update')}
        </button>
      }
      bodyClassName="gap-5"
    >
      {showSkeleton && <RewardsSkeleton />}

      {showError && (
        <div className="space-y-3 text-sm text-rose-200">
          <p>{t('dashboard.rewards.loadError')}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/70 hover:text-rose-50"
          >
            {t('dashboard.rewards.retry')}
          </button>
          {error?.message && <p className="text-xs text-rose-200/70">{error.message}</p>}
        </div>
      )}

      {showContent && (
        <div className="space-y-5">
          <WeeklyWrappedShelf
            items={weeklyWrappedItems}
            onOpen={onOpenWeeklyWrapped}
            language={language}
          />
          {!hasMockedAchievements && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <RewardsSummaryCard label={t('dashboard.rewards.completed')} value={unlockedCount} accent="emerald" />
                <RewardsSummaryCard label={t('dashboard.rewards.inProgress')} value={inProgressCount} accent="sky" />
              </div>

              {visibleAchievements.length > 0 ? (
                <ul className="space-y-4">
                  {visibleAchievements.map((achievement) => (
                    <RewardsAchievementItem key={achievement.id} achievement={achievement} language={language} t={t} />
                  ))}
                </ul>
              ) : (
                <div className="ib-card-contour-shadow space-y-2 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-5 text-sm text-[color:var(--color-slate-300)]">
                  <p>{t('dashboard.rewards.emptyTitle')}</p>
                  <p className="text-xs text-[color:var(--color-slate-400)]">
                    {t('dashboard.rewards.emptyDescription')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function RewardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="ib-card-contour-shadow h-24 animate-pulse rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="ib-card-contour-shadow h-20 animate-pulse rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]" />
        ))}
      </div>
    </div>
  );
}

type WeeklyWrappedShelfProps = {
  items: { label: string; record: WeeklyWrappedRecord }[];
  onOpen?: (record?: WeeklyWrappedRecord | null) => void;
  language: 'es' | 'en';
};

function WeeklyWrappedShelf({ items, onOpen, language }: WeeklyWrappedShelfProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="ib-card-contour-shadow space-y-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text-dim)]">Weekly Wrapped</p>
          <p className="text-sm text-[color:var(--color-slate-200)]">{language === 'es' ? 'Tus últimos resúmenes de 7 días' : 'Your latest 7-day summaries'}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <WeeklyWrappedCard key={item.record.id} label={item.label} record={item.record} onOpen={onOpen} language={language} />
        ))}
      </div>
    </div>
  );
}

function WeeklyWrappedCard({
  label,
  record,
  onOpen,
  language,
}: {
  label: string;
  record: WeeklyWrappedRecord;
  onOpen?: (record?: WeeklyWrappedRecord | null) => void;
  language: 'es' | 'en';
}) {
  const weeklyEmotion = record.payload.emotions.weekly ?? record.payload.emotions.biweekly;
  const pillarDominant = record.payload.summary.pillarDominant;
  const weekRangeLabel = formatWeekRange(record.payload, language).toUpperCase();
  const weeklyEmotionLabel = weeklyEmotion ? resolveEmotionCopy(language, weeklyEmotion.key).label : null;

  return (
    <div className="ib-card-contour-shadow flex flex-col gap-3 rounded-xl border border-[color:var(--color-border-subtle)] bg-[image:var(--glass-bg)] p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-400)]">
            {label}
          </p>
          <div className="shrink-0">
            <WeeklyChip icon="📅" label={weekRangeLabel} variant="accent" size="small" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <WeeklyChip
            color={weeklyEmotion?.color}
            srLabel={weeklyEmotionLabel ?? (language === 'es' ? 'Sin emoción dominante' : 'No dominant emotion')}
          />
          {pillarDominant ? <WeeklyChip icon={getPillarIcon(pillarDominant)} variant="outline" /> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen?.(record)}
        className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text)] transition hover:-translate-y-0.5 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)] hover:text-[color:var(--color-text)]"
      >
        {language === 'es' ? 'Ver detalles' : 'View details'}
      </button>
    </div>
  );
}

function WeeklyChip({
  icon,
  label,
  color,
  variant = 'neutral',
  size = 'default',
  srLabel,
}: {
  icon?: string | null;
  label?: string;
  color?: string;
  variant?: 'neutral' | 'accent' | 'outline';
  size?: 'default' | 'small';
  srLabel?: string;
}) {
  const palette =
    variant === 'accent'
      ? 'ib-reward-chip-accent border-emerald-300/60 bg-emerald-400/10 text-emerald-50'
      : variant === 'outline'
        ? 'border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]'
        : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-muted)]';

  const sizeClasses =
    size === 'small' ? 'gap-1 px-2 py-0.5 text-[8.5px]' : 'gap-2 px-3 py-1 text-[11px]';
  const iconClasses = size === 'small' ? 'text-[12px] leading-none' : 'text-base leading-none';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.18em] ${palette} ${sizeClasses}`}
    >
      {icon ? (
        <span aria-hidden className={iconClasses}>
          {icon}
        </span>
      ) : null}
      {color ? <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label ? <span className="leading-none">{label}</span> : null}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </span>
  );
}

function getEmotionEmoji(key?: string | null): string {
  if (!key) return '✨';
  const map: Record<string, string> = {
    felicidad: '✨',
    motivacion: '🔥',
    calma: '🧘',
    cansancio: '😴',
    ansiedad: '😰',
    tristeza: '😢',
    frustracion: '😤',
  };
  return map[key.toLowerCase()] ?? '✨';
}

function getPillarIcon(pillar?: string | null): string {
  const normalized = normalizePillar(pillar);
  if (!normalized) return '';
  const icons: Record<'Body' | 'Mind' | 'Soul', string> = {
    Body: '🫀',
    Mind: '🧠',
    Soul: '🏵️',
  };
  return icons[normalized] ?? '';
}

function normalizePillar(value?: string | null): 'Body' | 'Mind' | 'Soul' | null {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'body' || normalized === 'cuerpo' || normalized === '1') return 'Body';
  if (normalized === 'mind' || normalized === 'mente' || normalized === '2') return 'Mind';
  if (normalized === 'soul' || normalized === 'alma' || normalized === '3') return 'Soul';
  return null;
}

function formatWeekRange(payload: WeeklyWrappedPayload, language: 'es' | 'en'): string {
  const start = new Date(payload.weekRange.start);
  const end = new Date(payload.weekRange.end);
  const locale = language === 'es' ? 'es-AR' : 'en-US';
  return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
}

function RewardsAchievementItem({ achievement, language, t }: { achievement: Achievement; language: 'es' | 'en'; t: (key: string, params?: Record<string, string | number>) => string }) {
  const { progress } = achievement;
  const target = Math.max(0, progress.target ?? 0);
  const current = Math.max(0, progress.current ?? 0);
  const pct = Math.min(100, Math.max(0, progress.pct ?? 0));
  const isUnlocked = target === 0 ? current > 0 : current >= target;
  const statusLabel = isUnlocked ? t('dashboard.rewards.unlocked') : t('dashboard.rewards.inProgress');
  const unlockedDate = formatAchievementDate(achievement.earnedAt ?? achievement.unlockedAt ?? null, language);
  const detailLabel = isUnlocked
    ? unlockedDate
      ? t('dashboard.rewards.reachedOn', { date: unlockedDate })
      : t('dashboard.rewards.newUnlocked')
    : t('dashboard.rewards.progressCompleted', { current: Math.round(current), target });

  return (
    <li className="ib-card-contour-shadow space-y-4 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] text-xl shadow-[0_0_12px_rgba(148,163,184,0.25)] ${
              isUnlocked ? 'ib-reward-unlocked border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : 'text-[color:var(--color-slate-200)]'
            }`}
          >
            {achievement.icon ? (
              <img
                src={achievement.icon}
                alt=""
                className="h-8 w-8 object-contain"
                loading="lazy"
              />
            ) : (
              <span role="img" aria-hidden>
                {isUnlocked ? '🏅' : '🎯'}
              </span>
            )}
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-text)]">{achievement.name}</p>
            <p className="text-xs text-[color:var(--color-slate-400)]">{detailLabel}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            isUnlocked
              ? 'ib-reward-unlocked border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
              : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-muted)]'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <ProgressBar value={pct} />

      {achievement.description ? (
        <p className="text-xs text-[color:var(--color-slate-400)]">{achievement.description}</p>
      ) : null}
    </li>
  );
}

function formatAchievementDate(value: string | null, language: 'es' | 'en'): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return formatter.format(parsed);
}

interface RewardsSummaryCardProps {
  label: string;
  value: number;
  accent: 'emerald' | 'sky';
}

function RewardsSummaryCard({ label, value, accent }: RewardsSummaryCardProps) {
  const accentClasses =
    accent === 'emerald'
      ? 'ib-reward-summary-emerald border-emerald-300/50 bg-emerald-400/10 text-emerald-100'
      : 'ib-reward-summary-sky border-sky-400/40 bg-sky-400/10 text-sky-100';

  return (
    <div
      className={`ib-card-contour-shadow flex flex-col gap-2 rounded-2xl border ${accentClasses} p-4 backdrop-blur`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text-dim)]">{label}</span>
      <span className="text-2xl font-semibold text-[color:var(--color-text)]">{value}</span>
    </div>
  );
}
