export type AdminFilters = {
  from?: string;
  to?: string;
  q: string;
  page: number;
  pageSize: number;
};

type FiltersBarProps = {
  filters: AdminFilters;
  onChange: (next: AdminFilters) => void;
  onExport: () => void;
  showPageSize?: boolean;
  showExport?: boolean;
};

export function FiltersBar({
  filters,
  onChange,
  onExport,
  showPageSize = true,
  showExport = true,
}: FiltersBarProps) {
  const footerLayoutClass = showExport
    ? 'sm:flex-row sm:items-center sm:justify-between'
    : 'sm:flex-row sm:items-center';
  const gridColumnsClass = showPageSize ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-sm">
      <div className={`grid gap-3 ${gridColumnsClass}`}>
        <label className="flex flex-col text-xs text-slate-300">
          <span className="mb-1 uppercase tracking-[0.2em] text-slate-400">Desde</span>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => onChange({ ...filters, from: event.target.value || undefined, page: 1 })}
            className="rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col text-xs text-slate-300">
          <span className="mb-1 uppercase tracking-[0.2em] text-slate-400">Hasta</span>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => onChange({ ...filters, to: event.target.value || undefined, page: 1 })}
            className="rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col text-xs text-slate-300">
          <span className="mb-1 uppercase tracking-[0.2em] text-slate-400">Buscar</span>
          <input
            type="text"
            value={filters.q}
            onChange={(event) => onChange({ ...filters, q: event.target.value, page: 1 })}
            placeholder="Task, nota, pilar…"
            className="rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        {showPageSize ? (
          <label className="flex flex-col text-xs text-slate-300">
            <span className="mb-1 uppercase tracking-[0.2em] text-slate-400">Filas</span>
            <select
              value={filters.pageSize}
              onChange={(event) => onChange({ ...filters, pageSize: Number(event.target.value) || 10, page: 1 })}
              className="rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className={`flex flex-col gap-2 ${footerLayoutClass}`}>
        <p className="text-xs text-slate-400">
          Ajustá los filtros para refinar los registros. Los cambios se aplican automáticamente.
        </p>
        {showExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Exportar CSV
          </button>
        ) : null}
      </div>
    </div>
  );
}
