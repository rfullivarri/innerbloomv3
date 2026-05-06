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
  runAdminMonthlyPipeline,
  runAdminMonthlyReview,
  runAdminTaskDifficultyCalibration,
  upsertAdminModeUpgradeCtaOverride,
} from '../../lib/adminApi';
import type { AdminHabitAchievementDiagnosticsRow } from '../../lib/types';

const BTN_PRIMARY = 'admin2-btn admin2-btn--primary';
const BTN_SECONDARY = 'admin2-btn admin2-btn--secondary';
const BTN_GHOST = 'admin2-btn admin2-btn--ghost';
const BTN_DANGER = 'admin2-btn admin2-btn--danger';
const NEXT_MODE_BY_CODE: Record<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE', 'CHILL' | 'FLOW' | 'EVOLVE' | null> = {
  LOW: 'CHILL',
  CHILL: 'FLOW',
  FLOW: 'EVOLVE',
  EVOLVE: null,
};


function getLastClosedMonthPeriodKey(now = new Date()): string {
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeMode(value: string | null | undefined): 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE' | null {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'LOW' || normalized === 'CHILL' || normalized === 'FLOW' || normalized === 'EVOLVE') {
    return normalized;
  }
  return null;
}

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

  const [pipelinePeriodKey, setPipelinePeriodKey] = useState(() => getLastClosedMonthPeriodKey());
  const [pipelineForce, setPipelineForce] = useState(true);
  const [pipelineRunAllUsers, setPipelineRunAllUsers] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<Awaited<ReturnType<typeof runAdminMonthlyPipeline>> | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [manualModeTarget, setManualModeTarget] = useState<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'>('LOW');
  const [manualModeReason, setManualModeReason] = useState('admin_override_manual_mode_change');
  const [changingMode, setChangingMode] = useState(false);
  const [manualModeMessage, setManualModeMessage] = useState<string | null>(null);

  const [ctaOverride, setCtaOverride] = useState<AdminModeUpgradeCtaOverride | null>(null);
  const [ctaEnabled, setCtaEnabled] = useState(false);
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
      setCtaExpiresAt(ctaRes.item?.expires_at ? ctaRes.item.expires_at.slice(0, 16) : '');
    } catch (error) {
      console.error('[admin2][core-engine] failed to load mode data', error);
      setAnalysisError('No se pudo cargar el análisis/override de Rhythm Upgrade Suggestion.');
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


  const runMonthlyPipelineReplay = useCallback(async () => {
    if (!selectedUser && !pipelineRunAllUsers) return;
    setRunningPipeline(true);
    setPipelineError(null);
    try {
      const result = await runAdminMonthlyPipeline({
        periodKey: pipelinePeriodKey,
        force: pipelineForce,
        userId: pipelineRunAllUsers ? undefined : selectedUser?.id,
      });
      setPipelineResult(result);
      if (!pipelineRunAllUsers && selectedUser) {
        await loadModeData();
        await loadHabitDiagnostics();
      }
    } catch (error) {
      console.error(error);
      setPipelineError('No se pudo reejecutar el monthly pipeline.');
    } finally {
      setRunningPipeline(false);
    }
  }, [loadHabitDiagnostics, loadModeData, pipelineForce, pipelinePeriodKey, pipelineRunAllUsers, selectedUser]);

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

  const resolvedCurrentMode = normalizeMode(analysis?.current_mode ?? selectedUser?.gameMode ?? null);
  const resolvedNextMode = resolvedCurrentMode ? NEXT_MODE_BY_CODE[resolvedCurrentMode] : null;
  const canApplyForcedCta = Boolean(selectedUser && resolvedCurrentMode && resolvedNextMode);

  const applyCta = useCallback(async () => {
    if (!selectedUser || !resolvedNextMode) return;
    try {
      setCtaSaving(true);
      setCtaMessage(null);
      const response = await upsertAdminModeUpgradeCtaOverride(selectedUser.id, {
        enabled: ctaEnabled,
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
  }, [ctaEnabled, ctaExpiresAt, resolvedNextMode, selectedUser]);

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
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Growth Calibration · Rhythm Upgrade Suggestion Analysis · Habit Achievement</h2>
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
              {habitResult.outcomes?.length ? (
                <div className="mt-2 max-h-28 overflow-auto rounded border border-[color:var(--admin-border)] p-2">
                  <p className="font-semibold">task outcomes ({habitResult.outcomes.length})</p>
                  {habitResult.outcomes.slice(0, 12).map((outcome) => (
                    <p key={`${outcome.taskId}-${outcome.outcome}-${outcome.detectedPeriodEnd ?? 'none'}`} className="text-[11px] text-[color:var(--admin-muted)]">
                      {outcome.taskId}: {outcome.outcome} · {outcome.reason ?? 'ok'} · {outcome.detectedPeriodEnd ?? '—'} · {outcome.sources.join('+')}
                    </p>
                  ))}
                </div>
              ) : null}
            </div> : null}
            {habitError ? <p className="mt-2 text-xs text-red-300">{habitError}</p> : null}
            <button type="button" onClick={() => void runHabit()} disabled={runningHabit || (!selectedUser && !habitRunAllUsers)} className={`mt-3 ${BTN_PRIMARY}`}>{runningHabit ? 'Running…' : 'Run Habit Achievement Retroactive'}</button>
            <button type="button" onClick={() => void loadHabitDiagnostics()} disabled={!selectedUser || loadingHabitDiagnostics} className={`mt-2 ${BTN_GHOST}`}>
              {loadingHabitDiagnostics ? 'Loading diagnostics…' : 'Reload diagnostics table'}
            </button>
          </article>
        </div>


        <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 text-sm">
          <h3 className="font-semibold">Monthly Pipeline Replay</h3>
          <p className="text-xs text-[color:var(--admin-muted)]">
            Reejecuta el mismo circuito mensual del cron para un período cerrado. Útil para validar Habit Achievement y Rhythm Upgrade con force=true.
          </p>
          <div className="mt-3 grid gap-3 text-xs md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[color:var(--admin-muted)]">periodKey</span>
              <input
                value={pipelinePeriodKey}
                onChange={(event) => setPipelinePeriodKey(event.target.value)}
                placeholder="YYYY-MM"
                className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 self-end">
              <input type="checkbox" checked={pipelineForce} onChange={(event) => setPipelineForce(event.target.checked)} />
              force
            </label>
            <label className="flex items-center gap-2 self-end">
              <input type="checkbox" checked={pipelineRunAllUsers} onChange={(event) => setPipelineRunAllUsers(event.target.checked)} />
              correr para todos
            </label>
            <p className="self-end rounded border border-[color:var(--admin-border)] px-2 py-1">
              scope: <strong>{pipelineRunAllUsers ? 'all_users' : selectedUser?.id ?? 'sin selección'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runMonthlyPipelineReplay()}
            disabled={runningPipeline || (!selectedUser && !pipelineRunAllUsers) || !/^\d{4}-\d{2}$/.test(pipelinePeriodKey)}
            className={`mt-3 ${BTN_PRIMARY}`}
          >
            {runningPipeline ? 'Running…' : 'Force Monthly Pipeline'}
          </button>
          {pipelineError ? <p className="mt-2 text-xs text-red-300">{pipelineError}</p> : null}
          {pipelineResult ? (
            <div className="mt-3 rounded-lg border border-[color:var(--admin-border)] p-3 text-xs">
              <div className="grid gap-2 md:grid-cols-4">
                <p>periodKey: <strong>{pipelineResult.periodKey}</strong></p>
                <p>attempt: <strong>{pipelineResult.attempt ?? '—'}</strong></p>
                <p>userId: <strong>{pipelineResult.userId ?? 'all_users'}</strong></p>
                <p>skipped: <strong>{pipelineResult.skipped ? pipelineResult.reason ?? 'yes' : 'no'}</strong></p>
                <p>calibration evaluated: <strong>{pipelineResult.calibration?.evaluated ?? '—'}</strong></p>
                <p>aggregation processed: <strong>{pipelineResult.aggregation?.processed ?? '—'}</strong></p>
                <p>aggregation scope: <strong>{pipelineResult.aggregation?.scope ?? '—'}</strong></p>
              </div>
              {pipelineResult.habitAchievement ? (
                <div className="mt-3 rounded border border-[color:var(--admin-border)] p-2">
                  <p className="font-semibold">Habit Achievement</p>
                  <p>
                    evaluated {pipelineResult.habitAchievement.evaluated} · qualified {pipelineResult.habitAchievement.qualified} · pendingCreated {pipelineResult.habitAchievement.pendingCreated}
                  </p>
                  <p>
                    skipped {pipelineResult.habitAchievement.skipped} · ignored {pipelineResult.habitAchievement.ignored} · errors {pipelineResult.habitAchievement.errors}
                  </p>
                  {pipelineResult.habitAchievement.outcomes?.length ? (
                    <div className="mt-2 max-h-36 overflow-auto rounded border border-[color:var(--admin-border)] p-2">
                      <p className="font-semibold">first outcomes</p>
                      {pipelineResult.habitAchievement.outcomes.slice(0, 12).map((outcome) => (
                        <p key={`${outcome.taskId}-${outcome.outcome}-${outcome.detectedPeriodEnd ?? 'none'}`} className="text-[11px] text-[color:var(--admin-muted)]">
                          {outcome.taskId}: {outcome.outcome} · {outcome.reason ?? 'ok'} · {outcome.detectedPeriodEnd ?? '—'} · {outcome.sources.join('+')}
                        </p>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-[11px] text-[color:var(--admin-muted)]">No outcomes returned.</p>}
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

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
          <h3 className="font-semibold">Rhythm Upgrade Suggestion Analysis</h3>
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
            <p className="rounded border border-[color:var(--admin-border)] px-2 py-1">Current real: <strong>{resolvedCurrentMode ?? '—'}</strong></p>
            <p className="rounded border border-[color:var(--admin-border)] px-2 py-1">Next valid: <strong>{resolvedNextMode ?? 'No upgrade'}</strong></p>
            <input type="datetime-local" value={ctaExpiresAt} onChange={(e) => setCtaExpiresAt(e.target.value)} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1" />
            <div className="md:col-span-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void applyManualMode()} disabled={!selectedUser || changingMode} className={BTN_SECONDARY}>{changingMode ? 'Changing…' : 'Apply Manual Mode Change'}</button>
              <select value={manualModeTarget} onChange={(e) => setManualModeTarget(e.target.value as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE')} className="rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1"><option>LOW</option><option>CHILL</option><option>FLOW</option><option>EVOLVE</option></select>
              <input value={manualModeReason} onChange={(e) => setManualModeReason(e.target.value)} className="min-w-52 flex-1 rounded border border-[color:var(--admin-border)] bg-transparent px-2 py-1" />
              <button type="button" onClick={() => void applyCta()} disabled={!canApplyForcedCta || ctaSaving} className={BTN_PRIMARY}>{ctaSaving ? 'Applying…' : 'Apply Forced CTA'}</button>
              <button type="button" onClick={() => void clearCta()} disabled={!selectedUser || ctaClearing} className={BTN_DANGER}>{ctaClearing ? 'Clearing…' : 'Clear Forced CTA'}</button>
              <span className="text-[11px]">override actual: <strong>{ctaLoading ? 'cargando…' : ctaOverride?.enabled ? 'enabled' : 'disabled'}</strong></span>
              {!resolvedNextMode ? <span className="text-[11px] text-amber-300">Current mode is EVOLVE: forced CTA is disabled.</span> : null}
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
