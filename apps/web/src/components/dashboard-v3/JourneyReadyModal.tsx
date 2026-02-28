import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserTask } from '../../lib/api';

export function JourneyReadyModal({
  open,
  tasks,
  onClose,
  onEditor,
}: {
  open: boolean;
  tasks: UserTask[];
  onClose: () => void;
  onEditor: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(() => tasks.slice(0, 5), [tasks]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[560px] max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/20 bg-surface p-4 md:max-h-[80vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-center gap-2 text-center text-xs font-semibold uppercase tracking-[0.32em] text-white/65 sm:text-sm">
          <span>Innerbloom</span>
          <img src="/IB-COLOR-LOGO.png" alt="Innerbloom logo" className="h-[1.45em] w-auto" />
        </div>

        <h2 className="font-display text-2xl font-semibold text-white">Tu Journey está listo</h2>
        <p className="mt-2 text-sm text-white/80">Tus primeras tareas ya están creadas. Revisalas y ajustalas a tu rutina.</p>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-3">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="text-sm font-semibold text-white">
            Ver tareas creadas ({tasks.length})
          </button>
          {expanded ? (
            <div className="mt-2 space-y-1 text-sm text-white/80">
              {preview.map((task) => (
                <p key={task.id}>• {task.title} {task.pillarId ? `· ${task.pillarId}` : ''}</p>
              ))}
              {tasks.length > 5 ? <p>+{tasks.length - 5} más</p> : null}
              <Link to="/dashboard-v3/missions" onClick={onClose} className="inline-block pt-1 text-cyan-300">Ver todas</Link>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
          <p className="font-semibold text-white">Primer paso recomendado</p>
          <p className="text-white/75">Editá tu base para asegurarte de que las tareas encajen con tu energía real.</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="order-2 text-xs text-white/60 sm:order-1 sm:px-3 sm:py-2"
          >
            Ir al Dashboard
          </button>
          <button
            type="button"
            onClick={onEditor}
            className="order-1 inline-flex items-center justify-center rounded-full border border-violet-300/45 bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(76,29,149,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-[0_14px_28px_rgba(76,29,149,0.4)] sm:order-2"
          >
            Editar base / Editar tareas
          </button>
        </div>
      </div>
    </div>
  );
}
