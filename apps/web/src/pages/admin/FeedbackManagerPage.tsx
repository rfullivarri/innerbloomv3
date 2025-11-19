import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  fetchFeedbackDefinitions,
  fetchFeedbackUserHistory,
  fetchFeedbackUserState,
  patchFeedbackDefinition,
  patchFeedbackUserNotificationState,
  type FeedbackDefinitionUpdatePayload,
  type FeedbackUserHistoryResponse,
  type FeedbackUserHistoryEntry,
  type FeedbackUserNotificationState,
  type FeedbackUserStateResponse,
} from '../../lib/api/feedback';
import type { AdminUser, FeedbackDefinition } from '../../lib/types';
import { ToastBanner } from '../../components/common/ToastBanner';
import { UserPicker } from '../../components/admin/UserPicker';
import { Skeleton } from '../../components/common/Skeleton';
import { NotificationPopup } from '../../components/feedback/NotificationPopup';
import {
  buildPreviewLevelPayload,
  buildPreviewStreakPayload,
  formatLevelNotification,
  formatStreakNotification,
} from '../../lib/notifications';

type TabId = 'global' | 'user';

const TABS: { id: TabId; label: string; helper: string }[] = [
  { id: 'global', label: 'Vista global', helper: 'Lista de notificaciones', },
  { id: 'user', label: 'Vista por usuario', helper: 'Foco en un usuario concreto', },
];

