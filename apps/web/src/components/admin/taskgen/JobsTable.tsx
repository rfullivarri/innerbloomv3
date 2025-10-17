import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TaskgenJob } from '../../../lib/types';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const DURATION_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

type JobsTableProps = {
  jobs: TaskgenJob[];
  loading?: boolean;
  total: number;
  hasMore: boolean;
  retryingJobId?: string | null;
  onLoadMore?: () => void;
  onViewLogs: (job: TaskgenJob) => void;
  onRetry?: (job: TaskgenJob) => void;
  onCopyCorrelation?: (job: TaskgenJob) => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '–';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return DATE_TIME_FORMATTER.format(date);
  } catch {
    return value;
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) {
    return '–';
  }

  if (ms < 1_000) {
    return `${Math.round(ms)} ms`;
  }

  const seconds = ms / 1_000;
  if (seconds < 60) {
    return `${DURATION_FORMATTER.format(seconds)} s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${DURATION_FORMATTER.format(minutes)} min`;
  }

  const hours = minutes / 60;
  return `${DURATION_FORMATTER.format(hours)} h`;
}

function statusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'COMPLETED':
      return 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30';
    case 'FAILED':
    case 'ERROR':
      return 'bg-red-500/20 text-red-100 border border-red-500/30';
    case 'STARTED':
    case 'RUNNING':
      return 'bg-amber-500/20 text-amber-100 border border-amber-500/30';
    case 'QUEUED':
    case 'PENDING':
      return 'bg-slate-700/50 text-slate-200 border border-slate-600/60';
    default:
      return 'bg-slate-800/80 text-slate-200 border border-slate-700/60';
  }
}

function modeBadgeClass(mode: string | null | undefined): string {
  switch ((mode ?? '').toUpperCase()) {
    case 'LOW':
      return 'bg-blue-500/20 text-blue-100 border border-blue-500/30';
    case 'CHILL':
      return 'bg-teal-500/20 text-teal-100 border border-teal-500/30';
    case 'FLOW':
      return 'bg-sky-500/20 text-sky-100 border border-sky-500/30';
    case 'EVOLVE':
      return 'bg-purple-500/20 text-purple-100 border border-purple-500/30';
    default:
      return 'bg-slate-800/80 text-slate-200 border border-slate-700/60';
  }
}

const GRID_TEMPLATE =
  'grid-cols-[minmax(160px,1.3fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_minmax(130px,0.9fr)_minmax(100px,0.6fr)_minmax(140px,1fr)_minmax(220px,1fr)]';

export function JobsTable({
  jobs,
  loading = false,
  total,
  hasMore,
  retryingJobId = null,
  onLoadMore,
  onViewLogs,
  onRetry,
  onCopyCorrelation,
}: JobsTableProps) {

  const emptyState = useMemo(() => {
    if (loading) {
      return 'Cargando jobs…';
    }

    if (jobs.length === 0) {
      return 'No hay jobs para los filtros seleccionados.';
    }

    return null;
  }, [jobs.length, loading]);

  const header = (
    <div
      className={`grid ${GRID_TEMPLATE} gap-3 border-b border-slate-800/60 bg-slate-900/90 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400`}
    >
      <span>Creado</span>
      <span>Usuario</span>
      <span>Modo</span>
      <span>Status</span>
      <span>Tasks</span>
      <span>Error</span>
      <span>Acciones</span>
    </div>
  );

  const renderRowContent = (job: TaskgenJob) => (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-100">{formatDateTime(job.createdAt)}</span>
        <span className="text-xs text-slate-400">Duración: {formatDuration(job.durationMs)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Link
          to={`/admin/users/${encodeURIComponent(job.userId)}/taskgen`}
          className="font-medium text-sky-200 hover:text-sky-100"
        >
          {job.userEmail ?? job.userId}
        </Link>
        {job.userEmail ? (
          <span className="break-all text-xs text-slate-500">{job.userId}</span>
        ) : null}
      </div>
      <div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${modeBadgeClass(job.mode)}`}>
          {job.mode ? job.mode.toUpperCase() : '–'}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(job.status)}`}
        >
          {job.status.toUpperCase()}
        </span>
        {job.completedAt ? (
          <span className="text-xs text-slate-400">Completado: {formatDateTime(job.completedAt)}</span>
        ) : job.startedAt ? (
          <span className="text-xs text-slate-400">Iniciado: {formatDateTime(job.startedAt)}</span>
        ) : null}
      </div>
      <div className="font-semibold text-slate-100">{job.tasksInserted ?? '–'}</div>
      <div className="text-sm text-slate-200">{job.errorCode ?? '–'}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          onClick={() => onViewLogs(job)}
        >
          Ver logs
        </button>
        {onRetry ? (
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRetry(job)}
            disabled={retryingJobId === job.id}
          >
            {retryingJobId === job.id ? 'Reintentando…' : 'Reintentar'}
          </button>
        ) : null}
        {onCopyCorrelation ? (
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            onClick={() => onCopyCorrelation(job)}
          >
            Copiar ID
          </button>
        ) : null}
      </div>
    </>
  );

  const rowClass = `relative grid ${GRID_TEMPLATE} items-start gap-3 border-b border-slate-800/40 bg-slate-950/60 px-4 py-4 text-sm text-slate-200`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Mostrando <strong className="text-slate-200">{jobs.length}</strong> de{' '}
          <strong className="text-slate-200">{total}</strong> jobs
        </span>
        {hasMore && onLoadMore ? (
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            onClick={onLoadMore}
            disabled={loading}
          >
            Cargar más
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/80 shadow-slate-950/20">
        {header}
        {emptyState ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">{emptyState}</div>
        ) : (
          <div>
            {jobs.map((job) => (
              <div key={job.id} className={rowClass}>
                {renderRowContent(job)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
