import type { TaskgenJobsSummary } from '../../../lib/types';

const DURATION_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

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

type KpiCardsProps = {
  summary: TaskgenJobsSummary | null;
  loading?: boolean;
  totalLabel?: string;
};

export function KpiCards({ summary, loading = false, totalLabel = 'Jobs hoy' }: KpiCardsProps) {
  const total = summary?.total ?? 0;
  const successRate = summary ? Math.round(summary.successRate * 1000) / 10 : 0;
  const openAiErrors = summary?.errorCounts?.OPENAI_FAILED ?? 0;
  const validationErrors = summary?.errorCounts?.VALIDATION_FAILED ?? 0;
  const otherErrors = summary
    ? Object.entries(summary.errorCounts).reduce((acc, [code, count]) => {
        if (code === 'OPENAI_FAILED' || code === 'VALIDATION_FAILED') {
          return acc;
        }
        return acc + count;
      }, 0)
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-md shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{totalLabel}</p>
        <div className="mt-2 text-3xl font-bold text-slate-50">
          {loading ? <span className="block h-8 w-16 animate-pulse rounded bg-slate-800/80" /> : total}
        </div>
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-md shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">% éxito</p>
        <div className="mt-2 text-3xl font-bold text-emerald-300">
          {loading ? (
            <span className="block h-8 w-20 animate-pulse rounded bg-slate-800/80" />
          ) : (
            `${successRate.toFixed(1)}%`
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">COMPLETED / total</p>
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-md shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Errores por tipo</p>
        {loading ? (
          <div className="mt-2 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-800/80" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-800/80" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-800/80" />
          </div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li className="flex items-center justify-between">
              <span className="text-slate-400">OPENAI_FAILED</span>
              <span className="font-semibold text-slate-100">{openAiErrors}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">VALIDATION_FAILED</span>
              <span className="font-semibold text-slate-100">{validationErrors}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">Otros</span>
              <span className="font-semibold text-slate-100">{otherErrors}</span>
            </li>
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-md shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duraciones</p>
        {loading ? (
          <div className="mt-2 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-800/80" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-800/80" />
          </div>
        ) : (
          <div className="mt-2 space-y-1 text-sm text-slate-200">
            <p>
              <span className="text-slate-400">Promedio:</span>{' '}
              <span className="font-semibold text-slate-100">{formatDuration(summary?.averageDurationMs ?? null)}</span>
            </p>
            <p>
              <span className="text-slate-400">P95:</span>{' '}
              <span className="font-semibold text-slate-100">{formatDuration(summary?.p95DurationMs ?? null)}</span>
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
