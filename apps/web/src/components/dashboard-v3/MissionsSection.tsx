import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserTasks, type UserTask } from '../../lib/api';
import { asArray } from '../../lib/safe';
import { Card } from '../ui/Card';

interface MissionsSectionProps {
  userId: string;
}

export function MissionsSection({ userId }: MissionsSectionProps) {
  const { data, status } = useRequest(() => getUserTasks(userId), [userId]);
  const tasks = useMemo(() => {
    console.info('[DASH] dataset', { keyNames: Object.keys(data ?? {}), isArray: Array.isArray(data) });
    return asArray<UserTask>(data, 'tasks');
  }, [data]);

  return (
    <Card
      title="🗂️ Misiones"
      subtitle="Lectura solamente"
      rightSlot={
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
          Próximamente acciones
        </span>
      }
    >
      {status === 'loading' && <div className="h-32 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && <p className="text-sm text-rose-300">No pudimos listar las misiones.</p>}

      {status === 'success' && tasks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.slice(0, 6).map((task) => (
            <article key={task.id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-semibold text-slate-100">🎯 {task.title}</h4>
              <p className="text-xs text-slate-400">Pilar: {task.pillarId ?? '—'}</p>
              <p className="text-xs text-slate-400">Rasgo: {task.traitId ?? '—'}</p>
              <p className="text-xs text-slate-400">Stat: {task.statId ?? '—'}</p>
              {task.xp != null && (
                <p className="text-xs text-slate-400">GP base: {task.xp}</p>
              )}
              <p className="text-xs text-slate-400">Constancia requerida: próximamente</p>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200"
                disabled
              >
                Activar
              </button>
            </article>
          ))}
        </div>
      )}

      {status === 'success' && tasks.length === 0 && (
        <p className="text-sm text-slate-400">Tu base todavía no tiene misiones configuradas.</p>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Mientras el endpoint de misiones dedicado no esté disponible reutilizamos las tareas activas como referencia visual.
      </p>
    </Card>
  );
}
