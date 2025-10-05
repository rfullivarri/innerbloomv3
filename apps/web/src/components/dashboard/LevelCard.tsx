import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getProgress, type ProgressSummary } from '../../lib/api';

interface LevelCardProps {
  userId: string;
}

function computeProgress(progress: ProgressSummary | null) {
  if (!progress) {
    return { percent: 0, remaining: 0 };
  }
  const xpInto = progress.xpIntoLevel ??
    (progress.nextLevelXp != null && progress.xpToNextLevel != null
      ? Math.max(progress.nextLevelXp - progress.xpToNextLevel, 0)
      : progress.totalXp);
  const xpGoal = progress.nextLevelXp ?? (xpInto + (progress.xpToNextLevel ?? 0));
  const percent = xpGoal ? Math.min(100, Math.round((xpInto / xpGoal) * 100)) : 0;
  const remaining = progress.xpToNextLevel ?? Math.max(xpGoal - xpInto, 0);
  return { percent, remaining };
}

export function LevelCard({ userId }: LevelCardProps) {
  const { data, status, error, reload } = useRequest(() => getProgress(userId), [userId]);
  const { percent, remaining } = computeProgress(data);

  return (
    <Card
      title="Level Progress"
      subtitle="Earn XP by completing your quests"
      action={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text hover:bg-white/10"
        >
          Refresh
        </button>
      }
      className="min-h-[220px]"
    >
      {status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>We couldn’t load your XP right now.</p>
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

      {status === 'success' && data && (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-subtle">Total XP</p>
            <p className="text-3xl font-semibold text-white">{data.totalXp.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white">Level {data.level}</span>
            <span className="text-text-subtle">{remaining} XP to next level</span>
            {data.nextLevelLabel && <span className="text-text-muted">Next: {data.nextLevelLabel}</span>}
          </div>
          <ProgressBar value={percent} label="Progress to next level" />
        </div>
      )}

      {status === 'success' && !data && (
        <div className="space-y-3 text-sm text-text-subtle">
          <p>Progress data is syncing. Check back soon!</p>
        </div>
      )}
    </Card>
  );
}
