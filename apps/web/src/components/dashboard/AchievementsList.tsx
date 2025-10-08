import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getAchievements, type Achievement } from '../../lib/api';

interface AchievementsListProps {
  userId: string;
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function formatStatusLabel(status?: string, unlockedAt?: string) {
  if (!status && !unlockedAt) {
    return null;
  }

  if (status) {
    const normalized = status.replace(/[_-]+/g, ' ').trim();
    const capitalized = normalized
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return capitalized || null;
  }

  if (unlockedAt) {
    try {
      const date = new Date(unlockedAt);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
        }).format(date);
      }
    } catch (error) {
      console.warn('Failed to format unlocked date', error);
    }
  }

  return null;
}

function AchievementItem({ achievement }: { achievement: Achievement }) {
  const { title, description, unlockedAt, status, progressCurrent, progressTarget, category } = achievement;

  const statusLabel = formatStatusLabel(status, unlockedAt);

  const showProgress = progressCurrent != null && progressTarget != null && progressTarget > 0;
  const completionRatio = showProgress ? Math.min(1, Math.max(0, progressCurrent / progressTarget)) : null;
  const progressPercent = completionRatio != null ? Math.round(completionRatio * 100) : null;

  return (
    <li className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-white">{title}</p>
          {description && <p className="text-xs text-text-subtle">{description}</p>}
          {category && <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{category}</p>}
        </div>
        {statusLabel && <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">{statusLabel}</span>}
      </div>

      {showProgress && (
        <div className="space-y-1 text-xs text-text-subtle">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-text-muted">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-400/80"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p>
            {numberFormatter.format(progressCurrent ?? 0)} / {numberFormatter.format(progressTarget ?? 0)}
          </p>
        </div>
      )}
    </li>
  );
}

export function AchievementsList({ userId }: AchievementsListProps) {
  const { data, status, error, reload } = useRequest(() => getAchievements(userId), [userId], {
    enabled: Boolean(userId),
  });

  const achievements = (data ?? []).filter((item) => Boolean(item?.id)) as Achievement[];

  return (
    <Card
      title="Achievements"
      subtitle="Celebrate milestones as you unlock them"
      action={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text hover:bg-white/10"
        >
          Refresh
        </button>
      }
    >
      {status === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>Achievements are warming up. Please try again.</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:border-rose-200/70"
          >
            Retry
          </button>
          <p className="text-xs text-text-subtle">{error?.message}</p>
        </div>
      )}

      {status === 'success' && achievements.length > 0 && (
        <ul className="space-y-3">
          {achievements.map((achievement) => (
            <AchievementItem key={achievement.id} achievement={achievement} />
          ))}
        </ul>
      )}

      {status === 'success' && achievements.length === 0 && (
        <div className="space-y-2 text-sm text-text-subtle">
          <p>No achievements yet.</p>
          <p className="text-xs text-text-muted">Complete quests and rituals to unlock your first badges.</p>
        </div>
      )}
    </Card>
  );
}
