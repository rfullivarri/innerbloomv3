import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getStreaks, type StreakSummary } from '../../lib/api';

interface StreakCardProps {
  userId: string;
}

export function StreakCard({ userId }: StreakCardProps) {
  const { data, status, error, reload } = useRequest(() => getStreaks(userId), [userId]);

  return (
    <Card
      title="Streaks"
      subtitle="Consistency drives momentum"
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
      {status === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>Unable to fetch your streaks.</p>
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

      {status === 'success' && data && <StreakMetrics streaks={data} />}

      {status === 'success' && !data && <p className="text-sm text-text-subtle">Streaks syncing…</p>}
    </Card>
  );
}

function StreakMetrics({ streaks }: { streaks: StreakSummary }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-white/5 bg-gradient-to-br from-accent-purple/20 via-accent-blue/20 to-transparent p-4">
        <p className="text-xs uppercase tracking-wide text-text-subtle">Current streak</p>
        <p className="text-3xl font-semibold text-white">{streaks.current} days</p>
        <p className="text-xs text-text-subtle">Keep it alive today to protect your combo.</p>
      </div>
      <div className="rounded-xl border border-white/5 bg-surface-highlight/50 p-4">
        <p className="text-xs uppercase tracking-wide text-text-subtle">Longest streak</p>
        <p className="text-2xl font-semibold text-white">{streaks.longest} days</p>
        <p className="text-xs text-text-subtle">Next tier unlock at {Math.max(streaks.longest + 1, 7)} days.</p>
      </div>
    </div>
  );
}
