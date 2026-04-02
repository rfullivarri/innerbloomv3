import { useState } from 'react';
import { TaskgenPage } from '../admin/TaskgenPage';
import { TaskgenTracePanel } from '../../components/admin/TaskgenTracePanel';

export function AiTaskgenPage() {
  const [traceUser, setTraceUser] = useState('');

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">AI TaskGen</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Monitor + tracing unificados</h2>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <h3 className="text-lg font-semibold">Trace por usuario</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={traceUser}
            onChange={(event) => setTraceUser(event.target.value)}
            placeholder="user_id para tracing"
            className="w-full max-w-xl rounded-xl border border-[color:var(--admin-border)] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        {traceUser ? <TaskgenTracePanel selectedUserId={traceUser} /> : <p className="mt-3 text-sm text-[color:var(--admin-muted)]">Ingresa un userId para ver trazas.</p>}
      </section>

      <TaskgenPage baseUserPath="/admin2/users" />
    </div>
  );
}
