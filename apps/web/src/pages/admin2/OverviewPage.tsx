import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Core Engine',
    description: 'Growth Calibration + Mode Upgrade Analysis + Habit Achievement en una sola operación.',
    to: '/admin/core-engine',
  },
  {
    title: 'User Ops',
    description: 'Suscripción, export CSV, logs y totales por usuario con foco operativo.',
    to: '/admin/user-ops',
  },
  {
    title: 'Notifications',
    description: 'Gestión de feedback, campañas y notificaciones transaccionales.',
    to: '/admin/notifications',
  },
  {
    title: 'AI TaskGen',
    description: 'Monitorea jobs, KPIs y reintentos desde un único panel operativo.',
    to: '/admin/ai-taskgen',
  },
  {
    title: 'Advanced',
    description: 'Herramientas técnicas para diagnóstico y operación avanzada.',
    to: '/admin/advanced',
  },
];

export function OverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Overview</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Panel de administración</h2>
        <p className="mt-3 max-w-3xl text-sm text-[color:var(--admin-muted)]">
          Accede rápido a las áreas clave para operar producto, usuarios, notificaciones y herramientas avanzadas.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5 transition hover:border-[color:var(--admin-accent)] hover:shadow-sm"
          >
            <h3 className="text-lg font-semibold tracking-tight">{section.title}</h3>
            <p className="mt-2 text-sm text-[color:var(--admin-muted)]">{section.description}</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-[color:var(--admin-accent)]">Abrir sección →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
