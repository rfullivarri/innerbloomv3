import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminLogRow, AdminTaskSummaryRow, AdminUser, AdminUserSubscriptionResponse, SubscriptionStatus } from '../../lib/types';
import { UserPicker } from '../../components/admin/UserPicker';
import { FiltersBar, type AdminFilters } from '../../components/admin/FiltersBar';
import { AdminDataTable } from '../../components/admin/AdminDataTable';
import { AdminTaskSummaryTable } from '../../components/admin/AdminTaskSummaryTable';
import { TaskgenTracePanel } from '../../components/admin/TaskgenTracePanel';
import {
  exportAdminLogsCsv,
  fetchAdminLogs,
  fetchAdminTaskStats,
  fetchAdminUserSubscription,
  sendAdminDailyReminder,
  sendAdminTasksReadyEmail,
  updateAdminUserSubscription,
} from '../../lib/adminApi';

const DEFAULT_FILTERS: AdminFilters = { from: undefined, to: undefined, q: '', page: 1, pageSize: 10 };
const BTN_PRIMARY = 'admin2-btn admin2-btn--primary';
const BTN_SECONDARY = 'admin2-btn admin2-btn--secondary';
const BTN_GHOST = 'admin2-btn admin2-btn--ghost';
const BTN_SUCCESS = 'admin2-btn admin2-btn--success';

