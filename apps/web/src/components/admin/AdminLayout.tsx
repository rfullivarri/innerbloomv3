import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdminInsights,
  AdminLogRow,
  AdminModeUpgradeAnalysis,
  AdminModeUpgradeCtaOverride,
  AdminTaskSummaryRow,
  AdminUser,
  AdminUserSubscriptionResponse,
  SubscriptionStatus,
} from '../../lib/types';
import {
  exportAdminLogsCsv,
  fetchAdminInsights,
  fetchAdminLogs,
  fetchAdminTaskStats,
  fetchAdminUserSubscription,
  fetchAdminModeUpgradeAnalysis,
  fetchAdminModeUpgradeCtaOverride,
  upsertAdminModeUpgradeCtaOverride,
  clearAdminModeUpgradeCtaOverride,
  runAdminModeUpgradeAnalysis,
  runAdminMonthlyReview,
  changeAdminUserGameMode,
  sendAdminDailyReminder,
  sendAdminTasksReadyEmail,
  updateAdminUserSubscription,
  runAdminTaskDifficultyCalibration,
  fetchAdminTaskDifficultyCalibrationAudit,
  runAdminHabitAchievementRetroactive,
  type AdminTaskDifficultyCalibrationAuditRow,
  type AdminTaskDifficultyCalibrationRunResponse,
} from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { AdminDataTable } from './AdminDataTable';
import { FiltersBar, type AdminFilters } from './FiltersBar';
import { InsightsChips } from './InsightsChips';
import { AdminTaskSummaryTable } from './AdminTaskSummaryTable';
import { UserPicker } from './UserPicker';
import { TaskgenTracePanel } from './TaskgenTracePanel';

const DEFAULT_FILTERS: AdminFilters = {
  from: undefined,
  to: undefined,
  q: '',
  page: 1,
  pageSize: 10,
};

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: 'Trial',
  active: 'Activa',
  past_due: 'Past due',
  canceled: 'Cancelada',
  expired: 'Expirada',
};

const NEXT_MODE_BY_CODE: Record<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE', 'CHILL' | 'FLOW' | 'EVOLVE' | null> = {
  LOW: 'CHILL',
  CHILL: 'FLOW',
  FLOW: 'EVOLVE',
  EVOLVE: null,
};

function normalizeMode(value: string | null | undefined): 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE' | null {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'LOW' || normalized === 'CHILL' || normalized === 'FLOW' || normalized === 'EVOLVE') {
    return normalized;
  }
  return null;
}

type LogsState = {
  items: AdminLogRow[];
  page: number;
  pageSize: number;
  total: number;
};

