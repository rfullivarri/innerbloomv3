import { useState } from 'react';
import { TaskgenPage } from '../admin/TaskgenPage';
import { TaskgenTracePanel } from '../../components/admin/TaskgenTracePanel';

const BTN_SECONDARY = 'admin2-btn admin2-btn--secondary';
const BTN_GHOST = 'admin2-btn admin2-btn--ghost';

export function AiTaskgenPage() {
  const [activeTab, setActiveTab] = useState<'trace' | 'monitor'>('trace');
  const [traceUser, setTraceUser] = useState('');

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">AI TaskGen v2</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Tracing + force-run como vista principal</h2>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setActiveTab('trace')} className={`${activeTab === 'trace' ? BTN_SECONDARY : BTN_GHOST}`}>Trace & Force Tool</button>
        <button type="button" onClick={() => setActiveTab('monitor')} className={`${activeTab === 'monitor' ? BTN_SECONDARY : BTN_GHOST}`}>Jobs Monitor (secundario)</button>
      </div>

      {activeTab === 'trace' ? (
        <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-[color:var(--admin-muted)]">user_id rápido:</label>
            <input
              value={traceUser}
              onChange={(event) => setTraceUser(event.target.value)}
              placeholder="user_id para precargar"
              className="w-full max-w-xl rounded-lg border border-[color:var(--admin-border)] bg-transparent px-3 py-1.5 text-xs"
            />
          </div>
          <TaskgenTracePanel selectedUserId={traceUser || undefined} />
        </section>
      ) : (
        <TaskgenPage baseUserPath="/admin2/users" />
      )}
    </div>
  );
}
