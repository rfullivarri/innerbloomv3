import { useMemo, useState } from 'react';

type TabId = 'global' | 'user';

type GlobalNotification = {
  id: string;
  name: string;
  channel: string;
  status: 'Activa' | 'Programada' | 'Borrador';
  audience: string;
  lastUpdated: string;
  owner: string;
};

type UserNotification = {
  id: string;
  title: string;
  channel: string;
  timestamp: string;
  state: 'enviado' | 'visto' | 'pendiente';
  result: string;
};

const TABS: { id: TabId; label: string; helper: string }[] = [
  { id: 'global', label: 'Vista global', helper: 'Lista de notificaciones', },
  { id: 'user', label: 'Vista por usuario', helper: 'Foco en un usuario concreto', },
];

const MOCK_GLOBAL_NOTIFICATIONS: GlobalNotification[] = [
  {
    id: 'welcome-pop',
    name: 'Pop-up bienvenida',
    channel: 'Modal in-app',
    status: 'Activa',
    audience: 'Todos los nuevos usuarios',
    lastUpdated: 'Actualizado 12 Oct · 10:24',
    owner: 'Equipo Onboarding',
  },
  {
    id: 'xp-reminder',
    name: 'Recordatorio XP diario',
    channel: 'Banner superior',
    status: 'Programada',
    audience: 'Usuarios en streak +3',
    lastUpdated: 'Actualizado 11 Oct · 18:42',
    owner: 'Inner Ops',
  },
  {
    id: 'pillars-promo',
    name: 'Mensaje pilares inactivos',
    channel: 'Toast lateral',
    status: 'Borrador',
    audience: 'Usuarios con pilares en rojo',
    lastUpdated: 'Actualizado 8 Oct · 09:05',
    owner: 'Equipo XP',
  },
];

const MOCK_USER_NOTIFICATIONS: UserNotification[] = [
  {
    id: 'evt-1',
    title: 'Pop-up bienvenida',
    channel: 'Modal in-app',
    timestamp: 'Hoy · 09:18',
    state: 'visto',
    result: 'Clic en CTA principal',
  },
  {
    id: 'evt-2',
    title: 'Banner logros desbloqueados',
    channel: 'Banner superior',
    timestamp: 'Ayer · 18:21',
    state: 'enviado',
    result: 'Sin interacción (TODO: métricas reales)',
  },
  {
    id: 'evt-3',
    title: 'Mensaje pilares inactivos',
    channel: 'Toast lateral',
    timestamp: '05 Oct · 11:07',
    state: 'pendiente',
    result: 'Esperando trigger de hábitos',
  },
];

export function FeedbackManagerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('global');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 text-slate-100 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin · Feedback</p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Feedback & Notifications Manager</h1>
          <p className="mt-2 text-sm text-slate-400">
            Panel para gestionar los pop-ups, mensajes y notificaciones que ve el usuario.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-2 shadow-inner shadow-slate-950/30">
        <div className="grid grid-cols-2 gap-2">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-100 shadow shadow-sky-900/40'
                    : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="px-4 pb-1 pt-3 text-xs text-slate-400">{TABS.find((tab) => tab.id === activeTab)?.helper}</p>
      </section>

      {activeTab === 'global' ? <GlobalNotificationsView /> : <UserNotificationsView />}
    </div>
  );
}

