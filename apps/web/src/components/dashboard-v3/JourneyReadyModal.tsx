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
    <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-white/20 bg-surface p-4 md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[80vh] md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
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
            className="order-1 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black sm:order-2"
          >
            Editar base / Editar tareas
          </button>
        </div>
      </div>
    </div>
  );
}
