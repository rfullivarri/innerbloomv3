import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserTask } from '../../lib/api';

export function JourneyReadyModal({
  open,
  tasks,
  onClose,
  onEditor,
  onQuest,
}: {
  open: boolean;
  tasks: UserTask[];
  onClose: () => void;
  onEditor: () => void;
  onQuest: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(() => tasks.slice(0, 5), [tasks]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/20 bg-surface p-4 md:inset-auto md:left-1/2 md:top-1/2 md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-white">Tu Journey está listo</h2>
        <p className="mt-2 text-sm text-white/80">
          Tus primeras tareas ya están creadas. Ahora te recomendamos 2 pasos para empezar bien.
        </p>

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

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold text-white">Edita tus tareas</p>
            <p className="text-white/75">Ajusta duración y dificultad para que encajen con tu rutina.</p>
            <button type="button" onClick={onEditor} className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Editar tareas</button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold text-white">Haz tu primer Daily Quest</p>
            <p className="text-white/75">Completa tu primer check-in para activar tu ritmo y tus rachas.</p>
            <button type="button" onClick={onQuest} className="mt-2 rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white">Ir a Daily Quest</button>
          </div>
        </div>

        <button type="button" onClick={onClose} className="mt-4 text-xs text-white/60">Ir al Dashboard</button>
      </div>
    </div>
  );
}