function GlobalNotificationsView() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Activas', value: '8', subcopy: '+2 esta semana' },
          { label: 'Programadas', value: '4', subcopy: 'Para los próximos 7 días' },
          { label: 'Borradores', value: '3', subcopy: 'Listos para QA' },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-md shadow-slate-950/20"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-50">{card.value}</p>
            <p className="text-xs text-slate-500">{card.subcopy}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-slate-950/30">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-100">Inventario de notificaciones</p>
            <p className="text-xs text-slate-400">TODO: conectar con API real de feedback</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-800/60 px-3 py-1 text-slate-300">Última sync 2 min atrás</span>
            <button
              type="button"
              className="rounded-lg border border-slate-700/60 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
            >
              Exportar CSV
            </button>
          </div>
        </header>
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Audiencia</th>
                <th className="px-4 py-3">Última edición</th>
                <th className="px-4 py-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_GLOBAL_NOTIFICATIONS.map((notification) => (
                <tr key={notification.id} className="border-t border-slate-800/70 hover:bg-slate-800/60">
                  <td className="px-4 py-3 font-semibold text-slate-100">{notification.name}</td>
                  <td className="px-4 py-3 text-slate-300">{notification.channel}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(notification.status)}>{notification.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{notification.audience}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{notification.lastUpdated}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{notification.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UserNotificationsView() {
  const [userQuery, setUserQuery] = useState('user.demo@innerbloom');

  const mockUser = useMemo(
    () => ({
      email: userQuery || 'user.demo@innerbloom',
      id: 'user_demo',
      activeExperiments: ['Onboarding XP', 'Nudge hábitos pilares'],
    }),
    [userQuery],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
      <aside className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 shadow-inner shadow-slate-950/20">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Selección de usuario</p>
          <p className="mt-1 text-sm text-slate-300">TODO: conectar con buscador real del Admin.</p>
        </header>
        <div className="mt-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email o ID</label>
          <input
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="Buscar usuario…"
            className="w-full rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            className="w-full rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Guardar foco
          </button>
          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            Mostrando vista mock para <span className="font-semibold text-slate-100">{mockUser.email}</span>
          </div>
        </div>
      </aside>

      <section className="space-y-5">
        <article className="rounded-2xl border border-slate-800/60 bg-slate-900/80 p-5 shadow-slate-950/30">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Estado general</p>
              <p className="text-xs text-slate-400">Experiencias activas &amp; últimas interacciones</p>
            </div>
            <span className="rounded-full border border-slate-800/80 px-3 py-1 text-xs text-slate-300">TODO: métricas reales</span>
          </header>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Experimentos</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {mockUser.activeExperiments.map((experiment) => (
                  <li key={experiment} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
                    {experiment}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Siguiente acción sugerida</p>
              <p className="mt-2 text-sm text-slate-100">Enviar nudge sobre pilares &amp; desbloquear nuevo modal.</p>
              <p className="text-xs text-slate-500">Basado en hábitos incompletos (mock).</p>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-slate-950/30">
          <header className="flex items-center justify-between border-b border-slate-800/70 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Timeline de notificaciones</p>
              <p className="text-xs text-slate-400">Datos mockeados hasta conectar con el backend.</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-700/60 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
            >
              Refrescar
            </button>
          </header>
          <div className="divide-y divide-slate-800/60">
            {MOCK_USER_NOTIFICATIONS.map((notification) => (
              <div key={notification.id} className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{notification.title}</p>
                  <p className="text-xs text-slate-400">{notification.channel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-xs text-slate-500">{notification.timestamp}</span>
                  <span className={stateBadgeClass(notification.state)}>{notification.state.toUpperCase()}</span>
                  <span className="text-xs text-slate-400">{notification.result}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function statusBadgeClass(status: GlobalNotification['status']) {
  switch (status) {
    case 'Activa':
      return 'inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200';
    case 'Programada':
      return 'inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200';
    default:
      return 'inline-flex items-center rounded-full bg-slate-700/50 px-3 py-1 text-xs font-semibold text-slate-200';
  }
}

function stateBadgeClass(state: UserNotification['state']) {
  switch (state) {
    case 'visto':
      return 'inline-flex items-center rounded-full bg-sky-500/20 px-3 py-1 text-[11px] font-semibold text-sky-100';
    case 'enviado':
      return 'inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-100';
    default:
      return 'inline-flex items-center rounded-full bg-slate-700/70 px-3 py-1 text-[11px] font-semibold text-slate-200';
  }
}
