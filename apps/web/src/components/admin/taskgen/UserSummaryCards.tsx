import type { TaskgenUserOverview } from '../../../lib/types';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type UserSummaryCardsProps = {
  overview: TaskgenUserOverview | null;
  loading?: boolean;
};

function formatDate(value: string | null | undefined): string {
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

export function UserSummaryCards({ overview, loading = false }: UserSummaryCardsProps) {
  const successRate = overview ? Math.round(overview.successRate * 1000) / 10 : 0;
  const latestJob = overview?.latestJob ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Jobs totales</p>
        <div className="mt-2 text-3xl font-bold text-slate-50">
          {loading ? <span className="block h-8 w-16 animate-pulse rounded bg-slate-800/80" /> : overview?.totalJobs ?? 0}
        </div>
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tasa de éxito</p>
        <div className="mt-2 text-3xl font-bold text-emerald-300">
          {loading ? (
            <span className="block h-8 w-20 animate-pulse rounded bg-slate-800/80" />
          ) : (
            `${successRate.toFixed(1)}%`
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">COMPLETED / total</p>
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Último estado</p>
        <div className="mt-2 text-2xl font-semibold text-slate-100">
          {loading ? <span className="block h-7 w-28 animate-pulse rounded bg-slate-800/80" /> : overview?.lastJobStatus ?? '–'}
        </div>
        <p className="mt-1 text-xs text-slate-400">{formatDate(overview?.lastJobCreatedAt)}</p>
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última tarea insertada</p>
        <div className="mt-2 text-2xl font-semibold text-slate-100">
          {loading ? (
            <span className="block h-7 w-32 animate-pulse rounded bg-slate-800/80" />
          ) : (
            formatDate(overview?.lastTaskInsertedAt)
          )}
        </div>
      </article>

      {latestJob ? (
        <article className="lg:col-span-4 rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Último job</p>
          <div className="mt-2 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-xs uppercase text-slate-500">Job ID</span>
              <p className="break-all font-mono text-slate-100">{latestJob.id}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">Status</span>
              <p className="font-semibold text-slate-100">{latestJob.status}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">Modo</span>
              <p className="font-semibold text-slate-100">{latestJob.mode ?? '–'}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">Tasks insertadas</span>
              <p className="font-semibold text-slate-100">{latestJob.tasksInserted ?? '–'}</p>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
