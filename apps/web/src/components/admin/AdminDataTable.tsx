import type { AdminLogRow } from '../../lib/types';

type AdminDataTableProps = {
  rows: AdminLogRow[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const columns: { key: keyof AdminLogRow | 'index'; label: string }[] = [
  { key: 'index', label: '#' },
  { key: 'date', label: 'Fecha' },
  { key: 'week', label: 'Semana' },
  { key: 'pillar', label: 'Pilar' },
  { key: 'trait', label: 'Rasgo' },
  { key: 'stat', label: 'Stat' },
  { key: 'taskName', label: 'Task' },
  { key: 'difficulty', label: 'Dificultad' },
  { key: 'xp', label: 'XP' },
  { key: 'state', label: 'Estado' },
  { key: 'timesInRange', label: 'Veces' },
  { key: 'source', label: 'Origen' },
  { key: 'notes', label: 'Notas' },
];

export function AdminDataTable({
  rows,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: AdminDataTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60">
      <div className="relative max-h-[480px] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-100">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.taskId}-${row.date}-${index}`}
                className="border-t border-slate-800/60 hover:bg-slate-800/60"
              >
                <td className="px-3 py-3 text-xs text-slate-500">{(page - 1) * pageSize + index + 1}</td>
                <td className="px-3 py-3">{row.date}</td>
                <td className="px-3 py-3 text-xs text-slate-400">{row.week}</td>
                <td className="px-3 py-3">{row.pillar}</td>
                <td className="px-3 py-3">{row.trait}</td>
                <td className="px-3 py-3 text-xs text-slate-400">{row.stat ?? '—'}</td>
                <td className="px-3 py-3 font-medium text-slate-100">{row.taskName}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-800/80 px-2 py-1 text-xs capitalize text-slate-200">
                    {row.difficulty}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-sky-200">{row.xp}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                      row.state === 'green'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : row.state === 'yellow'
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {row.state.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-sm text-slate-200">{row.timesInRange}</td>
                <td className="px-3 py-3 text-xs uppercase tracking-wide text-slate-400">{row.source}</td>
                <td className="px-3 py-3 text-xs text-slate-300">{row.notes ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-slate-400">
                  Sin registros para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : null}
      </div>
      <footer className="flex flex-col gap-3 border-t border-slate-800/60 bg-slate-900/80 px-4 py-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Página {page} de {totalPages} · {total} registros
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) || pageSize)}
            className="rounded-lg border border-slate-700/60 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}/pág
              </option>
            ))}
          </select>
        </div>
      </footer>
    </div>
  );
}
