export type TaskgenFilterState = {
  status: string;
  mode: string;
  user: string;
  from: string | null;
  to: string | null;
  limit: number;
};

type TaskgenFiltersProps = {
  filters: TaskgenFilterState;
  onChange: (next: TaskgenFilterState) => void;
  onReset: () => void;
  loading?: boolean;
  showUserInput?: boolean;
};

export const STATUS_OPTIONS = ['ALL', 'QUEUED', 'STARTED', 'COMPLETED', 'FAILED'];
export const MODE_OPTIONS = ['ALL', 'LOW', 'CHILL', 'FLOW', 'EVOLVE'];
export const LIMIT_OPTIONS = [50, 100, 200, 500, 1000];

export function Filters({ filters, onChange, onReset, loading = false, showUserInput = true }: TaskgenFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 px-4 py-4 shadow-slate-950/20 md:px-6 md:py-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
            <select
              className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={filters.status}
              disabled={loading}
              onChange={(event) =>
                onChange({
                  ...filters,
                  status: event.target.value,
                })
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'Todos' : option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modo</span>
            <select
              className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={filters.mode}
              disabled={loading}
              onChange={(event) =>
                onChange({
                  ...filters,
                  mode: event.target.value,
                })
              }
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'Todos' : option}
                </option>
              ))}
            </select>
          </label>

          {showUserInput ? (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Usuario (ID o email)
              </span>
              <input
                type="text"
                className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={filters.user}
                disabled={loading}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    user: event.target.value,
                  })
                }
                placeholder="Buscar por email o UUID"
                autoComplete="off"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Desde</span>
            <input
              type="date"
              className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={filters.from ?? ''}
              disabled={loading}
              onChange={(event) =>
                onChange({
                  ...filters,
                  from: event.target.value ? event.target.value : null,
                })
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hasta</span>
            <input
              type="date"
              className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={filters.to ?? ''}
              disabled={loading}
              onChange={(event) =>
                onChange({
                  ...filters,
                  to: event.target.value ? event.target.value : null,
                })
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Límite</span>
            <select
              className="rounded-lg border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={filters.limit}
              disabled={loading}
              onChange={(event) =>
                onChange({
                  ...filters,
                  limit: Number(event.target.value),
                })
              }
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            onClick={onReset}
            disabled={loading}
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
