import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getTasks, type UserTask } from '../../lib/api';
import { asArray } from '../../lib/safe';

interface MissionsSectionProps {
  userId: string;
}

export function MissionsSection({ userId }: MissionsSectionProps) {
  const { data, status } = useRequest(() => getTasks(userId), [userId]);
  const tasks = useMemo(() => {
    console.info('[DASH] dataset', { keyNames: Object.keys(data ?? {}), isArray: Array.isArray(data) });
    return asArray<UserTask>(data, 'tasks');
  }, [data]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">🗂️ Misiones</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Lectura solamente
        </span>
      </header>

      {status === 'loading' && <div className="h-32 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && <p className="text-sm text-rose-300">No pudimos listar las misiones.</p>}

      {status === 'success' && tasks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.slice(0, 6).map((task) => (
            <article key={task.task_id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-semibold text-white">🎯 {task.task}</h4>
              <p className="text-xs text-text-muted">Pilar: {task.pillar_id ?? '—'}</p>
              <p className="text-xs text-text-muted">XP base: {task.xp_base}</p>
              <p className="text-xs text-text-muted">Constancia requerida: próximamente</p>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text"
                disabled
              >
                Activar
              </button>
            </article>
          ))}
        </div>
      )}

      {status === 'success' && tasks.length === 0 && (
        <p className="text-sm text-text-muted">Tu base todavía no tiene misiones configuradas.</p>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Mientras el endpoint de misiones dedicado no esté disponible reutilizamos las tareas activas como referencia visual.
      </p>
    </section>
  );
}
