import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  fetchFeedbackDefinitions,
  patchFeedbackDefinition,
  type FeedbackDefinitionUpdatePayload,
} from '../../lib/api/feedback';
import type { FeedbackDefinition } from '../../lib/types';
import { ToastBanner } from '../../components/common/ToastBanner';

type TabId = 'global' | 'user';

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

type FeedbackFilters = {
  query: string;
  status: 'ALL' | 'active' | 'paused';
  type: 'ALL' | string;
};

const STATUS_BADGES: Record<FeedbackDefinition['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-100',
  paused: 'bg-amber-500/20 text-amber-100',
  draft: 'bg-slate-700/70 text-slate-200',
  deprecated: 'bg-rose-500/20 text-rose-100',
};

const STATUS_LABELS: Record<FeedbackDefinition['status'], string> = {
  active: 'Activa',
  paused: 'Pausada',
  draft: 'Borrador',
  deprecated: 'Deprecada',
};

function GlobalNotificationsView() {
  const [definitions, setDefinitions] = useState<FeedbackDefinition[]>([]);
  const [filters, setFilters] = useState<FeedbackFilters>({ query: '', status: 'ALL', type: 'ALL' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [previewing, setPreviewing] = useState<FeedbackDefinition | null>(null);
  const [editing, setEditing] = useState<FeedbackDefinition | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFeedbackDefinitions()
      .then((response) => {
        if (cancelled) {
          return;
        }
        setDefinitions(response.items);
        setSyncedAt(response.syncedAt);
      })
      .catch((err: unknown) => {
        console.error('[admin][feedback] failed to load definitions', err);
        if (!cancelled) {
          setError('No se pudieron cargar las definiciones.');
          setDefinitions([]);
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
  }, [refreshToken]);

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timeout = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [banner]);

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(definitions.map((definition) => definition.type))).sort();
    return ['ALL', ...values];
  }, [definitions]);

  const filteredDefinitions = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return definitions.filter((definition) => {
      if (filters.status !== 'ALL' && definition.status !== filters.status) {
        return false;
      }
      if (filters.type !== 'ALL' && definition.type !== filters.type) {
        return false;
      }
      if (query && !definition.label.toLowerCase().includes(query) && !definition.notificationKey.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [definitions, filters]);

  const summaryCards = useMemo(() => {
    const active = definitions.filter((item) => item.status === 'active').length;
    const paused = definitions.filter((item) => item.status === 'paused').length;
    const drafts = definitions.filter((item) => item.status === 'draft').length;
    return [
      { label: 'Activas', value: active, subcopy: 'Operando en vivo' },
      { label: 'Pausadas', value: paused, subcopy: 'Esperando ajustes' },
      { label: 'Borradores', value: drafts, subcopy: 'Listos para QA' },
    ];
  }, [definitions]);

  const handleRefresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const handleToggle = useCallback(
    async (definition: FeedbackDefinition) => {
      const nextStatus = definition.status === 'active' ? 'paused' : 'active';
      try {
        setUpdatingId(definition.id);
        const { item } = await patchFeedbackDefinition(definition.id, { status: nextStatus });
        setDefinitions((prev) => prev.map((candidate) => (candidate.id === item.id ? item : candidate)));
        setBanner({ type: 'success', text: `Notificación ${nextStatus === 'active' ? 'activada' : 'pausada'}.` });
      } catch (err) {
        console.error('[admin][feedback] failed to toggle definition', err);
        setBanner({ type: 'error', text: 'No se pudo actualizar el estado.' });
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const handleEditSave = useCallback(
    async (definitionId: string, payload: Parameters<typeof patchFeedbackDefinition>[1]) => {
      setUpdatingId(definitionId);
      try {
        const { item } = await patchFeedbackDefinition(definitionId, payload);
        setDefinitions((prev) => prev.map((candidate) => (candidate.id === item.id ? item : candidate)));
        setEditing(null);
        setBanner({ type: 'success', text: 'Definición actualizada.' });
      } catch (err) {
        console.error('[admin][feedback] failed to update definition', err);
        setBanner({ type: 'error', text: 'No se pudo guardar la definición.' });
        throw err;
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-5">
      {banner ? <ToastBanner tone={banner.type} message={banner.text} /> : null}
      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
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
            <p className="text-xs text-slate-400">
              {syncedAt ? `Última sync ${formatRelativeTimestamp(syncedAt)}` : 'Sincronizando…'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-lg border border-slate-700/60 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100 disabled:opacity-50"
              disabled={loading}
            >
              Refrescar
            </button>
          </div>
        </header>

        <div className="border-b border-slate-800/70 bg-slate-900/70 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="Buscar por nombre o key…"
              className="w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex flex-1 flex-wrap gap-3 lg:justify-end">
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, type: (event.target.value || 'ALL') as FeedbackFilters['type'] }))
                }
                className="min-w-[140px] rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'Todos los tipos' : option}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, status: (event.target.value || 'ALL') as FeedbackFilters['status'] }))
                }
                className="min-w-[140px] rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="paused">Pausadas</option>
              </select>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>

        <div className="max-h-[540px] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Notificación</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Scope / Trigger</th>
                <th className="px-4 py-3">Canal & CTA</th>
                <th className="px-4 py-3">Frecuencia</th>
                <th className="px-4 py-3">Estado · Prioridad</th>
                <th className="px-4 py-3">Métricas</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefinitions.map((definition) => (
                <tr key={definition.id} className="border-t border-slate-800/70 align-top hover:bg-slate-800/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-100">{definition.label}</p>
                    <p className="text-xs text-slate-500">{definition.notificationKey}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs capitalize text-slate-200">{definition.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {definition.scope.map((scope) => (
                        <span key={scope} className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-300">
                          {scope}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{definition.trigger}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-100">{definition.channel}</p>
                    {definition.cta ? (
                      <p className="text-xs text-slate-400">CTA: {definition.cta.label} → {definition.cta.href ?? '—'}</p>
                    ) : (
                      <p className="text-xs text-slate-500">Sin CTA</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{definition.frequency}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_BADGES[definition.status]
                      }`}
                    >
                      {STATUS_LABELS[definition.status]}
                    </span>
                    <p className="mt-2 text-xs text-slate-400">Prioridad {definition.priority}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    <p>
                      <span className="text-slate-500">Last fired:</span> {definition.metrics.lastFiredAt ? formatRelativeTimestamp(definition.metrics.lastFiredAt) : 'Nunca'}
                    </p>
                    <p>
                      7d: {definition.metrics.fires7d} · 30d: {definition.metrics.fires30d}
                    </p>
                    <p>CTR 30d: {(definition.metrics.ctr30d * 100).toFixed(1)}%</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewing(definition)}
                        className="rounded-lg border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-sky-100"
                      >
                        Preview
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                        <span>{definition.status === 'active' ? 'Activo' : 'Pausado'}</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={definition.status === 'active'}
                          onChange={() => handleToggle(definition)}
                          disabled={updatingId === definition.id}
                        />
                        <span
                          className={`relative inline-flex h-5 w-10 items-center rounded-full bg-slate-700 transition ${
                            definition.status === 'active' ? 'bg-emerald-500/60' : 'bg-slate-700'
                          } ${updatingId === definition.id ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              definition.status === 'active' ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditing(definition)}
                        className="rounded-lg border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-sky-100"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDefinitions.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay notificaciones que coincidan con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {loading ? (
            <div className="flex items-center justify-center px-4 py-6 text-sm text-slate-400">Cargando…</div>
          ) : null}
        </div>
      </section>

      {previewing ? (
        <NotificationPreviewModal definition={previewing} onClose={() => setPreviewing(null)} />
      ) : null}
      {editing ? (
        <NotificationEditorPanel
          definition={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
          saving={updatingId === editing.id}
        />
      ) : null}
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

type NotificationPreviewModalProps = {
  definition: FeedbackDefinition;
  onClose: () => void;
};

function NotificationPreviewModal({ definition, onClose }: NotificationPreviewModalProps) {
  const previewCopy = formatPreviewCopy(definition.copy, definition.previewVariables);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <article className="relative w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-50">{definition.label}</h3>
            <p className="text-xs text-slate-400">{definition.channel} · {definition.scope.join(', ')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/70 hover:text-sky-100"
          >
            Cerrar
          </button>
        </header>
        <div className="mt-5 space-y-4">
          <p className="whitespace-pre-line text-sm text-slate-100">{previewCopy}</p>
          <p className="text-xs text-slate-500">Trigger: {definition.trigger}</p>
          {definition.cta ? (
            <div>
              <p className="text-xs text-slate-400">CTA:</p>
              <button
                type="button"
                className="mt-2 w-full rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                {definition.cta.label}
              </button>
              <p className="mt-1 text-[11px] text-slate-500">Destino: {definition.cta.href ?? 'Sin ruta'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Sin CTA configurada</p>
          )}
        </div>
      </article>
    </div>
  );
}

type NotificationEditorPanelProps = {
  definition: FeedbackDefinition;
  onClose: () => void;
  onSave: (definitionId: string, payload: FeedbackDefinitionUpdatePayload) => Promise<void>;
  saving: boolean;
};

type EditorFormState = {
  label: string;
  copy: string;
  trigger: string;
  channel: string;
  type: string;
  frequency: string;
  status: FeedbackDefinition['status'];
  priority: string;
  scope: string;
  ctaLabel: string;
  ctaHref: string;
};

function NotificationEditorPanel({ definition, onClose, onSave, saving }: NotificationEditorPanelProps) {
  const [formState, setFormState] = useState<EditorFormState>(() => buildEditorFormState(definition));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(buildEditorFormState(definition));
    setLocalError(null);
  }, [definition]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLocalError(null);
      try {
        await onSave(definition.id, buildEditorPayload(formState));
      } catch {
        setLocalError('No se pudo guardar. Revisá los campos e intentá nuevamente.');
      }
    },
    [definition.id, formState, onSave],
  );

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-950/60" aria-hidden onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900/95 p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Editar notificación</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-50">{definition.label}</h3>
            <p className="text-xs text-slate-500">{definition.notificationKey}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/70 hover:text-sky-100"
          >
            Cerrar
          </button>
        </header>
        <div className="mt-4 flex-1 space-y-4 overflow-auto pr-2">
          {localError ? <p className="text-xs text-rose-300">{localError}</p> : null}
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Nombre visible
            <input
              value={formState.label}
              onChange={(event) => setFormState((prev) => ({ ...prev, label: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Copy
            <textarea
              value={formState.copy}
              onChange={(event) => setFormState((prev) => ({ ...prev, copy: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              rows={4}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Canal
              <input
                value={formState.channel}
                onChange={(event) => setFormState((prev) => ({ ...prev, channel: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Tipo
              <input
                value={formState.type}
                onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Trigger
            <input
              value={formState.trigger}
              onChange={(event) => setFormState((prev) => ({ ...prev, trigger: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Scope (separá con comas)
            <input
              value={formState.scope}
              onChange={(event) => setFormState((prev) => ({ ...prev, scope: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Frecuencia
              <input
                value={formState.frequency}
                onChange={(event) => setFormState((prev) => ({ ...prev, frequency: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Estado
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value as FeedbackDefinition['status'] }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
                <option value="draft">Borrador</option>
                <option value="deprecated">Deprecada</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Prioridad
              <input
                type="number"
                value={formState.priority}
                onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="space-y-1 text-xs">
              <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">CTA</p>
              <input
                value={formState.ctaLabel}
                onChange={(event) => setFormState((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                placeholder="Label"
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <input
                value={formState.ctaHref}
                onChange={(event) => setFormState((prev) => ({ ...prev, ctaHref: event.target.value }))}
                placeholder="/ruta-o-url"
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700/60 px-3 py-2 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-sky-500/80 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar' }
          </button>
        </div>
      </form>
    </div>
  );
}

function buildEditorFormState(definition: FeedbackDefinition): EditorFormState {
  return {
    label: definition.label,
    copy: definition.copy,
    trigger: definition.trigger,
    channel: definition.channel,
    type: definition.type,
    frequency: definition.frequency,
    status: definition.status,
    priority: String(definition.priority),
    scope: definition.scope.join(', '),
    ctaLabel: definition.cta?.label ?? '',
    ctaHref: definition.cta?.href ?? '',
  };
}

function buildEditorPayload(state: EditorFormState): FeedbackDefinitionUpdatePayload {
  const scopeValues = state.scope
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const payload: FeedbackDefinitionUpdatePayload = {
    label: state.label.trim(),
    copy: state.copy.trim(),
    trigger: state.trigger.trim(),
    channel: state.channel.trim(),
    type: state.type.trim(),
    frequency: state.frequency.trim(),
    status: state.status,
  };

  if (scopeValues.length > 0) {
    payload.scope = scopeValues;
  }

  const parsedPriority = Number(state.priority);
  if (!Number.isNaN(parsedPriority)) {
    payload.priority = parsedPriority;
  }

  const ctaLabel = state.ctaLabel.trim();
  const ctaHref = state.ctaHref.trim();
  payload.cta = ctaLabel ? { label: ctaLabel, href: ctaHref || null } : null;

  return payload;
}

function formatRelativeTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPreviewCopy(copy: string, variables: Record<string, string>) {
  return copy.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] ?? '•••');
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
