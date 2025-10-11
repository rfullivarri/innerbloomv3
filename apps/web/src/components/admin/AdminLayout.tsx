import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminInsights, AdminLogRow, AdminUser } from '../../lib/types';
import {
  exportAdminLogsCsv,
  fetchAdminInsights,
  fetchAdminLogs,
} from '../../lib/adminApi';
import { AdminDataTable } from './AdminDataTable';
import { FiltersBar, type AdminFilters } from './FiltersBar';
import { InsightsChips } from './InsightsChips';
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
  const [filters, setFilters] = useState<AdminFilters>(DEFAULT_FILTERS);
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [logs, setLogs] = useState<LogsState>({ items: [], page: 1, pageSize: 10, total: 0 });
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUser) {
      setInsights(null);
      setLogs({ items: [], page: 1, pageSize: filters.pageSize, total: 0 });
      return;
    }

    let cancelled = false;
    setLoadingInsights(true);
    setError(null);

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
          setError('No se pudieron cargar los insights.');
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
    setError(null);

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
          setError('No se pudieron cargar los logs.');
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

  const handleSelectUser = useCallback((user: AdminUser | null) => {
    setSelectedUser(user);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedUser) return;

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
      setError('No se pudo exportar el CSV.');
    }
  }, [filters.from, filters.to, filters.q, selectedUser]);

  const handleFiltersChange = useCallback((next: AdminFilters) => {
    setFilters(next);
  }, []);

  const emptyState = useMemo(() => {
    if (loadingLogs) {
      return 'Cargando registros…';
    }

    if (!selectedUser) {
      return 'Seleccioná un usuario para comenzar.';
    }

    if (logs.total === 0) {
      return 'No hay registros para los filtros seleccionados.';
    }

    return null;
  }, [loadingLogs, logs.total, selectedUser]);

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
        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <InsightsChips insights={insights} loading={loadingInsights} />

        <FiltersBar filters={filters} onChange={handleFiltersChange} onExport={handleExport} />

        {emptyState ? (
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-6 py-12 text-center text-sm text-slate-300">
            {emptyState}
          </div>
        ) : (
          <AdminDataTable
            rows={logs.items}
            loading={loadingLogs}
            page={logs.page}
            pageSize={logs.pageSize}
            total={logs.total}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize }))}
          />
        )}
      </main>
    </div>
  );
}
