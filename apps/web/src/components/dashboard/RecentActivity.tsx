import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getTaskLogs } from '../../lib/api';
import { ActivityItem } from './ActivityItem';

interface RecentActivityProps {
  userId: string;
}

export function RecentActivity({ userId }: RecentActivityProps) {
  const { data, status, error, reload } = useRequest(() => getTaskLogs(userId, { limit: 6 }), [userId]);

  return (
    <Card
      title="Recent Activity"
      subtitle="Every quest completed powers your bloom"
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
        <ul className="grid gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full" />
          ))}
        </ul>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>We can’t show your recent quests right now.</p>
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

      {status === 'success' && data && data.length > 0 && (
        <ul className="grid gap-3">
          {data.map((log) => (
            <ActivityItem key={log.id} log={log} />
          ))}
        </ul>
      )}

      {status === 'success' && (!data || data.length === 0) && (
        <div className="space-y-2 text-sm text-text-subtle">
          <p>No quests logged yet.</p>
          <p className="text-xs text-text-muted">Complete your first task to start the streak.</p>
        </div>
      )}
    </Card>
  );
}
