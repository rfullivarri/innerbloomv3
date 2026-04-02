import { AdminLayout } from '../../components/admin/AdminLayout';

export function AdvancedPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Advanced</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Debug, overrides y herramientas riesgosas</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Puente temporal: se expone el Control Center legacy para no perder capacidad operativa.</p>
      </header>
      <AdminLayout />
    </div>
  );
}
