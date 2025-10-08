import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getAchievements, type Achievement } from '../../lib/api';

interface AchievementsListProps {
  userId: string;
}

export function AchievementsList({ userId }: AchievementsListProps) {
  const { data, status, error, reload } = useRequest(() => getAchievements(userId), [userId], {
    enabled: Boolean(userId),
  });

  const achievements = data?.achievements ?? [];

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
      className="h-full"
    >
      {(status === 'idle' || status === 'loading') && <AchievementSkeleton />}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>We couldn’t load your achievements.</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:border-rose-200/70"
          >
            Try again
          </button>
          <p className="text-xs text-text-subtle">{error?.message}</p>
        </div>
      )}

      {status === 'success' && achievements.length > 0 && (
        <ul className="space-y-4">
          {achievements.map((achievement) => (
            <AchievementItem key={achievement.id} achievement={achievement} />
          ))}
        </ul>
      )}

      {status === 'success' && achievements.length === 0 && (
        <div className="space-y-3 text-sm text-text-subtle">
          <p>No achievements yet—keep logging quests to ignite your streaks.</p>
          <p className="text-xs text-text-muted">Daily wins power these milestones. Check back after your next streak or level up.</p>
        </div>
      )}
    </Card>
  );
}

function AchievementSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((key) => (
        <div key={key} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function AchievementItem({ achievement }: { achievement: Achievement }) {
  const { progress } = achievement;
  const safePct = Number.isFinite(progress.pct) ? progress.pct : 0;
  const isUnlocked = progress.current >= progress.target && progress.target > 0;
  const statusLabel = isUnlocked ? 'Unlocked' : 'In progress';
  const formattedEarnedDate = formatDate(achievement.earnedAt);
  const detailLabel = isUnlocked
    ? formattedEarnedDate
      ? `Unlocked on ${formattedEarnedDate}`
      : 'Milestone reached — tracking begins soon.'
    : `Progress ${Math.round(progress.current)} / ${progress.target}`;

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{achievement.name}</p>
          <p className="text-xs text-text-subtle">{detailLabel}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isUnlocked
              ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
              : 'border border-white/10 bg-white/5 text-text-subtle'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4">
        <ProgressBar value={safePct} />
      </div>

      <p className="mt-2 text-xs text-text-muted">
        {Math.round(progress.current)} / {progress.target} complete • {safePct.toFixed(1)}%
      </p>
    </li>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
