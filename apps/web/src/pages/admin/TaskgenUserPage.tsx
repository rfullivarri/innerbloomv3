import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Filters,
  LIMIT_OPTIONS,
  MODE_OPTIONS,
  type TaskgenFilterState,
} from '../../components/admin/taskgen/Filters';
import { JobLogsDrawer } from '../../components/admin/taskgen/JobLogsDrawer';
import { JobsTable } from '../../components/admin/taskgen/JobsTable';
import { UserSummaryCards } from '../../components/admin/taskgen/UserSummaryCards';
import {
  fetchTaskgenJobLogs,
  fetchTaskgenJobs,
  fetchTaskgenUserOverview,
  forceRunTaskgen,
  retryTaskgenJob,
  type TaskgenJobsParams,
} from '../../lib/api/taskgen';
import type { TaskgenJob, TaskgenJobLog, TaskgenUserOverview } from '../../lib/types';
import { ToastBanner } from '../../components/common/ToastBanner';

function buildDefaultFilters(userId: string): TaskgenFilterState {
  return {
    status: 'ALL',
    mode: 'ALL',
    user: userId,
    from: null,
    to: null,
    limit: 50,
  };
}

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

export function TaskgenUserPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? null;

  const [filters, setFilters] = useState<TaskgenFilterState | null>(userId ? buildDefaultFilters(userId) : null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [jobs, setJobs] = useState<TaskgenJob[]>([]);
  const [overview, setOverview] = useState<TaskgenUserOverview | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedJob, setSelectedJob] = useState<TaskgenJob | null>(null);
  const [jobLogs, setJobLogs] = useState<TaskgenJobLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [forceMode, setForceMode] = useState<string>('');
  const [forcing, setForcing] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }
    setFilters(buildDefaultFilters(userId));
    setRefreshToken((token) => token + 1);
  }, [userId]);

  useEffect(() => {
    if (!filters) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTaskgenJobs(buildParams(filters))
      .then((response) => {
        if (cancelled) {
          return;
        }
        setJobs(response.items);
        setTotal(response.total);
        setHasMore(response.hasMore);
      })
      .catch((err: unknown) => {
        console.error('[admin][taskgen] failed to load user jobs', err);
        if (!cancelled) {
          setError('No se pudieron cargar los jobs del usuario.');
          setJobs([]);
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
    if (!userId) {
      return;
    }

    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError(null);

    fetchTaskgenUserOverview(userId)
      .then((response) => {
        if (!cancelled) {
          setOverview(response);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin][taskgen] failed to load user overview', err);
        if (!cancelled) {
          setOverviewError('No se pudo cargar el resumen del usuario.');
          setOverview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

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

  const handleFiltersChange = useCallback(
    (next: TaskgenFilterState) => {
      setFilters(next);
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    if (!userId) {
      return;
    }
    setFilters(buildDefaultFilters(userId));
  }, [userId]);

  const handleLoadMore = useCallback(() => {
    if (!filters) {
      return;
    }
    const currentIndex = LIMIT_OPTIONS.findIndex((value) => value === filters.limit);
    const nextLimit = currentIndex >= 0 && currentIndex < LIMIT_OPTIONS.length - 1
      ? LIMIT_OPTIONS[currentIndex + 1]
      : filters.limit;

    if (nextLimit !== filters.limit) {
      setFilters((prev) => (prev ? { ...prev, limit: nextLimit } : prev));
    }
  }, [filters]);

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

  const handleForceRun = useCallback(async () => {
    if (!userId) {
      return;
    }
    setForcing(true);
    try {
      await forceRunTaskgen({ userId, mode: forceMode || undefined });
      setToast({ type: 'success', text: 'Se disparó la re-generación del usuario.' });
      setRefreshToken((token) => token + 1);
    } catch (err) {
      console.error('[admin][taskgen] force run failed', err);
      setToast({ type: 'error', text: 'No se pudo forzar la generación.' });
    } finally {
      setForcing(false);
    }
  }, [forceMode, userId]);

  const totalLabel = useMemo(() => {
    return filters?.from || filters?.to ? 'Jobs filtrados' : 'Jobs hoy';
  }, [filters?.from, filters?.to]);

  const effectiveHasMore = useMemo(() => {
    if (!filters) {
      return false;
    }
    const maxLimit = LIMIT_OPTIONS[LIMIT_OPTIONS.length - 1];
    return hasMore && filters.limit < maxLimit;
  }, [filters, hasMore]);

  if (!userId || !filters) {
    return <Navigate to="/admin/taskgen" replace />;
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 text-slate-100">
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Link to="/admin/taskgen" className="text-sky-300 hover:text-sky-100">
            ← Volver al monitor general
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">Historial de TaskGen</h1>
          <p className="mt-1 text-sm text-slate-400">
            Usuario <span className="font-mono text-slate-200">{userId}</span>
            {overview?.userEmail ? ` · ${overview.userEmail}` : ''}
          </p>
        </div>
      </header>

      {toast ? <ToastBanner tone={toast.type} message={toast.text} /> : null}

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      {overviewError ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{overviewError}</div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <UserSummaryCards overview={overview} loading={overviewLoading} />
          </div>
          <div className="flex flex-col gap-2 md:w-64">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modo a forzar</span>
              <select
                className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={forceMode}
                onChange={(event) => setForceMode(event.target.value)}
                disabled={forcing}
              >
                <option value="">Automático</option>
                {MODE_OPTIONS.filter((option) => option !== 'ALL').map((mode) => (
                  <option key={mode} value={mode.toLowerCase()}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded-lg border border-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleForceRun}
              disabled={forcing}
            >
              {forcing ? 'Forzando…' : 'Forzar re-generación'}
            </button>
          </div>
        </div>
      </div>

      <Filters
        filters={filters}
        loading={loading}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
        showUserInput={false}
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
