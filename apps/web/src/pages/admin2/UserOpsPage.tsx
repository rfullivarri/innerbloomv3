import { useEffect, useState } from 'react';
import type { AdminTaskSummaryRow, AdminUser, AdminUserSubscriptionResponse } from '../../lib/types';
import { UserPicker } from '../../components/admin/UserPicker';
import { AdminTaskSummaryTable } from '../../components/admin/AdminTaskSummaryTable';
import {
  exportAdminLogsCsv,
  fetchAdminTaskStats,
  fetchAdminUserSubscription,
  updateAdminUserSubscription,
} from '../../lib/adminApi';

export function UserOpsPage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [subscription, setSubscription] = useState<AdminUserSubscriptionResponse | null>(null);
  const [taskStats, setTaskStats] = useState<AdminTaskSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUser) {
      setSubscription(null);
      setTaskStats([]);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchAdminUserSubscription(selectedUser.id),
      fetchAdminTaskStats(selectedUser.id),
    ])
      .then(([subscriptionData, stats]) => {
        if (!cancelled) {
          setSubscription(subscriptionData);
          setTaskStats(stats);
        }
      })
      .catch((loadError) => {
        console.error('[admin2][user-ops] failed to load user ops data', loadError);
        if (!cancelled) {
          setError('No se pudieron cargar operaciones de usuario.');
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
  }, [selectedUser]);

  const handleExportCsv = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setMessage(null);
      setError(null);
      const csv = await exportAdminLogsCsv(selectedUser.id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-logs-${selectedUser.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('CSV exportado.');
    } catch (exportError) {
      console.error('[admin2][user-ops] csv export failed', exportError);
      setError('No se pudo exportar CSV.');
    }
  };

  const handleForceActive = async () => {
    if (!selectedUser || !subscription?.availablePlans.length) {
      return;
    }

    try {
      setMessage(null);
      setError(null);
      await updateAdminUserSubscription(selectedUser.id, {
        planCode: subscription.availablePlans[0].planCode,
        status: 'active',
      });
      const refreshed = await fetchAdminUserSubscription(selectedUser.id);
      setSubscription(refreshed);
      setMessage('Suscripción actualizada a active.');
    } catch (updateError) {
      console.error('[admin2][user-ops] subscription update failed', updateError);
      setError('No se pudo actualizar suscripción.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">User Ops</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Operaciones manuales por usuario</h2>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <UserPicker selectedUserId={selectedUser?.id ?? null} onSelect={setSelectedUser} />
      </section>

      {!selectedUser ? <p className="text-sm text-[color:var(--admin-muted)]">Selecciona un usuario para comenzar.</p> : null}

      {selectedUser ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
              <h3 className="text-lg font-semibold">Suscripción</h3>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">
                Estado actual: {subscription?.subscription?.status ?? 'sin registro'}
              </p>
              <button
                type="button"
                onClick={handleForceActive}
                disabled={loading || !subscription?.availablePlans.length}
                className="mt-4 rounded-xl border border-[color:var(--admin-border)] px-4 py-2 text-sm font-semibold hover:border-[color:var(--admin-accent)] disabled:opacity-60"
              >
                Forzar ACTIVE
              </button>
            </article>
            <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
              <h3 className="text-lg font-semibold">Export & logs</h3>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Exporta historial de logs del usuario a CSV.</p>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading}
                className="mt-4 rounded-xl border border-[color:var(--admin-border)] px-4 py-2 text-sm font-semibold hover:border-[color:var(--admin-accent)] disabled:opacity-60"
              >
                Export CSV
              </button>
            </article>
          </section>

          <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
            <h3 className="mb-4 text-lg font-semibold">Task totals</h3>
            <AdminTaskSummaryTable rows={taskStats} loading={loading} />
          </section>
        </>
      ) : null}

      {message ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm">{error}</p> : null}
    </div>
  );
}
