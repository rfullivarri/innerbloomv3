import type { AdminTaskSummaryRow } from '../../lib/types';

type AdminTaskSummaryTableProps = {
  rows: AdminTaskSummaryRow[];
  loading: boolean;
};

export function AdminTaskSummaryTable({ rows, loading }: AdminTaskSummaryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60">
      <div className="relative max-h-[480px] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-100">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
            <tr>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">#</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Task</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pilar</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rasgo</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dificultad</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total XP</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Veces</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Días activos</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Primera vez</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Última vez</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.taskId} className="border-t border-slate-800/60 hover:bg-slate-800/60">
                <td className="px-3 py-3 text-xs text-slate-500">{index + 1}</td>
                <td className="px-3 py-3 font-medium text-slate-100">{row.taskName}</td>
                <td className="px-3 py-3">{row.pillar}</td>
                <td className="px-3 py-3">{row.trait}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-800/80 px-2 py-1 text-xs capitalize text-slate-200">
                    {row.difficulty}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-sky-200">{row.totalXp}</td>
                <td className="px-3 py-3 text-center text-sm text-slate-200">{row.totalCompletions}</td>
                <td className="px-3 py-3 text-center text-sm text-slate-200">{row.daysActive}</td>
                <td className="px-3 py-3 text-xs text-slate-300">{row.firstCompletedAt ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-slate-300">{row.lastCompletedAt ?? '—'}</td>
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
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-sm text-slate-400">
                  No hay totales para mostrar.
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
      <footer className="flex items-center justify-between border-t border-slate-800/60 bg-slate-900/80 px-4 py-3 text-xs text-slate-300">
        <span>{rows.length} tareas únicas</span>
        <span>Ordenado por XP total descendente</span>
      </footer>
    </div>
  );
}
