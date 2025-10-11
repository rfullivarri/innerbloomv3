import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminInsights, AdminLogRow, AdminTaskSummaryRow, AdminUser } from '../../lib/types';
import {
  exportAdminLogsCsv,
  fetchAdminInsights,
  fetchAdminLogs,
  fetchAdminTaskStats,
} from '../../lib/adminApi';
import { AdminDataTable } from './AdminDataTable';
import { FiltersBar, type AdminFilters } from './FiltersBar';
import { InsightsChips } from './InsightsChips';
import { AdminTaskSummaryTable } from './AdminTaskSummaryTable';
import { UserPicker } from './UserPicker';

const DEFAULT_FILTERS: AdminFilters = {
  from: undefined,
  to: undefined,
  q: '',
  page: 1,
  pageSize: 10,
};

type LogsState = {
  items: AdminLogRow[];
  page: number;
  pageSize: number;
  total: number;
};

export function AdminLayout() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'taskTotals'>('logs');
  const [filters, setFilters] = useState<AdminFilters>(DEFAULT_FILTERS);
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [logs, setLogs] = useState<LogsState>({ items: [], page: 1, pageSize: 10, total: 0 });
  const [taskStats, setTaskStats] = useState<AdminTaskSummaryRow[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingTaskStats, setLoadingTaskStats] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [taskStatsError, setTaskStatsError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUser) {
      setInsights(null);
      setLogs({ items: [], page: 1, pageSize: filters.pageSize, total: 0 });
      setTaskStats([]);
      return;
    }

    let cancelled = false;
    setLoadingInsights(true);
    setInsightsError(null);

    fetchAdminInsights(selectedUser.id, {
      from: filters.from,
      to: filters.to,
    })
      .then((data) => {
        if (!cancelled) {
          setInsights(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch insights', err);
        if (!cancelled) {
          setInsightsError('No se pudieron cargar los insights.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInsights(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser, filters.from, filters.to]);

  useEffect(() => {
    if (!selectedUser) {
      setLogs({ items: [], page: 1, pageSize: filters.pageSize, total: 0 });
      return;
    }

    let cancelled = false;
    setLoadingLogs(true);
    setLogsError(null);

    fetchAdminLogs(selectedUser.id, {
      from: filters.from,
      to: filters.to,
      q: filters.q,
      page: filters.page,
      pageSize: filters.pageSize,
    })
      .then((data) => {
        if (!cancelled) {
          setLogs({
            items: data.items,
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
          });
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch logs', err);
        if (!cancelled) {
          setLogsError('No se pudieron cargar los logs.');
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
  }, [selectedUser, filters.from, filters.to, filters.q, filters.page, filters.pageSize]);

  useEffect(() => {
    if (!selectedUser) {
      setTaskStats([]);
      return;
    }

    if (activeTab !== 'taskTotals') {
      return;
    }

    let cancelled = false;
    setLoadingTaskStats(true);
    setTaskStatsError(null);

    fetchAdminTaskStats(selectedUser.id, {
      from: filters.from,
      to: filters.to,
      q: filters.q ? filters.q : undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setTaskStats(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch task stats', err);
        if (!cancelled) {
          setTaskStatsError('No se pudieron cargar los totales de tareas.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTaskStats(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedUser, filters.from, filters.to, filters.q]);

  const handleSelectUser = useCallback((user: AdminUser | null) => {
    setSelectedUser(user);
    setFilters(DEFAULT_FILTERS);
    setActiveTab('logs');
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedUser) return;

    setExportError(null);

    try {
      const csv = await exportAdminLogsCsv(selectedUser.id, {
        from: filters.from,
        to: filters.to,
        q: filters.q,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-${selectedUser.id}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[admin] failed to export CSV', err);
      setExportError('No se pudo exportar el CSV.');
    }
  }, [filters.from, filters.to, filters.q, selectedUser]);

  const handleFiltersChange = useCallback((next: AdminFilters) => {
    setFilters(next);
  }, []);

  const errorMessages = useMemo(() => {
    const messages: string[] = [];
    if (insightsError) {
      messages.push(insightsError);
    }
    if (exportError) {
      messages.push(exportError);
    }
    const tabError = activeTab === 'taskTotals' ? taskStatsError : logsError;
    if (tabError) {
      messages.push(tabError);
    }
    return messages;
  }, [activeTab, exportError, insightsError, logsError, taskStatsError]);

  const emptyState = useMemo(() => {
    if (!selectedUser) {
      return 'Seleccioná un usuario para comenzar.';
    }

    if (activeTab === 'logs') {
      if (loadingLogs) {
        return 'Cargando registros…';
      }

      if (logs.total === 0) {
        return 'No hay registros para los filtros seleccionados.';
      }

      return null;
    }

    if (loadingTaskStats) {
      return 'Cargando totales…';
    }

    if (taskStats.length === 0) {
      return 'No hay totales para los filtros seleccionados.';
    }

    return null;
  }, [activeTab, loadingLogs, logs.total, loadingTaskStats, selectedUser, taskStats.length]);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-900 px-4 pb-10 pt-6 text-slate-100">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Admin Control Center</h1>
        <p className="text-sm text-slate-300">
          Explorá la actividad de los usuarios, exportá registros y ajustá tareas con una interfaz ligera.
        </p>
        <UserPicker onSelect={handleSelectUser} selectedUserId={selectedUser?.id ?? null} />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {errorMessages.length > 0 ? (
          <div className="space-y-2">
            {errorMessages.map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {message}
              </div>
            ))}
          </div>
        ) : null}

        <InsightsChips insights={insights} loading={loadingInsights} />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              activeTab === 'logs'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
            }`}
          >
            Registros diarios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taskTotals')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              activeTab === 'taskTotals'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
            }`}
          >
            Totales por tarea
          </button>
        </div>

        <FiltersBar
          filters={filters}
          onChange={handleFiltersChange}
          onExport={handleExport}
          showExport={activeTab === 'logs'}
          showPageSize={activeTab === 'logs'}
        />

        {emptyState ? (
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-6 py-12 text-center text-sm text-slate-300">
            {emptyState}
          </div>
        ) : (
          <>
            {activeTab === 'logs' ? (
              <AdminDataTable
                rows={logs.items}
                loading={loadingLogs}
                page={logs.page}
                pageSize={logs.pageSize}
                total={logs.total}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize }))}
              />
            ) : (
              <AdminTaskSummaryTable rows={taskStats} loading={loadingTaskStats} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
