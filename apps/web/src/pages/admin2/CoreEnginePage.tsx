import { useCallback, useEffect, useState } from 'react';
import { UserPicker } from '../../components/admin/UserPicker';
import type {
  AdminModeUpgradeAnalysis,
  AdminModeUpgradeCtaOverride,
  AdminUser,
} from '../../lib/types';
import {
  changeAdminUserGameMode,
  clearAdminModeUpgradeCtaOverride,
  fetchAdminHabitAchievementDiagnostics,
  fetchAdminModeUpgradeAnalysis,
  fetchAdminModeUpgradeCtaOverride,
  runAdminHabitAchievementRetroactive,
  runAdminModeUpgradeAnalysis,
  runAdminMonthlyReview,
  runAdminTaskDifficultyCalibration,
  upsertAdminModeUpgradeCtaOverride,
} from '../../lib/adminApi';
import type { AdminHabitAchievementDiagnosticsRow } from '../../lib/types';

const BTN_PRIMARY = 'admin2-btn admin2-btn--primary';
const BTN_SECONDARY = 'admin2-btn admin2-btn--secondary';
const BTN_GHOST = 'admin2-btn admin2-btn--ghost';
const BTN_DANGER = 'admin2-btn admin2-btn--danger';

export function CoreEnginePage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [calibrationWindowDays, setCalibrationWindowDays] = useState(90);
  const [calibrationRunAllUsers, setCalibrationRunAllUsers] = useState(false);
  const [runningCalibration, setRunningCalibration] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<Awaited<ReturnType<typeof runAdminTaskDifficultyCalibration>> | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const [habitRunAllUsers, setHabitRunAllUsers] = useState(false);
  const [runningHabit, setRunningHabit] = useState(false);
  const [habitResult, setHabitResult] = useState<Awaited<ReturnType<typeof runAdminHabitAchievementRetroactive>> | null>(null);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [habitDiagnostics, setHabitDiagnostics] = useState<AdminHabitAchievementDiagnosticsRow[]>([]);
  const [habitDiagnosticsGeneratedAt, setHabitDiagnosticsGeneratedAt] = useState<string | null>(null);
  const [loadingHabitDiagnostics, setLoadingHabitDiagnostics] = useState(false);
  const [habitDiagnosticsError, setHabitDiagnosticsError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AdminModeUpgradeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [runningMonthly, setRunningMonthly] = useState(false);
  const [runningRolling, setRunningRolling] = useState(false);

  const [manualModeTarget, setManualModeTarget] = useState<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'>('LOW');
  const [manualModeReason, setManualModeReason] = useState('admin_override_manual_mode_change');
  const [changingMode, setChangingMode] = useState(false);
  const [manualModeMessage, setManualModeMessage] = useState<string | null>(null);

  const [ctaOverride, setCtaOverride] = useState<AdminModeUpgradeCtaOverride | null>(null);
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaCurrentMode, setCtaCurrentMode] = useState<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'>('LOW');
  const [ctaNextMode, setCtaNextMode] = useState<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'>('CHILL');
  const [ctaExpiresAt, setCtaExpiresAt] = useState('');
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaSaving, setCtaSaving] = useState(false);
  const [ctaClearing, setCtaClearing] = useState(false);
  const [ctaMessage, setCtaMessage] = useState<string | null>(null);

  const scopeLabel = calibrationRunAllUsers || habitRunAllUsers ? 'all_users' : selectedUser?.id ?? 'none';

  const loadModeData = useCallback(async () => {
    if (!selectedUser) {
      setAnalysis(null);
      setCtaOverride(null);
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    setCtaLoading(true);

    try {
      const [analysisRes, ctaRes] = await Promise.all([
        fetchAdminModeUpgradeAnalysis(selectedUser.id),
        fetchAdminModeUpgradeCtaOverride(selectedUser.id),
      ]);
      setAnalysis(analysisRes);
      setCtaOverride(ctaRes.item);
      setCtaEnabled(Boolean(ctaRes.item?.enabled));
      setCtaCurrentMode((ctaRes.item?.forced_current_mode as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE') ?? 'LOW');
      setCtaNextMode((ctaRes.item?.forced_next_mode as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE') ?? 'CHILL');
      setCtaExpiresAt(ctaRes.item?.expires_at ? ctaRes.item.expires_at.slice(0, 16) : '');
    } catch (error) {
      console.error('[admin2][core-engine] failed to load mode data', error);
      setAnalysisError('No se pudo cargar el análisis/override de mode upgrade.');
    } finally {
      setAnalysisLoading(false);
      setCtaLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    void loadModeData();
  }, [loadModeData]);

  const runCalibration = useCallback(async () => {
    if (!selectedUser && !calibrationRunAllUsers) return;
    try {
      setRunningCalibration(true);
      setCalibrationError(null);
      setCalibrationResult(
        await runAdminTaskDifficultyCalibration({
          userId: calibrationRunAllUsers ? undefined : selectedUser?.id,
          windowDays: calibrationWindowDays,
          mode: 'baseline',
        }),
      );
    } catch (error) {
      console.error(error);
      setCalibrationError('No se pudo ejecutar calibración.');
    } finally {
      setRunningCalibration(false);
    }
  }, [calibrationRunAllUsers, calibrationWindowDays, selectedUser]);

  const runHabit = useCallback(async () => {
    if (!selectedUser && !habitRunAllUsers) return;
    try {
      setRunningHabit(true);
      setHabitError(null);
      setHabitResult(await runAdminHabitAchievementRetroactive({ userId: habitRunAllUsers ? undefined : selectedUser?.id }));
      if (!habitRunAllUsers && selectedUser) {
        setLoadingHabitDiagnostics(true);
        setHabitDiagnosticsError(null);
        const diagnostics = await fetchAdminHabitAchievementDiagnostics(selectedUser.id);
        setHabitDiagnostics(diagnostics.rows);
        setHabitDiagnosticsGeneratedAt(diagnostics.generatedAt);
      }
    } catch (error) {
      console.error(error);
      setHabitError('No se pudo ejecutar Habit Achievement Retroactive.');
      setHabitDiagnosticsError('No se pudo cargar diagnóstico por tarea.');
    } finally {
      setRunningHabit(false);
      setLoadingHabitDiagnostics(false);
    }
  }, [habitRunAllUsers, selectedUser]);

  const loadHabitDiagnostics = useCallback(async () => {
    if (!selectedUser) {
      setHabitDiagnostics([]);
      setHabitDiagnosticsGeneratedAt(null);
      setHabitDiagnosticsError(null);
      return;
    }
    try {
      setLoadingHabitDiagnostics(true);
      setHabitDiagnosticsError(null);
      const diagnostics = await fetchAdminHabitAchievementDiagnostics(selectedUser.id);
      setHabitDiagnostics(diagnostics.rows);
      setHabitDiagnosticsGeneratedAt(diagnostics.generatedAt);
    } catch (error) {
      console.error(error);
      setHabitDiagnosticsError('No se pudo cargar diagnóstico por tarea.');
    } finally {
      setLoadingHabitDiagnostics(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    void loadHabitDiagnostics();
  }, [loadHabitDiagnostics]);

  const runMonthly = useCallback(async () => {
    if (!selectedUser) return;
    setRunningMonthly(true);
    setAnalysisError(null);
    try {
      await runAdminMonthlyReview(selectedUser.id);
      await loadModeData();
    } catch (error) {
      console.error(error);
      setAnalysisError('No se pudo ejecutar monthly analysis.');
    } finally {
      setRunningMonthly(false);
    }
  }, [loadModeData, selectedUser]);

  const runRolling = useCallback(async () => {
    if (!selectedUser) return;
    setRunningRolling(true);
    setAnalysisError(null);
    try {
      const refreshed = await runAdminModeUpgradeAnalysis(selectedUser.id);
      setAnalysis(refreshed);
    } catch (error) {
      console.error(error);
      setAnalysisError('No se pudo ejecutar rolling analysis.');
    } finally {
      setRunningRolling(false);
    }
  }, [selectedUser]);

  const applyManualMode = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setChangingMode(true);
      setManualModeMessage(null);
      const response = await changeAdminUserGameMode(selectedUser.id, {
        targetModeKey: manualModeTarget,
        reason: manualModeReason || 'admin_override_manual_mode_change',
      });
      setManualModeMessage(`Modo actualizado a ${response.game_mode_code}.`);
      await loadModeData();
    } catch (error) {
      console.error(error);
      setAnalysisError('No se pudo aplicar cambio manual de modo.');
    } finally {
      setChangingMode(false);
    }
  }, [loadModeData, manualModeReason, manualModeTarget, selectedUser]);

  const applyCta = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setCtaSaving(true);
      setCtaMessage(null);
      const response = await upsertAdminModeUpgradeCtaOverride(selectedUser.id, {
        enabled: ctaEnabled,
        forcedCurrentMode: ctaCurrentMode,
        forcedNextMode: ctaNextMode,
        expiresAt: ctaExpiresAt ? new Date(ctaExpiresAt).toISOString() : null,
      });
      setCtaOverride(response.item);
      setCtaMessage('Forced CTA aplicado.');
    } catch (error) {
      console.error(error);
      setCtaMessage('No se pudo aplicar forced CTA.');
    } finally {
      setCtaSaving(false);
    }
  }, [ctaCurrentMode, ctaEnabled, ctaExpiresAt, ctaNextMode, selectedUser]);

  const clearCta = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setCtaClearing(true);
      await clearAdminModeUpgradeCtaOverride(selectedUser.id);
      setCtaOverride(null);
      setCtaEnabled(false);
      setCtaMessage('Forced CTA limpiado.');
    } catch (error) {
      console.error(error);
      setCtaMessage('No se pudo limpiar forced CTA.');
    } finally {
      setCtaClearing(false);
    }
  }, [selectedUser]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Core Engine v2</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Growth Calibration · Mode Upgrade Analysis · Habit Achievement</h2>
      </header>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
        <UserPicker compact selectedUserId={selectedUser?.id ?? null} onSelect={setSelectedUser} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
          <h3 className="font-semibold">Growth Calibration</h3>
          <p className="text-xs text-[color:var(--admin-muted)]">Recalibra dificultad usando ventana histórica y ajuste baseline.</p>
          <div className="mt-2 space-y-2 text-xs">
            <p>Scope actual: <strong>{calibrationRunAllUsers ? 'all_users' : selectedUser?.id ?? 'sin selección'}</strong></p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={calibrationRunAllUsers} onChange={(e) => setCalibrationRunAllUsers(e.target.checked)} /> correr para todos</label>
            <label className="flex items-center gap-2">windowDays <input type="number" min={1} max={3650} value={calibrationWindowDays} onChange={(e) => setCalibrationWindowDays(Math.max(1, Number(e.target.value || 90)))} className="w-20 rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1" /></label>
            <p>strategy/mode: <strong>baseline</strong></p>
          </div>
          {calibrationResult ? <div className="mt-2 rounded-lg border border-[color:var(--admin-border)] p-2 text-xs">
            <p>evaluated {calibrationResult.evaluated} · adjusted {calibrationResult.adjusted} · ignored {calibrationResult.ignored} · skipped {calibrationResult.skipped}</p>
            <p>up {calibrationResult.actionBreakdown.up} · keep {calibrationResult.actionBreakdown.keep} · down {calibrationResult.actionBreakdown.down}</p>
            <p>errors {calibrationResult.errors.length}</p>
          </div> : null}
          {calibrationError ? <p className="mt-2 text-xs text-red-300">{calibrationError}</p> : null}
          <button type="button" onClick={() => void runCalibration()} disabled={runningCalibration || (!selectedUser && !calibrationRunAllUsers)} className={`mt-3 ${BTN_PRIMARY}`}>{runningCalibration ? 'Running…' : 'Run Calibration'}</button>
          </article>

          <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
            <h3 className="font-semibold">Habit Achievement</h3>
            <p className="text-xs text-[color:var(--admin-muted)]">Detección retroactiva para crear pendings y resolver expirados.</p>
            <div className="mt-2 space-y-2 text-xs">
              <p>scope: <strong>{habitRunAllUsers ? 'all_users' : selectedUser?.id ?? 'sin selección'}</strong></p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={habitRunAllUsers} onChange={(e) => setHabitRunAllUsers(e.target.checked)} /> correr para todos</label>
            </div>
            {habitResult ? <div className="mt-2 rounded-lg border border-[color:var(--admin-border)] p-2 text-xs">
              <p>pendingCreated {habitResult.pendingCreated} · qualified {habitResult.qualified} · evaluated {habitResult.evaluated}</p>
              <p>skipped {habitResult.skipped} · ignored {habitResult.ignored} · expiredResolved {habitResult.expiredResolved} · errors {habitResult.errors}</p>
            </div> : null}
            {habitError ? <p className="mt-2 text-xs text-red-300">{habitError}</p> : null}
            <button type="button" onClick={() => void runHabit()} disabled={runningHabit || (!selectedUser && !habitRunAllUsers)} className={`mt-3 ${BTN_PRIMARY}`}>{runningHabit ? 'Running…' : 'Run Habit Achievement Retroactive'}</button>
            <button type="button" onClick={() => void loadHabitDiagnostics()} disabled={!selectedUser || loadingHabitDiagnostics} className={`mt-2 ${BTN_GHOST}`}>
              {loadingHabitDiagnostics ? 'Loading diagnostics…' : 'Reload diagnostics table'}
            </button>
          </article>
        </div>

        <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Habit Achievement Diagnostics</h3>
              <p className="text-xs text-[color:var(--admin-muted)]">Vista por tarea para detectar qué regla rompe la calificación.</p>
            </div>
            {habitDiagnosticsGeneratedAt ? (
              <p className="text-[11px] text-[color:var(--admin-muted)]">updated {new Date(habitDiagnosticsGeneratedAt).toLocaleString()}</p>
            ) : null}
          </div>
          {!selectedUser ? <p className="mt-2 text-xs text-[color:var(--admin-muted)]">Selecciona usuario para ver diagnóstico.</p> : null}
          {habitDiagnosticsError ? <p className="mt-2 text-xs text-red-300">{habitDiagnosticsError}</p> : null}
          {selectedUser ? (
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[color:var(--admin-border)]">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--admin-border)]">
                    <th className="px-2 py-1">Task</th>
                    <th className="px-2 py-1">Qualifies</th>
                    <th className="px-2 py-1">3M Consecutive</th>
                    <th className="px-2 py-1">Aggregate</th>
                    <th className="px-2 py-1">Goal Months</th>
                    <th className="px-2 py-1">2/3 ≥ 80%</th>
                    <th className="px-2 py-1">Any &lt; 50%</th>
                    <th className="px-2 py-1">Months Eval</th>
                    <th className="px-2 py-1">Detected End</th>
                    <th className="px-2 py-1">Final Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {habitDiagnostics.map((row) => (
                    <tr key={row.taskId} className="border-b border-[color:var(--admin-border)]">
                      <td className="px-2 py-1">{row.taskName}</td>
                      <td className="px-2 py-1">{row.qualifiesOverall ? '✅' : '❌'}</td>
                      <td className="px-2 py-1">{row.consecutiveWindowPass ? '✅' : '❌'}</td>
                      <td className="px-2 py-1">{Math.round(row.aggregateCompletionRate * 100)}%</td>
                      <td className="px-2 py-1">{row.monthsMeetingGoal}/{row.windowMonths}</td>
                      <td className="px-2 py-1">{row.twoOfThreeMonthsPass ? '✅' : '❌'}</td>
                      <td className="px-2 py-1">{row.anyMonthBelowFloor ? 'yes' : 'no'}</td>
                      <td className="px-2 py-1">{row.monthsEvaluated}/{row.windowMonths}</td>
                      <td className="px-2 py-1">{row.detectedPeriodEnd ?? '—'}</td>
                      <td className="px-2 py-1">{row.dominantReason}</td>
                    </tr>
                  ))}
                  {habitDiagnostics.length === 0 ? (
                    <tr>
                      <td className="px-2 py-2 text-[color:var(--admin-muted)]" colSpan={10}>
                        {loadingHabitDiagnostics ? 'Loading…' : 'No diagnostic rows for selected user.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
          <h3 className="font-semibold">Mode Upgrade Analysis</h3>
          <p className="text-xs text-[color:var(--admin-muted)]">Distingue análisis real vs forced/admin override y permite conmutar entre ambos.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void runMonthly()} disabled={!selectedUser || runningMonthly} className={BTN_SECONDARY}>{runningMonthly ? 'Running…' : 'Run Monthly Analysis'}</button>
            <button type="button" onClick={() => void runRolling()} disabled={!selectedUser || runningRolling} className={BTN_GHOST}>{runningRolling ? 'Running…' : 'Recompute Rolling Analysis'}</button>
          </div>
          {analysisLoading ? <p className="mt-2 text-xs">Cargando análisis…</p> : null}
          {analysis ? <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
            <p>current mode: <strong>{analysis.current_mode ?? '—'}</strong></p><p>next mode: <strong>{analysis.next_mode ?? '—'}</strong></p><p>eligible_for_upgrade: <strong>{analysis.eligible_for_upgrade ? 'yes' : 'no'}</strong></p>
            <p>threshold: <strong>{analysis.threshold}%</strong></p><p>pass rate: <strong>{analysis.task_pass_rate}%</strong></p><p>tasks_total_evaluated: <strong>{analysis.tasks_total_evaluated}</strong></p>
            <p>tasks_meeting_goal: <strong>{analysis.tasks_meeting_goal}</strong></p><p>missing tasks: <strong>{analysis.missing_tasks ?? 0}</strong></p><p>analysis window: <strong>{analysis.analysis_start} → {analysis.analysis_end}</strong></p>
            <p className="md:col-span-3">reason_if_empty: <strong>{analysis.reason_if_empty ?? '—'}</strong></p>
          </div> : null}

          {analysis?.tasks?.length ? <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-[color:var(--admin-border)]">
            <table className="min-w-full text-left text-xs"><thead><tr className="border-b border-[color:var(--admin-border)]"><th className="px-2 py-1">Task</th><th className="px-2 py-1">Actual/Expected</th><th className="px-2 py-1">Completion</th><th className="px-2 py-1">Goal</th></tr></thead><tbody>
              {analysis.tasks.map((task) => <tr key={task.task_id} className="border-b border-[color:var(--admin-border)]"><td className="px-2 py-1">{task.task_name}</td><td className="px-2 py-1">{task.actual_count}/{task.expected_count}</td><td className="px-2 py-1">{task.completion_rate}%</td><td className="px-2 py-1">{task.meets_goal ? '✅' : '❌'}</td></tr>)}
            </tbody></table>
          </div> : null}

          <div className="mt-3 grid gap-2 rounded-lg border border-[color:var(--admin-border)] p-2 text-xs md:grid-cols-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={ctaEnabled} onChange={(e) => setCtaEnabled(e.target.checked)} /> Forced CTA</label>
            <select value={ctaCurrentMode} onChange={(e) => setCtaCurrentMode(e.target.value as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE')} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1"><option>LOW</option><option>CHILL</option><option>FLOW</option><option>EVOLVE</option></select>
            <select value={ctaNextMode} onChange={(e) => setCtaNextMode(e.target.value as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE')} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1"><option>LOW</option><option>CHILL</option><option>FLOW</option><option>EVOLVE</option></select>
            <input type="datetime-local" value={ctaExpiresAt} onChange={(e) => setCtaExpiresAt(e.target.value)} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1" />
            <div className="md:col-span-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void applyManualMode()} disabled={!selectedUser || changingMode} className={BTN_SECONDARY}>{changingMode ? 'Changing…' : 'Apply Manual Mode Change'}</button>
              <select value={manualModeTarget} onChange={(e) => setManualModeTarget(e.target.value as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE')} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1"><option>LOW</option><option>CHILL</option><option>FLOW</option><option>EVOLVE</option></select>
              <input value={manualModeReason} onChange={(e) => setManualModeReason(e.target.value)} className="min-w-52 flex-1 rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1" />
              <button type="button" onClick={() => void applyCta()} disabled={!selectedUser || ctaSaving} className={BTN_PRIMARY}>{ctaSaving ? 'Applying…' : 'Apply Forced CTA'}</button>
              <button type="button" onClick={() => void clearCta()} disabled={!selectedUser || ctaClearing} className={BTN_DANGER}>{ctaClearing ? 'Clearing…' : 'Clear Forced CTA'}</button>
              <span className="text-[11px]">override actual: <strong>{ctaLoading ? 'cargando…' : ctaOverride?.enabled ? 'enabled' : 'disabled'}</strong></span>
            </div>
          </div>
          {analysisError ? <p className="mt-2 text-xs text-red-300">{analysisError}</p> : null}
          {manualModeMessage ? <p className="mt-1 text-xs text-emerald-300">{manualModeMessage}</p> : null}
          {ctaMessage ? <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{ctaMessage}</p> : null}
        </article>
      </section>

      <p className="text-xs text-[color:var(--admin-muted)]">Scope combinado actual: {scopeLabel}</p>
    </div>
  );
}
