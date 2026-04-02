import { useMemo, useState } from 'react';
import { UserPicker } from '../../components/admin/UserPicker';
import type { AdminUser } from '../../lib/types';
import {
  fetchAdminModeUpgradeAnalysis,
  runAdminHabitAchievementRetroactive,
  runAdminModeUpgradeAnalysis,
  runAdminTaskDifficultyCalibration,
} from '../../lib/adminApi';

export function CoreEnginePage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [running, setRunning] = useState<'mode' | 'calibration' | 'habit' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const scopeLabel = useMemo(() => (selectedUser ? `Usuario: ${selectedUser.email ?? selectedUser.id}` : 'Todos los usuarios'), [selectedUser]);

  const runAction = async (type: 'mode' | 'calibration' | 'habit') => {
    try {
      setRunning(type);
      setMessage(null);
      setError(null);
      if (type === 'mode') {
        if (!selectedUser) {
          setError('Selecciona usuario para correr Mode Upgrade Analysis.');
          return;
        }
        await runAdminModeUpgradeAnalysis(selectedUser.id);
        const result = await fetchAdminModeUpgradeAnalysis(selectedUser.id);
        setAnalysis(`Eligible=${result.eligible_for_upgrade ? 'yes' : 'no'} · passRate=${Math.round(result.task_pass_rate * 100)}%`);
        setMessage('Mode Upgrade Analysis ejecutado.');
      }
      if (type === 'calibration') {
        await runAdminTaskDifficultyCalibration({
          userId: selectedUser?.id,
          windowDays: 90,
          mode: 'baseline',
        });
        setMessage(`Growth Calibration ejecutado (${scopeLabel}).`);
      }
      if (type === 'habit') {
        await runAdminHabitAchievementRetroactive({
          userId: selectedUser?.id,
        });
        setMessage(`Habit Achievement retroactive ejecutado (${scopeLabel}).`);
      }
    } catch (actionError) {
      console.error('[admin2][core-engine] action failed', actionError);
      setError('No se pudo completar la operación de Core Engine.');
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Core Engine</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Growth + Next Level + Habit Achievement</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Pantalla protagonista para las tres patas core del producto.</p>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <UserPicker selectedUserId={selectedUser?.id ?? null} onSelect={setSelectedUser} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionCard
          title="Growth Calibration"
          description="Recalibra dificultad según comportamiento real."
          cta={running === 'calibration' ? 'Ejecutando…' : 'Run Calibration'}
          disabled={Boolean(running)}
          onClick={() => runAction('calibration')}
        />
        <ActionCard
          title="Mode Upgrade Analysis"
          description="Ejecuta análisis de next-level para un usuario específico."
          cta={running === 'mode' ? 'Ejecutando…' : 'Run Analysis'}
          disabled={Boolean(running) || !selectedUser}
          onClick={() => runAction('mode')}
        />
        <ActionCard
          title="Habit Achievement"
          description="Reconstruye elegibilidad y pendientes de hábito."
          cta={running === 'habit' ? 'Ejecutando…' : 'Run Habit Achievement'}
          disabled={Boolean(running)}
          onClick={() => runAction('habit')}
        />
      </section>

      {analysis ? <p className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-[color:var(--admin-text)]">Último análisis: {analysis}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-[color:var(--admin-text)]">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-[color:var(--admin-text)]">{error}</p> : null}
    </div>
  );
}

function ActionCard({
  title,
  description,
  cta,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  cta: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--admin-muted)]">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 rounded-xl border border-[color:var(--admin-border)] px-4 py-2 text-sm font-semibold hover:border-[color:var(--admin-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cta}
      </button>
    </article>
  );
}
