import { TaskgenPage } from '../admin/TaskgenPage';

export function AdvancedPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Advanced</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Herramientas secundarias / debug técnico</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Esta sección queda para monitor secundario, wrappers temporales y utilidades de diagnóstico.</p>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
        <h3 className="text-lg font-semibold">TaskGen monitor secundario</h3>
        <p className="mb-3 text-xs text-[color:var(--admin-muted)]">Se mantiene aquí como vista auxiliar; la herramienta principal está en AI TaskGen.</p>
        <TaskgenPage baseUserPath="/admin2/users" />
      </section>
    </div>
  );
}