export function AdminLayout() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'taskTotals' | 'taskgen'>('logs');
  const [filters, setFilters] = useState<AdminFilters>(DEFAULT_FILTERS);
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [logs, setLogs] = useState<LogsState>({ items: [], page: 1, pageSize: 10, total: 0 });
  const [taskStats, setTaskStats] = useState<AdminTaskSummaryRow[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingTaskStats, setLoadingTaskStats] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [taskStatsError, setTaskStatsError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [sendingTasksReady, setSendingTasksReady] = useState(false);
  const [tasksReadySuccess, setTasksReadySuccess] = useState<string | null>(null);
  const [tasksReadyError, setTasksReadyError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<AdminUserSubscriptionResponse | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  const [subscriptionActionMessage, setSubscriptionActionMessage] = useState<string | null>(null);
  const [modeUpgradeAnalysis, setModeUpgradeAnalysis] = useState<AdminModeUpgradeAnalysis | null>(null);
  const [loadingModeUpgradeAnalysis, setLoadingModeUpgradeAnalysis] = useState(false);
  const [modeUpgradeAnalysisError, setModeUpgradeAnalysisError] = useState<string | null>(null);
  const [modeUpgradeCtaOverride, setModeUpgradeCtaOverride] = useState<AdminModeUpgradeCtaOverride | null>(null);
  const [modeUpgradeCtaOverrideEnabled, setModeUpgradeCtaOverrideEnabled] = useState(false);
  const [modeUpgradeCtaOverrideExpiresAt, setModeUpgradeCtaOverrideExpiresAt] = useState('');
  const [modeUpgradeCtaOverrideLoading, setModeUpgradeCtaOverrideLoading] = useState(false);
  const [modeUpgradeCtaOverrideSaving, setModeUpgradeCtaOverrideSaving] = useState(false);
  const [modeUpgradeCtaOverrideClearing, setModeUpgradeCtaOverrideClearing] = useState(false);
  const [modeUpgradeCtaOverrideMessage, setModeUpgradeCtaOverrideMessage] = useState<string | null>(null);
  const [modeUpgradeCtaOverrideError, setModeUpgradeCtaOverrideError] = useState<string | null>(null);
  const [runningMonthlyReview, setRunningMonthlyReview] = useState(false);
  const [monthlyReviewMessage, setMonthlyReviewMessage] = useState<string | null>(null);
  const [monthlyReviewError, setMonthlyReviewError] = useState<string | null>(null);
  const [runningRollingAnalysis, setRunningRollingAnalysis] = useState(false);
  const [manualModeTarget, setManualModeTarget] = useState<'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'>('LOW');
  const [manualModeReason, setManualModeReason] = useState('admin_override_manual_mode_change');
  const [changingMode, setChangingMode] = useState(false);
  const [manualModeMessage, setManualModeMessage] = useState<string | null>(null);
  const [manualModeError, setManualModeError] = useState<string | null>(null);
  const [calibrationWindowDays, setCalibrationWindowDays] = useState(90);
  const [calibrationMode] = useState<'baseline'>('baseline');
  const [calibrationRunAllUsers, setCalibrationRunAllUsers] = useState(false);
  const [runningCalibration, setRunningCalibration] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<AdminTaskDifficultyCalibrationRunResponse | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [calibrationAuditRows, setCalibrationAuditRows] = useState<AdminTaskDifficultyCalibrationAuditRow[]>([]);
  const [calibrationAuditSummary, setCalibrationAuditSummary] = useState<{ down: number; keep: number; up: number }>({
    down: 0,
    keep: 0,
    up: 0,
  });
  const [loadingCalibrationAudit, setLoadingCalibrationAudit] = useState(false);
  const [calibrationAuditError, setCalibrationAuditError] = useState<string | null>(null);
  const calibrationErrorsPreview = calibrationResult?.errors.slice(0, 5) ?? [];
  const [habitAchievementRunAllUsers, setHabitAchievementRunAllUsers] = useState(false);
  const [runningHabitAchievement, setRunningHabitAchievement] = useState(false);
  const [habitAchievementResult, setHabitAchievementResult] = useState<{
    scope: 'single_user' | 'all_users';
    userId: string | null;
    expiredResolved: number;
    evaluated: number;
    qualified: number;
    pendingCreated: number;
    skipped: number;
    ignored: number;
    errors: number;
  } | null>(null);
  const [habitAchievementError, setHabitAchievementError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUser) {
      setInsights(null);
      setLogs({ items: [], page: 1, pageSize: filters.pageSize, total: 0 });
      setTaskStats([]);
      return;
    }

    let cancelled = false;
    setLoadingInsights(true);
    setInsightsError(null);

    fetchAdminInsights(selectedUser.id, {
      from: filters.from,
      to: filters.to,
    })
      .then((data) => {
        if (!cancelled) {
          setInsights(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch insights', err);
        if (!cancelled) {
          setInsightsError('No se pudieron cargar los insights.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInsights(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser, filters.from, filters.to]);

  useEffect(() => {
    if (!selectedUser) {
      setLogs({ items: [], page: 1, pageSize: filters.pageSize, total: 0 });
      return;
    }

    let cancelled = false;
    setLoadingLogs(true);
    setLogsError(null);

    fetchAdminLogs(selectedUser.id, {
      from: filters.from,
      to: filters.to,
      q: filters.q,
      page: filters.page,
      pageSize: filters.pageSize,
    })
      .then((data) => {
        if (!cancelled) {
          setLogs({
            items: data.items,
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
          });
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch logs', err);
        if (!cancelled) {
          setLogsError('No se pudieron cargar los logs.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLogs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser, filters.from, filters.to, filters.q, filters.page, filters.pageSize]);

  useEffect(() => {
    if (!selectedUser) {
      setTaskStats([]);
      return;
    }

    if (activeTab !== 'taskTotals') {
      return;
    }

    let cancelled = false;
    setLoadingTaskStats(true);
    setTaskStatsError(null);

    fetchAdminTaskStats(selectedUser.id, {
      from: filters.from,
      to: filters.to,
      q: filters.q ? filters.q : undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setTaskStats(data);
        }
      })
      .catch((err: unknown) => {
        console.error('[admin] failed to fetch task stats', err);
        if (!cancelled) {
          setTaskStatsError('No se pudieron cargar los totales de tareas.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTaskStats(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedUser, filters.from, filters.to, filters.q]);

  const handleSelectUser = useCallback((user: AdminUser | null) => {
    setSelectedUser(user);
    setFilters(DEFAULT_FILTERS);
    setActiveTab('logs');
    setReminderSuccess(null);
    setReminderError(null);
    setTasksReadySuccess(null);
    setTasksReadyError(null);
    setSubscriptionData(null);
    setSubscriptionError(null);
    setSubscriptionActionMessage(null);
    setModeUpgradeAnalysis(null);
    setModeUpgradeAnalysisError(null);
    setModeUpgradeCtaOverride(null);
    setModeUpgradeCtaOverrideEnabled(false);
    setModeUpgradeCtaOverrideExpiresAt('');
    setModeUpgradeCtaOverrideMessage(null);
    setModeUpgradeCtaOverrideError(null);
    setMonthlyReviewMessage(null);
    setMonthlyReviewError(null);
    setManualModeMessage(null);
    setManualModeError(null);
    setCalibrationResult(null);
    setCalibrationError(null);
    setCalibrationRunAllUsers(false);
    setHabitAchievementRunAllUsers(false);
    setHabitAchievementResult(null);
    setHabitAchievementError(null);
  }, []);


  useEffect(() => {
    if (!selectedUser) {
      setSubscriptionData(null);
      return;
    }

    let cancelled = false;
    setLoadingSubscription(true);
    setSubscriptionError(null);

    fetchAdminUserSubscription(selectedUser.id)
      .then((data) => {
        if (!cancelled) {
          setSubscriptionData(data);
        }
      })
      .catch((error: unknown) => {
        console.error('[admin] failed to fetch subscription', error);
        if (!cancelled) {
          setSubscriptionError('No se pudo cargar la suscripción del usuario.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSubscription(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setModeUpgradeAnalysis(null);
      return;
    }

    let cancelled = false;
    setLoadingModeUpgradeAnalysis(true);
    setModeUpgradeAnalysisError(null);

    fetchAdminModeUpgradeAnalysis(selectedUser.id)
      .then((data) => {
        if (!cancelled) {
          setModeUpgradeAnalysis(data);
        }
      })
      .catch((error: unknown) => {
        console.error('[admin] failed to fetch mode upgrade analysis', error);
        if (!cancelled) {
          setModeUpgradeAnalysis(null);
          setModeUpgradeAnalysisError('No se pudo cargar el análisis de Rhythm Upgrade Suggestion.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingModeUpgradeAnalysis(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setModeUpgradeCtaOverride(null);
      return;
    }

    let cancelled = false;
    setModeUpgradeCtaOverrideLoading(true);
    setModeUpgradeCtaOverrideError(null);

    fetchAdminModeUpgradeCtaOverride(selectedUser.id)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setModeUpgradeCtaOverride(data.item);
        setModeUpgradeCtaOverrideEnabled(Boolean(data.item?.enabled));
        setModeUpgradeCtaOverrideExpiresAt(data.item?.expires_at ? data.item.expires_at.slice(0, 16) : '');
      })
      .catch((error: unknown) => {
        console.error('[admin] failed to fetch mode upgrade CTA override', error);
        if (!cancelled) {
          setModeUpgradeCtaOverride(null);
          setModeUpgradeCtaOverrideError('No se pudo cargar el override de Rhythm Upgrade Suggestion CTA.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModeUpgradeCtaOverrideLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  const modeUpgradeCurrentMode = normalizeMode(modeUpgradeAnalysis?.current_mode ?? selectedUser?.gameMode ?? null);
  const modeUpgradeNextMode = modeUpgradeCurrentMode ? NEXT_MODE_BY_CODE[modeUpgradeCurrentMode] : null;
  const canApplyModeUpgradeCta = Boolean(selectedUser && modeUpgradeCurrentMode && modeUpgradeNextMode);

  const handleUpdateSubscription = useCallback(
    async (payload: { planCode: string; status?: SubscriptionStatus; successMessage: string }) => {
      if (!selectedUser) {
        return;
      }

      setUpdatingSubscription(true);
      setSubscriptionError(null);
      setSubscriptionActionMessage(null);

      try {
        await updateAdminUserSubscription(selectedUser.id, {
          planCode: payload.planCode,
          status: payload.status,
        });

        const refreshed = await fetchAdminUserSubscription(selectedUser.id);
        setSubscriptionData(refreshed);
        setSubscriptionActionMessage(payload.successMessage);
      } catch (error) {
        console.error('[admin] failed to update subscription', error);
        setSubscriptionError('No se pudo actualizar la suscripción del usuario.');
      } finally {
        setUpdatingSubscription(false);
      }
    },
    [selectedUser],
  );

  const handleSendReminder = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    setSendingReminder(true);
    setReminderError(null);

    try {
      const response = await sendAdminDailyReminder(selectedUser.id);
      const sentAt = new Date(response.sent_at);
      const friendlyTime = sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setReminderSuccess(`Enviado a ${response.recipient} · ${friendlyTime}`);
    } catch (error) {
      console.error('[admin] failed to send daily reminder', error);
      setReminderSuccess(null);
      setReminderError('No se pudo enviar el recordatorio. Verificá las credenciales de correo.');
    } finally {
      setSendingReminder(false);
    }
  }, [selectedUser]);

  const handleSendTasksReadyEmail = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    setSendingTasksReady(true);
    setTasksReadyError(null);

    try {
      const response = await sendAdminTasksReadyEmail(selectedUser.id);
      const sentAt = new Date(response.sent_at);
      const friendlyTime = sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTasksReadySuccess(`Enviado a ${response.recipient} · ${friendlyTime}`);
    } catch (error) {
      console.error('[admin] failed to send tasks ready email', error);
      setTasksReadySuccess(null);
      setTasksReadyError('No se pudo enviar el correo de tareas AI. Verificá las credenciales de correo.');
    } finally {
      setSendingTasksReady(false);
    }
  }, [selectedUser]);



  const handleApplyModeUpgradeCtaOverride = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    setModeUpgradeCtaOverrideSaving(true);
    setModeUpgradeCtaOverrideError(null);
    setModeUpgradeCtaOverrideMessage(null);

    try {
      const response = await upsertAdminModeUpgradeCtaOverride(selectedUser.id, {
        enabled: modeUpgradeCtaOverrideEnabled,
        expiresAt: modeUpgradeCtaOverrideExpiresAt ? new Date(modeUpgradeCtaOverrideExpiresAt).toISOString() : null,
      });
      setModeUpgradeCtaOverride(response.item);
      setModeUpgradeCtaOverrideMessage('Forced CTA aplicado.');
    } catch (error) {
      console.error('[admin] failed to save mode upgrade CTA override', error);
      setModeUpgradeCtaOverrideError('No se pudo guardar el override de Rhythm Upgrade Suggestion CTA.');
    } finally {
      setModeUpgradeCtaOverrideSaving(false);
    }
  }, [selectedUser, modeUpgradeCtaOverrideEnabled, modeUpgradeCtaOverrideExpiresAt]);

  const handleClearModeUpgradeCtaOverride = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    setModeUpgradeCtaOverrideClearing(true);
    setModeUpgradeCtaOverrideError(null);
    setModeUpgradeCtaOverrideMessage(null);

    try {
      await clearAdminModeUpgradeCtaOverride(selectedUser.id);
      setModeUpgradeCtaOverride(null);
      setModeUpgradeCtaOverrideEnabled(false);
      setModeUpgradeCtaOverrideExpiresAt('');
      setModeUpgradeCtaOverrideMessage('Forced CTA limpiado.');
    } catch (error) {
      console.error('[admin] failed to clear mode upgrade CTA override', error);
      setModeUpgradeCtaOverrideError('No se pudo limpiar el override de Rhythm Upgrade Suggestion CTA.');
    } finally {
      setModeUpgradeCtaOverrideClearing(false);
    }
  }, [selectedUser]);

  const handleRunMonthlyReview = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    setRunningMonthlyReview(true);
    setMonthlyReviewError(null);
    setManualModeMessage(null);
    setManualModeError(null);
    setMonthlyReviewMessage(null);

    try {
      const response = await runAdminMonthlyReview(selectedUser.id);
      setMonthlyReviewMessage(`Monthly analysis ejecutado (${response.period_key}).`);
      const refreshed = await fetchAdminModeUpgradeAnalysis(selectedUser.id);
      setModeUpgradeAnalysis(refreshed);
    } catch (error) {
      console.error('[admin] failed to run monthly review', error);
      if (error instanceof ApiError) {
        const detail =
          typeof error.body?.message === 'string'
            ? error.body.message
            : typeof error.body?.error === 'string'
              ? error.body.error
              : null;
        setMonthlyReviewError(detail ? `No se pudo ejecutar monthly review: ${detail}` : `No se pudo ejecutar monthly review (HTTP ${error.status}).`);
      } else {
        setMonthlyReviewError('No se pudo ejecutar monthly review.');
      }
    } finally {
      setRunningMonthlyReview(false);
    }
  }, [selectedUser]);

  const handleRunRollingModeAnalysis = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setRunningRollingAnalysis(true);
      setModeUpgradeAnalysisError(null);
      const response = await runAdminModeUpgradeAnalysis(selectedUser.id);
      setModeUpgradeAnalysis(response);
    } catch (error) {
      console.error('[admin] failed to run rolling mode analysis', error);
      if (error instanceof ApiError) {
        const detail = typeof error.body === 'object' && error.body && 'message' in error.body
          ? String((error.body as { message?: string }).message)
          : null;
        setModeUpgradeAnalysisError(detail ? `No se pudo correr rolling analysis: ${detail}` : `No se pudo correr rolling analysis (HTTP ${error.status}).`);
      } else {
        setModeUpgradeAnalysisError('No se pudo correr rolling analysis.');
      }
    } finally {
      setRunningRollingAnalysis(false);
    }
  }, [selectedUser]);

  const handleManualModeChange = useCallback(async () => {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(`Confirmar cambio manual de modo a ${manualModeTarget} para ${selectedUser.email ?? selectedUser.id}?`);
    if (!confirmed) {
      return;
    }

    try {
      setChangingMode(true);
      setManualModeError(null);
      const result = await changeAdminUserGameMode(selectedUser.id, {
        targetModeKey: manualModeTarget,
        reason: manualModeReason.trim() || 'admin_override_manual_mode_change',
      });
      setManualModeMessage(`Modo actualizado a ${result.game_mode_code}.`);
      const [refreshedInsights, refreshedAnalysis] = await Promise.all([
        fetchAdminInsights(selectedUser.id, { from: filters.from, to: filters.to }),
        fetchAdminModeUpgradeAnalysis(selectedUser.id),
      ]);
      setInsights(refreshedInsights);
      setModeUpgradeAnalysis(refreshedAnalysis);
    } catch (error) {
      console.error('[admin] failed to change game mode', error);
      if (error instanceof ApiError) {
        const detail = typeof error.body === 'object' && error.body && 'message' in error.body
          ? String((error.body as { message?: string }).message)
          : null;
        setManualModeError(detail ? `No se pudo cambiar el game mode: ${detail}` : `No se pudo cambiar el game mode (HTTP ${error.status}).`);
      } else {
        setManualModeError('No se pudo cambiar el game mode.');
      }
    } finally {
      setChangingMode(false);
    }
  }, [filters.from, filters.to, manualModeReason, manualModeTarget, selectedUser]);

  const handleRunTaskDifficultyCalibration = useCallback(async () => {
    if (!selectedUser && !calibrationRunAllUsers) {
      return;
    }

    setRunningCalibration(true);
    setCalibrationError(null);
    setCalibrationAuditError(null);

    try {
      const response = await runAdminTaskDifficultyCalibration({
        userId: calibrationRunAllUsers ? undefined : selectedUser?.id,
        windowDays: calibrationWindowDays,
        mode: calibrationMode,
      });
      setCalibrationResult(response);
      const audit = await fetchAdminTaskDifficultyCalibrationAudit({
        userId: calibrationRunAllUsers ? undefined : selectedUser?.id,
        limit: 100,
        latestPerTask: !calibrationRunAllUsers,
      });
      setCalibrationAuditRows(audit.items);
      setCalibrationAuditSummary(audit.summary);
    } catch (error) {
      console.error('[admin] failed to run task difficulty calibration', error);
      setCalibrationResult(null);
      if (error instanceof ApiError) {
        const detail =
          typeof error.body?.message === 'string'
            ? error.body.message
            : typeof error.body?.error === 'string'
              ? error.body.error
              : null;
        setCalibrationError(detail ? `No se pudo ejecutar la calibración de dificultad: ${detail}` : `No se pudo ejecutar la calibración de dificultad (HTTP ${error.status}).`);
      } else {
        setCalibrationError('No se pudo ejecutar la calibración de dificultad.');
      }
    } finally {
      setRunningCalibration(false);
    }
  }, [calibrationMode, calibrationRunAllUsers, calibrationWindowDays, selectedUser]);

  const handleLoadCalibrationAudit = useCallback(async () => {
    setLoadingCalibrationAudit(true);
    setCalibrationAuditError(null);
    try {
      const audit = await fetchAdminTaskDifficultyCalibrationAudit({
        userId: calibrationRunAllUsers ? undefined : selectedUser?.id,
        limit: 100,
        latestPerTask: !calibrationRunAllUsers,
      });
      setCalibrationAuditRows(audit.items);
      setCalibrationAuditSummary(audit.summary);
    } catch (error) {
      if (error instanceof ApiError) {
        setCalibrationAuditError(`No se pudo cargar la auditoría (HTTP ${error.status}).`);
      } else {
        setCalibrationAuditError('No se pudo cargar la auditoría de calibración.');
      }
    } finally {
      setLoadingCalibrationAudit(false);
    }
  }, [calibrationRunAllUsers, selectedUser]);

  useEffect(() => {
    if (!selectedUser || calibrationRunAllUsers) {
      setCalibrationAuditRows([]);
      setCalibrationAuditSummary({ down: 0, keep: 0, up: 0 });
      return;
    }

    let cancelled = false;
    setLoadingCalibrationAudit(true);
    setCalibrationAuditError(null);

    fetchAdminTaskDifficultyCalibrationAudit({
      userId: selectedUser.id,
      limit: 100,
      latestPerTask: true,
    })
      .then((audit) => {
        if (cancelled) return;
        setCalibrationAuditRows(audit.items);
        setCalibrationAuditSummary(audit.summary);
      })
      .catch((error: unknown) => {
        console.error('[admin] failed to fetch calibration audit rows for selected user', error);
        if (cancelled) return;
        if (error instanceof ApiError) {
          setCalibrationAuditError(`No se pudo cargar la auditoría (HTTP ${error.status}).`);
        } else {
          setCalibrationAuditError('No se pudo cargar la auditoría de calibración.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCalibrationAudit(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [calibrationRunAllUsers, selectedUser]);

  const handleRunHabitAchievementRetroactive = useCallback(async () => {
    if (!selectedUser && !habitAchievementRunAllUsers) {
      return;
    }

    setRunningHabitAchievement(true);
    setHabitAchievementError(null);

    try {
      const response = await runAdminHabitAchievementRetroactive({
        userId: habitAchievementRunAllUsers ? undefined : selectedUser?.id,
      });
      setHabitAchievementResult({
        scope: response.scope,
        userId: response.userId,
        expiredResolved: response.expiredResolved,
        evaluated: response.evaluated,
        qualified: response.qualified,
        pendingCreated: response.pendingCreated,
        skipped: response.skipped,
        ignored: response.ignored,
        errors: response.errors,
      });
    } catch (error) {
      console.error('[admin] failed to run habit achievement retroactive detection', error);
      setHabitAchievementResult(null);
      if (error instanceof ApiError) {
        const detail =
          typeof error.body?.message === 'string'
            ? error.body.message
            : typeof error.body?.error === 'string'
              ? error.body.error
              : null;
        setHabitAchievementError(detail ? `No se pudo ejecutar Habit Achievement: ${detail}` : `No se pudo ejecutar Habit Achievement (HTTP ${error.status}).`);
      } else {
        setHabitAchievementError('No se pudo ejecutar Habit Achievement.');
      }
    } finally {
      setRunningHabitAchievement(false);
    }
  }, [habitAchievementRunAllUsers, selectedUser]);

  const nextMonthlyCycleHelper = useMemo(() => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    const diffMs = Math.max(0, next.getTime() - now.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return {
      nextIsoDate: next.toISOString().slice(0, 10),
      countdown: `${days}d ${hours}h`,
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedUser) return;

    setExportError(null);

    try {
      const csv = await exportAdminLogsCsv(selectedUser.id, {
        from: filters.from,
        to: filters.to,
        q: filters.q,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-${selectedUser.id}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[admin] failed to export CSV', err);
      setExportError('No se pudo exportar el CSV.');
    }
  }, [filters.from, filters.to, filters.q, selectedUser]);

  const handleFiltersChange = useCallback((next: AdminFilters) => {
    setFilters(next);
  }, []);

  const errorMessages = useMemo(() => {
    const messages: string[] = [];
    if (insightsError) {
      messages.push(insightsError);
    }
    if (exportError) {
      messages.push(exportError);
    }
    const tabError = activeTab === 'taskTotals' ? taskStatsError : logsError;
    if (tabError) {
      messages.push(tabError);
    }
    return messages;
  }, [activeTab, exportError, insightsError, logsError, taskStatsError]);

  const emptyState = useMemo(() => {
    if (!selectedUser) {
      return 'Seleccioná un usuario para comenzar.';
    }

    if (activeTab === 'logs') {
      if (loadingLogs) {
        return 'Cargando registros…';
      }

      if (logs.total === 0) {
        return 'No hay registros para los filtros seleccionados.';
      }

      return null;
    }

    if (activeTab === 'taskgen') {
      return null;
    }

    if (loadingTaskStats) {
      return 'Cargando totales…';
    }

    if (taskStats.length === 0) {
      return 'No hay totales para los filtros seleccionados.';
    }

    return null;
  }, [activeTab, loadingLogs, logs.total, loadingTaskStats, selectedUser, taskStats.length]);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-900 px-4 pb-10 pt-6 text-slate-100">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Admin Control Center</h1>
        <p className="text-sm text-slate-300">
          Explorá la actividad de los usuarios, exportá registros y ajustá tareas con una interfaz ligera.
        </p>
        <UserPicker onSelect={handleSelectUser} selectedUserId={selectedUser?.id ?? null} />
        {selectedUser ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200">Suscripción</p>
                  {loadingSubscription ? <p>Cargando suscripción…</p> : null}
                  {!loadingSubscription && subscriptionData?.subscription ? (
                    <>
                      <p>
                        Plan actual: <strong>{subscriptionData.subscription.planCode}</strong>
                        {subscriptionData.subscription.isSuperuser ? ' · SUPERUSER' : ''}
                      </p>
                      <p>
                        Estado: <strong>{SUBSCRIPTION_STATUS_LABELS[subscriptionData.subscription.status]}</strong>
                        {subscriptionData.subscription.isBillingExempt ? ' · Sin billing' : ''}
                      </p>
                    </>
                  ) : null}
                  {!loadingSubscription && !subscriptionData?.subscription ? (
                    <p>Sin suscripción registrada todavía.</p>
                  ) : null}
                  {subscriptionActionMessage ? (
                    <p className="text-xs font-semibold text-emerald-300">{subscriptionActionMessage}</p>
                  ) : null}
                  {subscriptionError ? <p className="text-xs font-semibold text-rose-300">{subscriptionError}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdateSubscription({
                        planCode: 'SUPERUSER',
                        status: 'active',
                        successMessage: 'Usuario actualizado a SUPERUSER con uso ilimitado y sin billing.',
                      })
                    }
                    disabled={updatingSubscription || loadingSubscription}
                    className="rounded-lg border border-fuchsia-300/70 bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingSubscription ? 'Actualizando…' : 'Hacer superusuario'}
                  </button>

                  {subscriptionData?.availablePlans
                    .filter((plan) => plan.active && plan.planCode !== 'SUPERUSER')
                    .map((plan) => (
                      <button
                        key={plan.planCode}
                        type="button"
                        onClick={() =>
                          void handleUpdateSubscription({
                            planCode: plan.planCode,
                            status: 'active',
                            successMessage: `Suscripción actualizada manualmente a ${plan.planCode}.`,
                          })
                        }
                        disabled={updatingSubscription || loadingSubscription}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Set {plan.planCode}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recordatorio puntual</p>
                <p className="text-sm text-slate-300">
                  Enviá el correo diario al instante para revisar el HTML y confirmar que llegó a la bandeja.
                </p>
                {reminderSuccess ? (
                  <p className="text-xs font-semibold text-emerald-300">{reminderSuccess}</p>
                ) : null}
                {reminderError ? (
                  <p className="text-xs font-semibold text-rose-300">{reminderError}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  sendingReminder
                    ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                    : 'border border-slate-700/60 bg-slate-800/80 text-slate-100 hover:border-sky-400/60 hover:text-sky-100'
                }`}
              >
                {sendingReminder ? 'Enviando…' : 'Probar correo'}
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Correo tareas AI</p>
                <p className="text-sm text-slate-300">
                  Reenviá el correo que avisa que las tareas generadas por AI ya están listas para revisar y loguearse.
                </p>
                {tasksReadySuccess ? (
                  <p className="text-xs font-semibold text-emerald-300">{tasksReadySuccess}</p>
                ) : null}
                {tasksReadyError ? (
                  <p className="text-xs font-semibold text-rose-300">{tasksReadyError}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSendTasksReadyEmail}
                disabled={sendingTasksReady}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  sendingTasksReady
                    ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                    : 'border border-slate-700/60 bg-slate-800/80 text-slate-100 hover:border-sky-400/60 hover:text-sky-100'
                }`}
              >
                {sendingTasksReady ? 'Enviando…' : 'Probar correo AI'}
              </button>
            </div>


            <div className="flex flex-col gap-3 rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 text-sm text-emerald-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Task Difficulty Calibration</p>
                <p className="text-sm text-emerald-100/90">Ejecuta el motor mensual de calibración en modo manual (BACKFILL / ADMIN_RUN).</p>
                <p className="text-xs text-emerald-200/90">
                  Próxima ventana mensual estimada: <strong>{nextMonthlyCycleHelper.nextIsoDate}</strong> (UTC) · faltan aprox. <strong>{nextMonthlyCycleHelper.countdown}</strong>.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  Window days
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={calibrationWindowDays}
                    onChange={(event) => setCalibrationWindowDays(Math.max(1, Number(event.target.value || 90)))}
                    className="rounded-md border border-emerald-700/50 bg-slate-900/70 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  Mode
                  <select
                    value={calibrationMode}
                    disabled
                    className="rounded-md border border-emerald-700/50 bg-slate-900/70 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-100"
                  >
                    <option value="baseline">Baseline 1 período</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-emerald-100">
                  <input
                    type="checkbox"
                    checked={calibrationRunAllUsers}
                    onChange={(event) => setCalibrationRunAllUsers(event.target.checked)}
                  />
                  Correr para todos los usuarios
                </label>
              </div>
              {!calibrationRunAllUsers && selectedUser ? (
                <p className="text-xs text-emerald-200">Scope actual: userId {selectedUser.id}</p>
              ) : null}
              {calibrationError ? <p className="text-xs font-semibold text-rose-300">{calibrationError}</p> : null}
              {calibrationResult ? (
                <div className="rounded-md border border-emerald-700/50 bg-slate-900/50 p-3 text-xs text-emerald-100">
                  <p>Evaluadas: <strong>{calibrationResult.evaluated}</strong> · Ajustadas: <strong>{calibrationResult.adjusted}</strong></p>
                  <p>Ignoradas: <strong>{calibrationResult.ignored}</strong> · Skipped: <strong>{calibrationResult.skipped}</strong></p>
                  <p>Acciones → up: <strong>{calibrationResult.actionBreakdown.up}</strong>, keep: <strong>{calibrationResult.actionBreakdown.keep}</strong>, down: <strong>{calibrationResult.actionBreakdown.down}</strong></p>
                  <p>Errores: <strong>{calibrationResult.errors.length}</strong></p>
                  {calibrationResult.errors.length > 0 ? (
                    <div className="mt-2 space-y-1 rounded border border-rose-500/30 bg-rose-500/10 p-2 text-rose-100">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">Detalle de errores (máx. 5)</p>
                      <ul className="space-y-1 text-[11px]">
                        {calibrationErrorsPreview.map((item) => (
                          <li key={`${item.taskId}-${item.reason}`} className="break-words">
                            <strong className="text-rose-200">{item.taskId}</strong>: {item.reason}
                          </li>
                        ))}
                      </ul>
                      {calibrationResult.errors.length > calibrationErrorsPreview.length ? (
                        <p className="text-[11px] text-rose-200/90">
                          Mostrando {calibrationErrorsPreview.length} de {calibrationResult.errors.length} errores.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadCalibrationAudit}
                  disabled={loadingCalibrationAudit || (!selectedUser && !calibrationRunAllUsers)}
                  className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    loadingCalibrationAudit
                      ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                      : 'border border-emerald-700/60 bg-emerald-950/40 text-emerald-100 hover:border-emerald-400/60'
                  }`}
                >
                  {loadingCalibrationAudit ? 'Cargando auditoría…' : 'Cargar auditoría'}
                </button>
                <span className="text-xs text-emerald-200/90">Últimas 100 evaluaciones {calibrationRunAllUsers ? '(global)' : '(usuario seleccionado, latest por task)'}</span>
              </div>
              {calibrationAuditError ? <p className="text-xs font-semibold text-rose-300">{calibrationAuditError}</p> : null}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md border border-rose-700/40 bg-rose-900/20 px-2 py-1 text-rose-100">down: <strong>{calibrationAuditSummary.down}</strong></div>
                <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1 text-slate-100">keep: <strong>{calibrationAuditSummary.keep}</strong></div>
                <div className="rounded-md border border-emerald-700/40 bg-emerald-900/20 px-2 py-1 text-emerald-100">up: <strong>{calibrationAuditSummary.up}</strong></div>
              </div>
              {calibrationAuditRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-emerald-700/40 bg-slate-950/40">
                  <table className="min-w-[1700px] divide-y divide-emerald-700/30 text-xs text-emerald-100">
                    <thead className="bg-emerald-900/20 text-[11px] uppercase tracking-[0.12em] text-emerald-200">
                      <tr>
                        <th className="px-2 py-2 text-left">Task name</th><th className="px-2 py-2 text-left">Pillar</th><th className="px-2 py-2 text-left">Analyzed period</th>
                        <th className="px-2 py-2 text-left">Game mode used</th><th className="px-2 py-2 text-left">Completions</th><th className="px-2 py-2 text-left">Expected target</th>
                        <th className="px-2 py-2 text-left">Completion rate %</th><th className="px-2 py-2 text-left">Previous difficulty</th><th className="px-2 py-2 text-left">New difficulty</th>
                        <th className="px-2 py-2 text-left">Final action</th><th className="px-2 py-2 text-left">Matched rule</th><th className="px-2 py-2 text-left">Clamp applied</th>
                        <th className="px-2 py-2 text-left">Reason</th><th className="px-2 py-2 text-left">Evaluated at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/20">
                      {calibrationAuditRows.map((row) => (
                        <tr key={row.taskDifficultyRecalibrationId}>
                          <td className="px-2 py-2"><div className="font-semibold">{row.taskTitle}</div><div className="text-[10px] text-emerald-300/80">{row.taskId}</div></td>
                          <td className="px-2 py-2">{row.pillar ?? '—'}</td>
                          <td className="px-2 py-2">{row.periodStart} → {row.periodEnd}</td>
                          <td className="px-2 py-2">{row.gameModeUsed ?? '—'}</td>
                          <td className="px-2 py-2">{row.actualCompletions}</td>
                          <td className="px-2 py-2">{row.expectedTarget.toFixed(2)}</td>
                          <td className="px-2 py-2">{row.completionRatePct.toFixed(1)}%</td>
                          <td className="px-2 py-2">{row.difficultyBefore ?? '—'}</td>
                          <td className="px-2 py-2">{row.difficultyAfter ?? '—'}</td>
                          <td className="px-2 py-2">{row.finalAction}</td>
                          <td className="px-2 py-2">{row.ruleMatched}</td>
                          <td className="px-2 py-2">{row.clampApplied ? `yes${row.clampReason ? ` (${row.clampReason})` : ''}` : 'no'}</td>
                          <td className="px-2 py-2">{row.reason}</td>
                          <td className="px-2 py-2">{new Date(row.evaluatedAt).toISOString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleRunTaskDifficultyCalibration}
                disabled={runningCalibration || (!selectedUser && !calibrationRunAllUsers)}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  runningCalibration
                    ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                    : 'border border-emerald-700/60 bg-emerald-900/30 text-emerald-100 hover:border-emerald-400/60 hover:text-emerald-50'
                }`}
              >
                {runningCalibration ? 'Running…' : 'Run Difficulty Calibration'}
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-violet-700/40 bg-violet-900/10 p-4 text-sm text-violet-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">HABIT ACHIEVEMENT (RETROACTIVE)</p>
                <p className="text-sm text-violet-100/90">Ejecuta la detección retroactiva para marcar hábitos calificados como achievement_pending.</p>
                <p className="text-xs text-violet-200/90">
                  Corre sobre datos mensuales persistidos y usa el mismo corte mensual (UTC: próximo ciclo {nextMonthlyCycleHelper.nextIsoDate}, faltan aprox. {nextMonthlyCycleHelper.countdown}).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-violet-100">
                <input
                  type="checkbox"
                  checked={habitAchievementRunAllUsers}
                  onChange={(event) => setHabitAchievementRunAllUsers(event.target.checked)}
                />
                Correr para todos los usuarios
              </label>
              {!habitAchievementRunAllUsers && selectedUser ? (
                <p className="text-xs text-violet-200">Scope actual: userId {selectedUser.id}</p>
              ) : null}
              {habitAchievementError ? <p className="text-xs font-semibold text-rose-300">{habitAchievementError}</p> : null}
              {habitAchievementResult ? (
                <div className="rounded-md border border-violet-700/50 bg-slate-900/50 p-3 text-xs text-violet-100">
                  <p>Scope: <strong>{habitAchievementResult.scope}</strong> · User: <strong>{habitAchievementResult.userId ?? 'all_users'}</strong></p>
                  <p>Evaluated: <strong>{habitAchievementResult.evaluated}</strong> · Qualified: <strong>{habitAchievementResult.qualified}</strong></p>
                  <p>Pending created: <strong>{habitAchievementResult.pendingCreated}</strong> · Expired resolved: <strong>{habitAchievementResult.expiredResolved}</strong></p>
                  <p>Skipped: <strong>{habitAchievementResult.skipped}</strong> · Ignored: <strong>{habitAchievementResult.ignored}</strong> · Errors: <strong>{habitAchievementResult.errors}</strong></p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleRunHabitAchievementRetroactive}
                disabled={runningHabitAchievement || (!selectedUser && !habitAchievementRunAllUsers)}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  runningHabitAchievement
                    ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                    : 'border border-violet-700/60 bg-violet-900/30 text-violet-100 hover:border-violet-400/60 hover:text-violet-50'
                }`}
              >
                {runningHabitAchievement ? 'Running…' : 'Run Habit Achievement Retroactive'}
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-cyan-700/40 bg-cyan-900/10 p-4 text-sm text-cyan-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">RHYTHM UPGRADE SUGGESTION ANALYSIS</p>
                  <p className="text-sm text-cyan-100/90">Inspección read-only del review mensual y elegibilidad de la sugerencia de upgrade.</p>
                  {monthlyReviewMessage ? <p className="text-xs font-semibold text-emerald-300">{monthlyReviewMessage}</p> : null}
                  {monthlyReviewError ? <p className="text-xs font-semibold text-rose-300">{monthlyReviewError}</p> : null}
                  {modeUpgradeAnalysisError ? <p className="text-xs font-semibold text-rose-300">{modeUpgradeAnalysisError}</p> : null}
                  {manualModeMessage ? <p className="text-xs font-semibold text-emerald-300">{manualModeMessage}</p> : null}
                  {manualModeError ? <p className="text-xs font-semibold text-rose-300">{manualModeError}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={handleRunMonthlyReview}
                  disabled={runningMonthlyReview || !selectedUser}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    runningMonthlyReview
                      ? 'cursor-not-allowed border border-slate-700/60 bg-slate-800 text-slate-400'
                      : 'border border-cyan-700/60 bg-cyan-900/30 text-cyan-100 hover:border-cyan-400/60 hover:text-cyan-50'
                  }`}
                >
                  {runningMonthlyReview ? 'Running…' : 'Run Monthly Rhythm Upgrade Suggestion Analysis'}
                </button>
                <button
                  type="button"
                  onClick={handleRunRollingModeAnalysis}
                  disabled={runningRollingAnalysis || !selectedUser}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    runningRollingAnalysis || !selectedUser
                      ? 'cursor-not-allowed border border-cyan-900/50 bg-slate-900/60 text-cyan-200/60'
                      : 'border border-cyan-700/60 bg-cyan-500/10 text-cyan-100 hover:border-cyan-500/80 hover:text-cyan-50'
                  }`}
                >
                  {runningRollingAnalysis ? 'Running…' : 'Recompute Rolling Rhythm Upgrade Suggestion Analysis'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,220px)_1fr_auto] md:items-end">
                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.14em] text-cyan-300">
                  Manual Game Mode
                  <select
                    value={manualModeTarget}
                    onChange={(event) => setManualModeTarget(event.target.value as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE')}
                    className="rounded-md border border-cyan-700/50 bg-slate-900/70 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-100"
                  >
                    <option value="LOW">LOW</option>
                    <option value="CHILL">CHILL</option>
                    <option value="FLOW">FLOW</option>
                    <option value="EVOLVE">EVOLVE</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.14em] text-cyan-300">
                  Reason
                  <input
                    value={manualModeReason}
                    onChange={(event) => setManualModeReason(event.target.value)}
                    className="rounded-md border border-cyan-700/50 bg-slate-900/70 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleManualModeChange}
                  disabled={changingMode || !selectedUser}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    changingMode || !selectedUser
                      ? 'cursor-not-allowed border border-amber-900/50 bg-slate-900/60 text-amber-200/60'
                      : 'border border-amber-700/60 bg-amber-500/10 text-amber-100 hover:border-amber-500/80 hover:text-amber-50'
                  }`}
                >
                  {changingMode ? 'Changing…' : 'Apply Manual Mode Change'}
                </button>
              </div>

              <div className="rounded-lg border border-cyan-700/40 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">DEBUG CTA OVERRIDE</p>
                  {modeUpgradeCtaOverrideLoading ? <span className="text-[11px] text-cyan-300/80">Cargando…</span> : null}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4 md:items-end">
                  <label className="flex items-center gap-2 text-xs text-cyan-100">
                    <input
                      type="checkbox"
                      checked={modeUpgradeCtaOverrideEnabled}
                      onChange={(event) => setModeUpgradeCtaOverrideEnabled(event.target.checked)}
                    />
                    Force Rhythm Upgrade Suggestion CTA
                  </label>
                  <p className="rounded-md border border-cyan-700/50 bg-slate-900/70 px-2 py-1 text-xs normal-case tracking-normal text-slate-100">
                    Current real: <strong>{modeUpgradeCurrentMode ?? '—'}</strong>
                  </p>
                  <p className="rounded-md border border-cyan-700/50 bg-slate-900/70 px-2 py-1 text-xs normal-case tracking-normal text-slate-100">
                    Next valid: <strong>{modeUpgradeNextMode ?? 'No upgrade'}</strong>
                  </p>
                  <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-cyan-300">
                    Expires (optional)
                    <input type="datetime-local" value={modeUpgradeCtaOverrideExpiresAt} onChange={(event) => setModeUpgradeCtaOverrideExpiresAt(event.target.value)} className="rounded-md border border-cyan-700/50 bg-slate-900/70 px-2 py-1 text-xs normal-case tracking-normal text-slate-100" />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleApplyModeUpgradeCtaOverride} disabled={modeUpgradeCtaOverrideSaving || !canApplyModeUpgradeCta} className="inline-flex items-center justify-center rounded-md border border-cyan-700/60 bg-cyan-900/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-60">
                    {modeUpgradeCtaOverrideSaving ? 'Applying…' : 'Apply Forced CTA'}
                  </button>
                  <button type="button" onClick={handleClearModeUpgradeCtaOverride} disabled={modeUpgradeCtaOverrideClearing || !selectedUser} className="inline-flex items-center justify-center rounded-md border border-cyan-700/60 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-60">
                    {modeUpgradeCtaOverrideClearing ? 'Clearing…' : 'Clear Forced CTA'}
                  </button>
                  {modeUpgradeCtaOverride?.enabled ? <span className="text-[11px] text-emerald-300">Active</span> : <span className="text-[11px] text-cyan-300/80">Inactive</span>}
                  {!modeUpgradeNextMode ? <span className="text-[11px] text-amber-300">Current mode is EVOLVE: forced CTA is disabled.</span> : null}
                </div>
                {modeUpgradeCtaOverrideMessage ? <p className="mt-1 text-xs font-semibold text-emerald-300">{modeUpgradeCtaOverrideMessage}</p> : null}
                {modeUpgradeCtaOverrideError ? <p className="mt-1 text-xs font-semibold text-rose-300">{modeUpgradeCtaOverrideError}</p> : null}
              </div>

              {loadingModeUpgradeAnalysis ? <p className="text-xs text-cyan-200">Cargando análisis…</p> : null}

              {modeUpgradeAnalysis ? (
                <>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Current Mode</p><p className="font-semibold">{modeUpgradeAnalysis.current_mode ?? '—'}</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Next Mode</p><p className="font-semibold">{modeUpgradeAnalysis.next_mode ?? '—'}</p></div><div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Window</p><p className="font-semibold">{modeUpgradeAnalysis.analysis_start} → {modeUpgradeAnalysis.analysis_end}</p></div><div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Reason if empty</p><p className="font-semibold">{modeUpgradeAnalysis.reason_if_empty ?? '—'}</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Tasks evaluated</p><p className="font-semibold">{modeUpgradeAnalysis.tasks_total_evaluated}</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Tasks meeting goal</p><p className="font-semibold">{modeUpgradeAnalysis.tasks_meeting_goal} / {modeUpgradeAnalysis.tasks_total_evaluated}</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Pass rate</p><p className="font-semibold">{modeUpgradeAnalysis.task_pass_rate}%</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Upgrade threshold</p><p className="font-semibold">{modeUpgradeAnalysis.threshold}%</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Missing tasks</p><p className="font-semibold">{modeUpgradeAnalysis.missing_tasks}</p></div>
                    <div className="rounded-md border border-cyan-700/50 bg-slate-900/50 p-3"><p className="text-[11px] uppercase text-cyan-300">Eligible</p><p className="font-semibold">{modeUpgradeAnalysis.eligible_for_upgrade ? 'YES' : 'NO'}</p></div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-cyan-700/40">
                    <table className="min-w-full divide-y divide-cyan-700/40 text-left text-xs">
                      <thead className="bg-slate-900/80 text-cyan-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Task</th>
                          <th className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Actual / Expected</th><th className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Completion %</th>
                          <th className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Meets Goal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-700/30 bg-slate-950/40 text-cyan-50">
                        {modeUpgradeAnalysis.tasks.map((task) => (
                          <tr key={task.task_id}>
                            <td className="px-3 py-2">{task.task_name}</td>
                            <td className="px-3 py-2">{task.actual_count} / {task.expected_count}</td><td className="px-3 py-2">{task.completion_rate}%</td>
                            <td className="px-3 py-2">{task.meets_goal ? '✅' : '❌'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {errorMessages.length > 0 ? (
          <div className="space-y-2">
            {errorMessages.map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {message}
              </div>
            ))}
          </div>
        ) : null}

        <InsightsChips insights={insights} loading={loadingInsights} />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              activeTab === 'logs'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
            }`}
          >
            Registros diarios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taskTotals')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              activeTab === 'taskTotals'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
            }`}
          >
            Totales por tarea
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taskgen')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              activeTab === 'taskgen'
                ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                : 'border-slate-700/60 text-slate-300 hover:border-sky-400/60 hover:text-sky-100'
            }`}
          >
            AI TaskGen
          </button>
        </div>

        {activeTab !== 'taskgen' ? (
          <FiltersBar
            filters={filters}
            onChange={handleFiltersChange}
            onExport={handleExport}
            showExport={activeTab === 'logs'}
            showPageSize={activeTab === 'logs'}
          />
        ) : null}

        {activeTab === 'taskgen' ? (
          <TaskgenTracePanel selectedUserId={selectedUser?.id ?? null} />
        ) : emptyState ? (
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-6 py-12 text-center text-sm text-slate-300">
            {emptyState}
          </div>
        ) : (
          <>
            {activeTab === 'logs' ? (
              <AdminDataTable
                rows={logs.items}
                loading={loadingLogs}
                page={logs.page}
                pageSize={logs.pageSize}
                total={logs.total}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize }))}
              />
            ) : (
              <AdminTaskSummaryTable rows={taskStats} loading={loadingTaskStats} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
