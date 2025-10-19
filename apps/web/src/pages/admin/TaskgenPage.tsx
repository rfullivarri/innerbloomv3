import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filters, LIMIT_OPTIONS, type TaskgenFilterState } from '../../components/admin/taskgen/Filters';
import { JobLogsDrawer } from '../../components/admin/taskgen/JobLogsDrawer';
import { JobsTable } from '../../components/admin/taskgen/JobsTable';
import { KpiCards } from '../../components/admin/taskgen/KpiCards';
import {
  fetchTaskgenJobLogs,
  fetchTaskgenJobs,
  retryTaskgenJob,
  type TaskgenJobsParams,
} from '../../lib/api/taskgen';
import type { TaskgenJob, TaskgenJobLog, TaskgenJobsSummary } from '../../lib/types';
import { ToastBanner } from '../../components/common/ToastBanner';

const DEFAULT_FILTERS: TaskgenFilterState = {
  status: 'ALL',
  mode: 'ALL',
  user: '',
  from: null,
  to: null,
  limit: 50,
};

type ToastState = {
  type: 'success' | 'error';
  text: string;
};

function toIsoStart(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toIsoEnd(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

function buildParams(filters: TaskgenFilterState): TaskgenJobsParams {
  const params: TaskgenJobsParams = {
    limit: filters.limit,
  };

  if (filters.status && filters.status !== 'ALL') {
    params.status = filters.status.toUpperCase();
  }

  if (filters.mode && filters.mode !== 'ALL') {
    params.mode = filters.mode.toUpperCase();
  }

  if (filters.user.trim()) {
    params.user = filters.user.trim();
  }

  if (filters.from) {
    params.from = toIsoStart(filters.from);
  }

  if (filters.to) {
    params.to = toIsoEnd(filters.to);
  }

  return params;
}

export function TaskgenPage() {
  const [filters, setFilters] = useState<TaskgenFilterState>(DEFAULT_FILTERS);
  const [refreshToken, setRefreshToken] = useState(0);
  const [jobs, setJobs] = useState<TaskgenJob[]>([]);
  const [summary, setSummary] = useState<TaskgenJobsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedJob, setSelectedJob] = useState<TaskgenJob | null>(null);
  const [jobLogs, setJobLogs] = useState<TaskgenJobLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = buildParams(filters);

    fetchTaskgenJobs(params)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setJobs(response.items);
        setSummary(response.summary);
        setTotal(response.total);
        setHasMore(response.hasMore);
      })
      .catch((err: unknown) => {
        console.error('[admin][taskgen] failed to load jobs', err);
        if (!cancelled) {
          setError('No se pudieron cargar los jobs.');
          setJobs([]);
          setSummary(null);
          setTotal(0);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, refreshToken]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedJob) {
      setJobLogs([]);
      setLogsError(null);
      return;
    }

    let cancelled = false;
    setLoadingLogs(true);
    setLogsError(null);

    fetchTaskgenJobLogs(selectedJob.id)
      .then((response) => {
        if (!cancelled) {
          setJobLogs(response);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin][taskgen] failed to load job logs', err);
        if (!cancelled) {
          setLogsError('No se pudieron cargar los logs de este job.');
          setJobLogs([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLogs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedJob]);

  const handleFiltersChange = useCallback((next: TaskgenFilterState) => {
    setFilters(next);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleLoadMore = useCallback(() => {
    const currentIndex = LIMIT_OPTIONS.findIndex((value) => value === filters.limit);
    const nextLimit = currentIndex >= 0 && currentIndex < LIMIT_OPTIONS.length - 1
      ? LIMIT_OPTIONS[currentIndex + 1]
      : filters.limit;

    if (nextLimit !== filters.limit) {
      setFilters((prev) => ({ ...prev, limit: nextLimit }));
    }
  }, [filters.limit]);

  const handleCopyCorrelation = useCallback((job: TaskgenJob) => {
    if (!job.correlationId) {
      setToast({ type: 'error', text: 'El job no tiene correlation_id.' });
      return;
    }

    if (!navigator.clipboard) {
      setToast({ type: 'error', text: 'Clipboard API no disponible.' });
      return;
    }

    navigator.clipboard
      .writeText(job.correlationId)
      .then(() => {
        setToast({ type: 'success', text: 'Correlation ID copiado al portapapeles.' });
      })
      .catch((err: unknown) => {
        console.error('[admin][taskgen] failed to copy correlation id', err);
        setToast({ type: 'error', text: 'No se pudo copiar el correlation_id.' });
      });
  }, []);

  const handleRetry = useCallback(
    async (job: TaskgenJob) => {
      setRetryingJobId(job.id);
      try {
        await retryTaskgenJob(job.id);
        setToast({ type: 'success', text: 'Reintento disparado correctamente.' });
        setRefreshToken((token) => token + 1);
      } catch (err) {
        console.error('[admin][taskgen] retry failed', err);
        setToast({ type: 'error', text: 'No se pudo reintentar el job.' });
      } finally {
        setRetryingJobId(null);
      }
    },
    [],
  );

  const totalLabel = useMemo(() => {
    return filters.from || filters.to ? 'Jobs filtrados' : 'Jobs hoy';
  }, [filters.from, filters.to]);

  const effectiveHasMore = useMemo(() => {
    const maxLimit = LIMIT_OPTIONS[LIMIT_OPTIONS.length - 1];
    return hasMore && filters.limit < maxLimit;
  }, [filters.limit, hasMore]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">TaskGen Monitor</h1>
        <p className="text-sm text-slate-400">
          Revisa los jobs recientes, analizá errores y tiempos de generación. Filtrá por usuario, modo o estado para identificar problemas rápidamente.
        </p>
      </header>

      {toast ? <ToastBanner tone={toast.type} message={toast.text} /> : null}

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <KpiCards summary={summary} loading={loading} totalLabel={totalLabel} />

      <Filters
        filters={filters}
        loading={loading}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
        showUserInput
      />

      <JobsTable
        jobs={jobs}
        loading={loading}
        total={total}
        hasMore={effectiveHasMore}
        onLoadMore={effectiveHasMore ? handleLoadMore : undefined}
        onViewLogs={setSelectedJob}
        onRetry={handleRetry}
        onCopyCorrelation={handleCopyCorrelation}
        retryingJobId={retryingJobId}
      />

      <JobLogsDrawer job={selectedJob} logs={jobLogs} loading={loadingLogs} error={logsError} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