export function UserOpsPage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [subscription, setSubscription] = useState<AdminUserSubscriptionResponse | null>(null);
  const [taskStats, setTaskStats] = useState<AdminTaskSummaryRow[]>([]);
  const [logs, setLogs] = useState<{ items: AdminLogRow[]; page: number; pageSize: number; total: number }>({ items: [], page: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<AdminFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'logs' | 'taskTotals' | 'taskgen'>('logs');
  const [loading, setLoading] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingTasksReady, setSendingTasksReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUserOps = useCallback(async () => {
    if (!selectedUser) {
      setSubscription(null);
      setTaskStats([]);
      setLogs({ items: [], page: 1, pageSize: 10, total: 0 });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [subscriptionData, taskStatsData, logsData] = await Promise.all([
        fetchAdminUserSubscription(selectedUser.id),
        fetchAdminTaskStats(selectedUser.id, { from: filters.from, to: filters.to, q: filters.q || undefined }),
        fetchAdminLogs(selectedUser.id, { from: filters.from, to: filters.to, q: filters.q, page: filters.page, pageSize: filters.pageSize }),
      ]);
      setSubscription(subscriptionData);
      setTaskStats(taskStatsData);
      setLogs({ items: logsData.items, page: logsData.page, pageSize: logsData.pageSize, total: logsData.total });
    } catch (loadError) {
      console.error(loadError);
      setError('No se pudieron cargar operaciones del usuario.');
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.page, filters.pageSize, filters.q, filters.to, selectedUser]);

  useEffect(() => {
    void loadUserOps();
  }, [loadUserOps]);

  const updateSubscription = useCallback(async (payload: { planCode: string; status?: SubscriptionStatus; successMessage: string }) => {
    if (!selectedUser) return;
    try {
      setUpdatingSubscription(true);
      setMessage(null);
      setError(null);
      await updateAdminUserSubscription(selectedUser.id, { planCode: payload.planCode, status: payload.status });
      setSubscription(await fetchAdminUserSubscription(selectedUser.id));
      setMessage(payload.successMessage);
    } catch (subscriptionError) {
      console.error(subscriptionError);
      setError('No se pudo actualizar suscripción.');
    } finally {
      setUpdatingSubscription(false);
    }
  }, [selectedUser]);

  const handleExportCsv = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setMessage(null);
      const csv = await exportAdminLogsCsv(selectedUser.id, { from: filters.from, to: filters.to, q: filters.q });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin2-logs-${selectedUser.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('CSV exportado.');
    } catch (csvError) {
      console.error(csvError);
      setError('No se pudo exportar CSV.');
    }
  }, [filters.from, filters.q, filters.to, selectedUser]);

  const handleReminder = useCallback(async () => {
    if (!selectedUser) return;
    setSendingReminder(true);
    try {
      const response = await sendAdminDailyReminder(selectedUser.id);
      setMessage(`Recordatorio enviado a ${response.recipient}.`);
    } catch (reminderError) {
      console.error(reminderError);
      setError('No se pudo enviar recordatorio.');
    } finally {
      setSendingReminder(false);
    }
  }, [selectedUser]);

  const handleTasksReady = useCallback(async () => {
    if (!selectedUser) return;
    setSendingTasksReady(true);
    try {
      const response = await sendAdminTasksReadyEmail(selectedUser.id);
      setMessage(`Correo AI enviado a ${response.recipient}.`);
    } catch (emailError) {
      console.error(emailError);
      setError('No se pudo enviar correo AI.');
    } finally {
      setSendingTasksReady(false);
    }
  }, [selectedUser]);

  const currentSubscription = subscription?.subscription;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">User Ops v2</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Suscripción, SUPERUSER, CSV, logs y task totals</h2>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
        <UserPicker compact selectedUserId={selectedUser?.id ?? null} onSelect={(user) => { setSelectedUser(user); setFilters(DEFAULT_FILTERS); }} />
      </section>

      {selectedUser ? (
        <section className="flex flex-col gap-4">
          <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
            <h3 className="font-semibold">Subscription & Admin Actions</h3>
            <p className="mt-1 text-xs text-[color:var(--admin-muted)]">Control operativo real: plan actual, cambios manuales y SUPERUSER visible.</p>
            <div className="mt-2 space-y-1 text-xs">
              <p>Plan actual: <strong>{currentSubscription?.planCode ?? 'sin registro'}</strong></p>
              <p>Status: <strong>{currentSubscription?.status ?? 'sin registro'}</strong></p>
              <p>SUPERUSER: <strong>{currentSubscription?.isSuperuser ? 'sí' : 'no'}</strong></p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void updateSubscription({ planCode: 'SUPERUSER', status: 'active', successMessage: 'Usuario actualizado a SUPERUSER.' })} disabled={updatingSubscription || loading} className={BTN_PRIMARY}>Hacer SUPERUSER</button>
              {subscription?.availablePlans.filter((plan) => plan.active).map((plan) => (
                <button key={plan.planCode} type="button" onClick={() => void updateSubscription({ planCode: plan.planCode, status: 'active', successMessage: `Plan actualizado a ${plan.planCode}.` })} disabled={updatingSubscription || loading} className={BTN_SECONDARY}>Set {plan.planCode}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleReminder()} disabled={sendingReminder} className={BTN_GHOST}>{sendingReminder ? 'Enviando…' : 'Probar recordatorio'}</button>
              <button type="button" onClick={() => void handleTasksReady()} disabled={sendingTasksReady} className={BTN_GHOST}>{sendingTasksReady ? 'Enviando…' : 'Probar correo AI'}</button>
              <button type="button" onClick={() => void handleExportCsv()} className={BTN_SUCCESS}>Export CSV</button>
            </div>
          </article>

          <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => setActiveTab('logs')} className={`${activeTab === 'logs' ? BTN_SECONDARY : BTN_GHOST}`}>Logs</button>
              <button type="button" onClick={() => setActiveTab('taskTotals')} className={`${activeTab === 'taskTotals' ? BTN_SECONDARY : BTN_GHOST}`}>Task totals</button>
              <button type="button" onClick={() => setActiveTab('taskgen')} className={`${activeTab === 'taskgen' ? BTN_SECONDARY : BTN_GHOST}`}>TaskGen traces</button>
            </div>
            {activeTab !== 'taskgen' ? <FiltersBar filters={filters} onChange={setFilters} onExport={handleExportCsv} showExport={activeTab === 'logs'} showPageSize={activeTab === 'logs'} /> : null}
            <div className="mt-3 max-h-[28rem] overflow-auto">
              {activeTab === 'logs' ? <AdminDataTable rows={logs.items} loading={loading} page={logs.page} pageSize={logs.pageSize} total={logs.total} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize }))} /> : null}
              {activeTab === 'taskTotals' ? <AdminTaskSummaryTable rows={taskStats} loading={loading} /> : null}
              {activeTab === 'taskgen' ? <TaskgenTracePanel selectedUserId={selectedUser.id} /> : null}
            </div>
          </article>
        </section>
      ) : <p className="text-sm text-[color:var(--admin-muted)]">Selecciona un usuario para operar.</p>}

      {message ? <p className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm">{error}</p> : null}
    </div>
  );
}
