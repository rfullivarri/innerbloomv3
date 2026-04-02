import { useEffect, useMemo, useState } from 'react';
import { searchAdminUsers } from '../../lib/adminApi';
import type { AdminUser } from '../../lib/types';

type UserPickerProps = {
  onSelect: (user: AdminUser | null) => void;
  selectedUserId: string | null;
  compact?: boolean;
  showSelectedSummary?: boolean;
};

type SearchState = {
  term: string;
  page: number;
};

export function UserPicker({ onSelect, selectedUserId, compact = false, showSelectedSummary = !compact }: UserPickerProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState<SearchState>({ term: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    searchAdminUsers({ query: search.term || undefined, page: search.page, pageSize: compact ? 25 : 10 })
      .then((data) => {
        if (!cancelled) {
          setUsers(data.items);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch users', err);
        if (!cancelled) {
          setError('No se pudo cargar la lista de usuarios.');
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
  }, [compact, search.page, search.term]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  if (compact) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search.term}
            onChange={(event) => setSearch({ term: event.target.value, page: 1 })}
            placeholder="Buscar por email o nombre…"
            className="w-full min-w-0 flex-1 rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] px-2.5 py-1.5 text-xs"
            aria-label="Buscar usuario"
          />
          <button
            type="button"
            onClick={() => setSearch((prev) => ({ ...prev }))}
            className="admin2-btn admin2-btn--ghost"
          >
            Buscar
          </button>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
        ) : null}

        <div className="max-h-72 overflow-y-auto rounded-lg border border-[color:var(--admin-border)]">
          {loading && users.length === 0 ? <p className="px-3 py-2 text-xs text-[color:var(--admin-muted)]">Cargando…</p> : null}
          {users.map((user) => {
            const isActive = user.id === selectedUserId;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user)}
                className={`flex w-full items-center justify-between gap-2 border-b border-[color:var(--admin-border)] px-2.5 py-1 text-left text-[11px] last:border-b-0 ${
                  isActive ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)]' : 'hover:bg-[color:var(--admin-hover)]'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{user.email ?? user.id}</span>
                <span className="inline-flex shrink-0 rounded-full border border-[color:var(--admin-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                  {user.gameMode ?? 'N/A'}
                </span>
                {isActive ? <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide">Seleccionado</span> : null}
              </button>
            );
          })}
        </div>

        {showSelectedSummary && selectedUser ? (
          <div className="rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-hover)] px-3 py-1.5 text-xs">
            Seleccionado: <strong>{selectedUser.email ?? selectedUser.id}</strong>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-sm">
      <div>
        <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Usuario</label>
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            value={search.term}
            onChange={(event) => setSearch({ term: event.target.value, page: 1 })}
            placeholder="Buscar por email o nombre…"
            className="w-full min-w-0 flex-1 rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            aria-label="Buscar usuario"
          />
          <button
            type="button"
            onClick={() => setSearch((prev) => ({ ...prev }))}
            className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:w-auto"
          >
            Buscar
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {loading && users.length === 0 ? (
          <p className="col-span-full text-center text-xs text-slate-400">Cargando…</p>
        ) : null}
        {users.map((user) => {
          const isActive = user.id === selectedUserId;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                isActive
                  ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                  : 'border-slate-800/60 bg-slate-900/40 text-slate-200 hover:border-sky-400/60 hover:bg-slate-800/80'
              }`}
            >
              <span className="font-semibold">{user.email ?? 'Sin email'}</span>
              <span className="text-xs text-slate-400">{user.name ?? 'Sin nombre'}</span>
              {user.gameMode ? (
                <span className="inline-flex w-fit rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                  {user.gameMode}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedUser ? (
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
          Seleccionado: <strong>{selectedUser.email}</strong>
        </div>
      ) : null}
    </div>
  );
}