const LEVEL_UP_NOTIFICATION_KEY = 'inapp_level_up_popup';
const STREAK_NOTIFICATION_KEY = 'inapp_streak_fire_popup';
const DEFAULT_LEVEL_TITLE = '¡Subiste de nivel!';
const DEFAULT_LEVEL_TEMPLATE = 'Acabás de llegar al nivel {{level}}. Seguí así.';
const DEFAULT_LEVEL_EMOJI = '🏆';
const DEFAULT_STREAK_TITLE = 'Racha encendida 🔥';
const DEFAULT_STREAK_SINGLE_TEMPLATE = '🔥 {{taskName}} lleva {{streakDays}} días.';
const DEFAULT_STREAK_AGGREGATE_TEMPLATE = '🔥 Tenés {{count}} tareas arriba de {{threshold}} días.';
const DEFAULT_STREAK_EMOJI = '🔥';
const DEFAULT_STREAK_THRESHOLD = 3;

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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userState, setUserState] = useState<FeedbackUserStateResponse | null>(null);
  const [history, setHistory] = useState<FeedbackUserHistoryResponse | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [stateRefreshToken, setStateRefreshToken] = useState(0);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [updatingNotificationKey, setUpdatingNotificationKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedUser) {
      setUserState(null);
      return;
    }

    let cancelled = false;
    setStateLoading(true);
    setStateError(null);

    fetchFeedbackUserState(selectedUser.id)
      .then((data) => {
        if (!cancelled) {
          setUserState(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin][feedback] failed to load user state', err);
        if (!cancelled) {
          setStateError('No se pudo cargar el estado del usuario.');
          setUserState(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStateLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser?.id, stateRefreshToken]);

  useEffect(() => {
    if (!selectedUser) {
      setHistory(null);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    fetchFeedbackUserHistory(selectedUser.id)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin][feedback] failed to load user history', err);
        if (!cancelled) {
          setHistoryError('No se pudo cargar el historial.');
          setHistory(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser?.id, historyRefreshToken]);

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timeout = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [banner]);

  const handleUserSelect = useCallback((user: AdminUser | null) => {
    setSelectedUser(user);
    setUserState(null);
    setHistory(null);
    setStateError(null);
    setHistoryError(null);
  }, []);

  const handleNotificationStateChange = useCallback(
    async (notificationKey: string, nextState: 'active' | 'muted') => {
      if (!selectedUser) {
        return;
      }
      setUpdatingNotificationKey(notificationKey);
      try {
        await patchFeedbackUserNotificationState(selectedUser.id, { notificationKey, state: nextState });
        setBanner({
          type: 'success',
          text:
            nextState === 'muted'
              ? 'Notificación muteada para este usuario.'
              : 'Notificación reactivada para este usuario.',
        });
        setStateRefreshToken((token) => token + 1);
      } catch (error) {
        console.error('[admin][feedback] failed to update notification state', error);
        setBanner({ type: 'error', text: 'No se pudo actualizar la notificación.' });
      } finally {
        setUpdatingNotificationKey(null);
      }
    },
    [selectedUser?.id],
  );

  const userProfile = userState?.user ?? null;
  const email = userProfile?.email ?? selectedUser?.email ?? 'Sin email';
  const displayName =
    userProfile?.name?.trim() ||
    userProfile?.alias?.trim() ||
    selectedUser?.name ||
    selectedUser?.email ||
    'Sin nombre';

  const notifications = userState?.notifications ?? [];
  const historyItems = history?.items ?? [];

  const summaryCards = [
    {
      label: 'Mostradas (7d)',
      value:
        typeof history?.summary?.notifsShownLast7d === 'number'
          ? history.summary.notifsShownLast7d.toLocaleString('es-AR')
          : '—',
      helper: 'notifs_shown_last_7d',
    },
    {
      label: 'Clicks (7d)',
      value:
        typeof history?.summary?.notifsClickedLast7d === 'number'
          ? history.summary.notifsClickedLast7d.toLocaleString('es-AR')
          : '—',
      helper: 'notifs_clicked_last_7d',
    },
    {
      label: 'Momentos críticos (30d)',
      value:
        typeof history?.summary?.notifsCriticalLast30d === 'number'
          ? history.summary.notifsCriticalLast30d.toLocaleString('es-AR')
          : '—',
      helper: 'notifs_critical_last_30d',
    },
    {
      label: 'Click rate (30d)',
      value: formatPercent(history?.summary?.clickRateLast30d),
      helper: 'click_rate_last_30d',
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
      <aside className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 shadow-inner shadow-slate-950/20">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Selección de usuario</p>
          <p className="mt-1 text-sm text-slate-300">Buscá por email o ID para enfocar la vista.</p>
        </header>
        <UserPicker onSelect={handleUserSelect} selectedUserId={selectedUser?.id ?? null} />
        {selectedUser ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">{selectedUser.email ?? 'Sin email'}</p>
            <p className="text-[11px] text-slate-500">user_id: {selectedUser.id}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Todavía no hay un usuario seleccionado.</p>
        )}
      </aside>

      <section className="space-y-5">
        {banner ? <ToastBanner tone={banner.type} message={banner.text} /> : null}

        {!selectedUser ? (
          <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Seleccioná un usuario</p>
            <p className="mt-2 text-xs text-slate-400">
              Usá el buscador de la izquierda para elegir un usuario específico y ver su estado de notificaciones.
            </p>
          </article>
        ) : (
          <>
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-5 shadow-slate-950/30">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vista por usuario</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-50">{displayName}</h2>
                  <p className="text-sm text-slate-400">{email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">user_id</p>
                  <p className="font-mono text-xs text-slate-200">{userProfile?.id ?? selectedUser.id}</p>
                </div>
              </header>
              <dl className="mt-4 grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Game Mode</dt>
                  <dd className="mt-1 text-base text-slate-100">{userProfile?.gameMode ?? selectedUser.gameMode ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Nivel actual</dt>
                  <dd className="mt-1 text-base text-slate-100">{userProfile?.level ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Última actividad</dt>
                  <dd className="mt-1 text-base text-slate-100">{formatOptionalDateTime(userProfile?.lastSeenAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-slate-950/30">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Bloque A — Notificaciones activas</p>
                  <p className="text-xs text-slate-400">Estado individual: active / muted / suppressed</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setStateRefreshToken((token) => token + 1)}
                    className="rounded-lg border border-slate-700/60 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
                  >
                    Refrescar
                  </button>
                </div>
              </header>
              {stateError ? (
                <p className="px-4 py-3 text-xs text-rose-200">{stateError}</p>
              ) : null}
              <div className="relative max-h-[420px] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm text-slate-100">
                  <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                    <tr>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">notification_key</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nombre</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tipo</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Canal</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Estado</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">mute_until</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">last_fired_for_user_at</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">last_interaction</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => {
                      const isUpdating = updatingNotificationKey === notification.notificationKey;
                      return (
                        <tr key={notification.notificationKey} className="border-t border-slate-800/60">
                          <td className="px-3 py-3 font-mono text-xs text-slate-300">{notification.notificationKey}</td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-100">{notification.name}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-300">{notification.type}</td>
                          <td className="px-3 py-3 text-xs text-slate-300">{notification.channel}</td>
                          <td className="px-3 py-3">
                            <span className={notificationStateBadgeClass(notification.state)}>
                              {notification.state}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-300">{formatOptionalDateTime(notification.muteUntil)}</td>
                          <td className="px-3 py-3 text-xs text-slate-300">{formatOptionalDateTime(notification.lastFiredForUserAt)}</td>
                          <td className="px-3 py-3 text-xs text-slate-300">
                            {formatInteractionLabel(notification.lastInteractionType)}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div className="flex flex-wrap gap-2">
                              {notification.state === 'muted' ? (
                                <button
                                  type="button"
                                  onClick={() => handleNotificationStateChange(notification.notificationKey, 'active')}
                                  disabled={isUpdating}
                                  className="rounded-lg border border-emerald-500/60 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Re-activar
                                </button>
                              ) : null}
                              {notification.state === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleNotificationStateChange(notification.notificationKey, 'muted')}
                                  disabled={isUpdating}
                                  className="rounded-lg border border-amber-500/60 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Mutear
                                </button>
                              ) : null}
                              {notification.state === 'suppressed_by_rule' ? (
                                <span className="rounded-lg border border-slate-800/80 px-3 py-1 text-[11px] text-slate-400">
                                  Supeditado a reglas
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {notifications.length === 0 && !stateLoading ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-xs text-slate-400">
                          No hay notificaciones personalizadas para este usuario.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                {stateLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                ) : null}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-slate-950/30">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Bloque B — Historial de disparos</p>
                  <p className="text-xs text-slate-400">Timeline de eventos recientes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryRefreshToken((token) => token + 1)}
                  className="rounded-lg border border-slate-700/60 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
                >
                  Refrescar
                </button>
              </header>
              <div className="border-b border-slate-800/70 bg-slate-950/30 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {summaryCards.map((card) => (
                    <div key={card.helper} className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-50">{card.value}</p>
                      <p className="text-[10px] text-slate-500">{card.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
              {historyError ? (
                <p className="px-4 py-3 text-xs text-rose-200">{historyError}</p>
              ) : null}
              <div className="relative max-h-[420px] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm text-slate-100">
                  <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                    <tr>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">timestamp</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notificación</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tipo</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Canal</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contexto</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Acción</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Critical</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">critical_tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-800/60">
                        <td className="px-3 py-3 text-xs text-slate-300">{formatOptionalDateTime(entry.timestamp)}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-100">{entry.name}</p>
                          <p className="text-xs font-mono text-slate-500">{entry.notificationKey}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300">{entry.type}</td>
                        <td className="px-3 py-3 text-xs text-slate-300">{entry.channel}</td>
                        <td className="px-3 py-3 text-xs text-slate-300">{entry.context ?? '—'}</td>
                        <td className="px-3 py-3 text-xs text-slate-100">{formatHistoryAction(entry.action)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                              entry.isCriticalMoment
                                ? 'bg-rose-500/20 text-rose-100'
                                : 'bg-slate-800/80 text-slate-200'
                            }`}
                          >
                            {entry.isCriticalMoment ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300">{entry.criticalTag ?? '—'}</td>
                      </tr>
                    ))}
                    {historyItems.length === 0 && !historyLoading ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-400">
                          Aún no registramos eventos en el período seleccionado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                {historyLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                ) : null}
              </div>
            </article>
          </>
        )}
      </section>
    </div>
  );
}

type NotificationPreviewModalProps = {
  definition: FeedbackDefinition;
  onClose: () => void;
};

function NotificationPreviewModal({ definition, onClose }: NotificationPreviewModalProps) {
  const previewCopy = formatPreviewCopy(definition.copy, definition.previewVariables ?? {});
  const inlinePreview = buildInAppPreview(definition, onClose);
  const hasInlinePreview = Boolean(inlinePreview);
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
          {hasInlinePreview ? (
            <>
              <div
                className="rounded-3xl border border-white/10 bg-slate-950/40 p-4"
                onClickCapture={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('a')) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
              >
                {inlinePreview}
              </div>
              <p className="text-xs text-slate-500">Texto base: {previewCopy}</p>
            </>
          ) : (
            <p className="whitespace-pre-line text-sm text-slate-100">{previewCopy}</p>
          )}
          <p className="text-xs text-slate-500">Trigger: {definition.trigger}</p>
          {definition.cta ? (
            hasInlinePreview ? (
              <p className="text-xs text-slate-500">
                CTA configurada: <span className="font-semibold text-slate-100">{definition.cta.label}</span> · Destino:{' '}
                {definition.cta.href ?? 'Sin ruta'}
              </p>
            ) : (
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
            )
          ) : (
            <p className="text-xs text-slate-500">Sin CTA configurada</p>
          )}
        </div>
      </article>
    </div>
  );
}

function buildInAppPreview(definition: FeedbackDefinition, onClose: () => void) {
  if (definition.channel?.trim() !== 'in_app_popup') {
    return null;
  }

  const renderPopup = (formatted: ReturnType<typeof formatLevelNotification>) => (
    <NotificationPopup
      inline
      open
      title={formatted.title}
      message={formatted.message}
      emoji={formatted.emoji}
      emojiAnimation={formatted.emojiAnimation}
      tasks={formatted.tasks}
      cta={definition.cta}
      onClose={onClose}
    />
  );

  if (
    definition.notificationKey === LEVEL_UP_NOTIFICATION_KEY ||
    definition.notificationKey.startsWith('inapp_level_')
  ) {
    const payload = buildPreviewLevelPayload(definition);
    const formatted = formatLevelNotification(definition, payload);
    return renderPopup(formatted);
  }

  if (
    definition.notificationKey === STREAK_NOTIFICATION_KEY ||
    definition.notificationKey.startsWith('inapp_streak_')
  ) {
    const payload = buildPreviewStreakPayload(definition);
    const formatted = formatStreakNotification(definition, payload);
    return renderPopup(formatted);
  }

  const config = definition.config ?? {};
  const preview = definition.previewVariables ?? {};
  const title =
    getStringOrUndefined(config.title) ?? getStringOrUndefined(preview.title) ?? definition.label;
  const messageTemplate =
    getStringOrUndefined(config.messageTemplate) ?? getStringOrUndefined(preview.messageTemplate) ?? definition.copy;
  const message = formatPreviewCopy(messageTemplate, preview);
  const emoji =
    getStringOrUndefined(config.emoji) ?? getStringOrUndefined(preview.emoji) ?? '✨';
  const hasPreviewTasks =
    typeof preview.tasks_json === 'string' ||
    typeof preview.tasksJson === 'string' ||
    typeof preview.tasks === 'string' ||
    typeof preview.task_name === 'string' ||
    typeof preview.taskName === 'string';
  const fallbackTasks = hasPreviewTasks ? buildPreviewStreakPayload(definition).tasks : undefined;

  return (
    <NotificationPopup
      inline
      open
      title={title}
      message={message}
      emoji={emoji}
      emojiAnimation="bounce"
      tasks={fallbackTasks}
      cta={definition.cta}
      onClose={onClose}
    />
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
  levelUpTitle?: string;
  levelUpMessage?: string;
  levelUpEmoji?: string;
  streakTitle?: string;
  streakSingleTemplate?: string;
  streakAggregateTemplate?: string;
  streakEmoji?: string;
  streakThreshold?: string;
  streakListMode?: 'auto' | 'single' | 'aggregate';
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
        await onSave(definition.id, buildEditorPayload(definition, formState));
      } catch {
        setLocalError('No se pudo guardar. Revisá los campos e intentá nuevamente.');
      }
    },
    [definition, formState, onSave],
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
          {definition.notificationKey === LEVEL_UP_NOTIFICATION_KEY ? (
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-800/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Config pop-up nivel</p>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Título
                <input
                  value={formState.levelUpTitle ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, levelUpTitle: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Mensaje
                <textarea
                  value={formState.levelUpMessage ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, levelUpMessage: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Emoji
                <input
                  value={formState.levelUpEmoji ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, levelUpEmoji: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
          ) : null}
          {definition.notificationKey === STREAK_NOTIFICATION_KEY ? (
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-800/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Config pop-up streaks</p>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Título
                <input
                  value={formState.streakTitle ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, streakTitle: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Texto una tarea
                <textarea
                  value={formState.streakSingleTemplate ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, streakSingleTemplate: event.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Texto agrupado
                <textarea
                  value={formState.streakAggregateTemplate ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, streakAggregateTemplate: event.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Umbral (días)
                  <input
                    type="number"
                    value={formState.streakThreshold ?? ''}
                    onChange={(event) => setFormState((prev) => ({ ...prev, streakThreshold: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Modo de lista
                  <select
                    value={formState.streakListMode ?? 'auto'}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        streakListMode: event.target.value as EditorFormState['streakListMode'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="auto">Auto</option>
                    <option value="single">Solo individual</option>
                    <option value="aggregate">Siempre agrupado</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Emoji
                <input
                  value={formState.streakEmoji ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, streakEmoji: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
          ) : null}
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
  const base: EditorFormState = {
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

  const config = definition.config ?? {};
  const preview = definition.previewVariables ?? {};

  if (definition.notificationKey === LEVEL_UP_NOTIFICATION_KEY) {
    base.levelUpTitle = getStringOrUndefined(config.title) ?? DEFAULT_LEVEL_TITLE;
    const messageFallback =
      getStringOrUndefined(config.messageTemplate) ?? getStringOrUndefined(definition.copy) ?? DEFAULT_LEVEL_TEMPLATE;
    base.levelUpMessage = messageFallback;
    base.levelUpEmoji = getStringOrUndefined(config.emoji) ?? DEFAULT_LEVEL_EMOJI;
  }

  if (definition.notificationKey === STREAK_NOTIFICATION_KEY) {
    const thresholdFromConfig = coercePositiveIntValue(config.threshold);
    const thresholdFromPreview = coercePositiveIntValue(preview.threshold);
    const threshold = thresholdFromConfig ?? thresholdFromPreview ?? DEFAULT_STREAK_THRESHOLD;
    const singleTemplateFallback =
      getStringOrUndefined(config.singleTemplate) ?? getStringOrUndefined(definition.copy) ?? DEFAULT_STREAK_SINGLE_TEMPLATE;
    const aggregateTemplateFallback =
      getStringOrUndefined(config.aggregateTemplate) ?? DEFAULT_STREAK_AGGREGATE_TEMPLATE;
    base.streakTitle = getStringOrUndefined(config.title) ?? DEFAULT_STREAK_TITLE;
    base.streakSingleTemplate = singleTemplateFallback;
    base.streakAggregateTemplate = aggregateTemplateFallback;
    base.streakEmoji = getStringOrUndefined(config.emoji) ?? DEFAULT_STREAK_EMOJI;
    base.streakThreshold = String(threshold);
    base.streakListMode = parseStreakListMode(config.listMode) ?? 'auto';
  }

  return base;
}

function buildEditorPayload(
  definition: FeedbackDefinition,
  state: EditorFormState,
): FeedbackDefinitionUpdatePayload {
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

  const config = definition.config ?? {};

  if (definition.notificationKey === LEVEL_UP_NOTIFICATION_KEY) {
    payload.config = {
      ...config,
      title: sanitizeInputString(state.levelUpTitle, getStringOrUndefined(config.title) ?? DEFAULT_LEVEL_TITLE),
      messageTemplate: sanitizeInputString(
        state.levelUpMessage,
        getStringOrUndefined(config.messageTemplate) ?? getStringOrUndefined(definition.copy) ?? DEFAULT_LEVEL_TEMPLATE,
      ),
      emoji: sanitizeInputString(state.levelUpEmoji, getStringOrUndefined(config.emoji) ?? DEFAULT_LEVEL_EMOJI),
    };
  } else if (definition.notificationKey === STREAK_NOTIFICATION_KEY) {
    const thresholdFallback = coercePositiveIntValue(config.threshold) ?? DEFAULT_STREAK_THRESHOLD;
    const threshold = Math.max(1, coercePositiveIntValue(state.streakThreshold) ?? thresholdFallback);
    payload.config = {
      ...config,
      title: sanitizeInputString(state.streakTitle, getStringOrUndefined(config.title) ?? DEFAULT_STREAK_TITLE),
      singleTemplate: sanitizeInputString(
        state.streakSingleTemplate,
        getStringOrUndefined(config.singleTemplate) ?? getStringOrUndefined(definition.copy) ?? DEFAULT_STREAK_SINGLE_TEMPLATE,
      ),
      aggregateTemplate: sanitizeInputString(
        state.streakAggregateTemplate,
        getStringOrUndefined(config.aggregateTemplate) ?? DEFAULT_STREAK_AGGREGATE_TEMPLATE,
      ),
      threshold,
      listMode: parseStreakListMode(state.streakListMode) ?? 'auto',
      emoji: sanitizeInputString(state.streakEmoji, getStringOrUndefined(config.emoji) ?? DEFAULT_STREAK_EMOJI),
    };
  }

  return payload;
}

function getStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coercePositiveIntValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.round(parsed));
    }
  }
  return null;
}

function parseStreakListMode(value: unknown): EditorFormState['streakListMode'] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'single' || normalized === 'aggregate' || normalized === 'auto') {
    return normalized;
  }
  return undefined;
}

function sanitizeInputString(value: string | undefined, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
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

function formatOptionalDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function notificationStateBadgeClass(state: FeedbackUserNotificationState['state']) {
  switch (state) {
    case 'active':
      return 'inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-100';
    case 'muted':
      return 'inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold uppercase text-amber-100';
    default:
      return 'inline-flex rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase text-slate-200';
  }
}

function formatInteractionLabel(action: FeedbackUserNotificationState['lastInteractionType']) {
  if (!action) {
    return '—';
  }
  switch (action) {
    case 'clicked':
      return 'clicked';
    case 'dismissed':
      return 'dismissed';
    case 'ignored':
      return 'ignored';
    case 'auto_closed':
      return 'auto_closed';
    default:
      return 'shown';
  }
}

function formatHistoryAction(action: FeedbackUserHistoryEntry['action']) {
  switch (action) {
    case 'clicked':
      return 'Clicked';
    case 'dismissed':
      return 'Dismissed';
    case 'ignored':
      return 'Ignored';
    case 'auto_closed':
      return 'Auto closed';
    default:
      return 'Shown';
  }
}

function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  const normalized = value > 1 ? value / 100 : value;
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(normalized);
}
