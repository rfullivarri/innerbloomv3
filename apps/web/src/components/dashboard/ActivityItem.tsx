import type { TaskLog } from '../../lib/api';

interface ActivityItemProps {
  log: TaskLog;
}

function formatTime(isoDate?: string) {
  if (!isoDate) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoDate));
  } catch (error) {
    return isoDate;
  }
}

export function ActivityItem({ log }: ActivityItemProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-surface-muted/60 px-4 py-3">
      <div>
        <p className="font-medium text-white">{log.taskTitle || 'Task completed'}</p>
        <p className="text-xs text-text-subtle">{formatTime(log.completedAt || log.doneAt)}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {log.pillar && <span className="rounded bg-white/5 px-2 py-1">{log.pillar}</span>}
        {log.xpAwarded != null && <span className="rounded bg-accent-purple/20 px-2 py-1 text-accent-purple">+{log.xpAwarded} XP</span>}
      </div>
    </li>
  );
}
