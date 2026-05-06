import { ApiError, apiAuthorizedFetch, apiAuthorizedGet, buildApiUrl } from './api';
import type {
  AdminInsights,
  AdminLogRow,
  AdminTaskRow,
  AdminTaskSummaryRow,
  AdminModeUpgradeAnalysis,
  AdminModeUpgradeCtaOverride,
  AdminHabitAchievementRetroactiveRunResponse,
  AdminHabitAchievementDiagnosticsResponse,
  AdminMonthlyPipelineRunResponse,
  AdminUser,
  AdminUserSubscriptionResponse,
  SubscriptionStatus,
  TaskgenTraceEvent,
} from './types';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type UserSearchParams = {
  query?: string;
  page?: number;
  pageSize?: number;
};

type InsightParams = {
  from?: string;
  to?: string;
};

type LogFilters = {
  from?: string;
  to?: string;
  pillar?: string;
  trait?: string;
  difficulty?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

type TaskFilters = {
  pillar?: string;
  trait?: string;
  q?: string;
};

type TaskStatsFilters = {
  from?: string;
  to?: string;
  pillar?: string;
  trait?: string;
  difficulty?: string;
  q?: string;
};

type UpdateTaskPayload = {
  weeklyTarget?: number;
  archived?: boolean;
  notes?: string;
};

export async function searchAdminUsers(params: UserSearchParams = {}) {
  return apiAuthorizedGet<PaginatedResponse<AdminUser>>('/admin/users', params);
}

export async function fetchAdminInsights(userId: string, params: InsightParams = {}) {
  return apiAuthorizedGet<AdminInsights>(`/admin/users/${encodeURIComponent(userId)}/insights`, params);
}

export async function fetchAdminLogs(userId: string, params: LogFilters = {}) {
  return apiAuthorizedGet<PaginatedResponse<AdminLogRow>>(
    `/admin/users/${encodeURIComponent(userId)}/logs`,
    params,
  );
}

export async function fetchAdminTasks(userId: string, params: TaskFilters = {}) {
  return apiAuthorizedGet<PaginatedResponse<AdminTaskRow>>(
    `/admin/users/${encodeURIComponent(userId)}/tasks`,
    params,
  );
}

export async function fetchAdminTaskStats(userId: string, params: TaskStatsFilters = {}) {
  return apiAuthorizedGet<AdminTaskSummaryRow[]>(
    `/admin/users/${encodeURIComponent(userId)}/task-stats`,
    params,
  );
}

export async function updateAdminTask(
  userId: string,
  taskId: string,
  payload: UpdateTaskPayload,
) {
  const url = buildApiUrl(`/admin/users/${encodeURIComponent(userId)}/tasks/${encodeURIComponent(taskId)}`);
  const response = await apiAuthorizedFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function exportAdminLogsCsv(userId: string, params: LogFilters = {}) {
  const url = buildApiUrl(`/admin/users/${encodeURIComponent(userId)}/logs.csv`, params);
  const response = await apiAuthorizedFetch(url, {
    headers: {
      Accept: 'text/csv',
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.text();
}



export async function fetchAdminUserSubscription(userId: string) {
  return apiAuthorizedGet<AdminUserSubscriptionResponse>(`/admin/users/${encodeURIComponent(userId)}/subscription`);
}

export async function updateAdminUserSubscription(
  userId: string,
  payload: { planCode: string; status?: SubscriptionStatus },
) {
  const url = buildApiUrl(`/admin/users/${encodeURIComponent(userId)}/subscription`);
  const response = await apiAuthorizedFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      planCode: payload.planCode,
      status: payload.status ?? 'active',
    }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function fetchAdminModeUpgradeAnalysis(userId: string) {
  return apiAuthorizedGet<AdminModeUpgradeAnalysis>(`/admin/user/${encodeURIComponent(userId)}/mode-upgrade-analysis`);
}


export async function fetchAdminModeUpgradeCtaOverride(userId: string) {
  return apiAuthorizedGet<{ item: AdminModeUpgradeCtaOverride | null }>(`/admin/user/${encodeURIComponent(userId)}/mode-upgrade-cta-override`);
}

export async function upsertAdminModeUpgradeCtaOverride(
  userId: string,
  payload: {
    enabled: boolean;
    expiresAt?: string | null;
  },
) {
  const url = buildApiUrl(`/admin/user/${encodeURIComponent(userId)}/mode-upgrade-cta-override`);
  const response = await apiAuthorizedFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{ ok: boolean; item: AdminModeUpgradeCtaOverride }>;
}

export async function clearAdminModeUpgradeCtaOverride(userId: string) {
  const url = buildApiUrl(`/admin/user/${encodeURIComponent(userId)}/mode-upgrade-cta-override`);
  const response = await apiAuthorizedFetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{ ok: boolean }>;
}


export async function runAdminMonthlyPipeline(payload: { periodKey: string; force?: boolean; userId?: string }) {
  const url = buildApiUrl('/admin/monthly-pipeline/run');
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      periodKey: payload.periodKey,
      force: payload.force,
      userId: payload.userId,
    }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<AdminMonthlyPipelineRunResponse>;
}

export async function runAdminMonthlyReview(userId: string) {
  const url = buildApiUrl(`/admin/user/${encodeURIComponent(userId)}/run-monthly-review`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{
    ok: boolean;
    source: string;
    userId: string;
    period_key: string;
    period_start: string;
    next_period_start: string;
    scope: 'single_user' | 'all_users';
    processed: number;
    persisted: number;
  }>;
}


export async function runAdminModeUpgradeAnalysis(userId: string) {
  const url = buildApiUrl(`/admin/user/${encodeURIComponent(userId)}/mode-upgrade-analysis/run`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<AdminModeUpgradeAnalysis & { ok: boolean; source: string }>;
}

export async function changeAdminUserGameMode(
  userId: string,
  payload: { targetModeId?: number; targetModeKey?: 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'; reason: string },
) {
  const url = buildApiUrl(`/admin/user/${encodeURIComponent(userId)}/game-mode`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<{
    ok: boolean;
    userId: string;
    game_mode_id: number;
    game_mode_code: string;
    image_url: string | null;
    avatar_url: string | null;
    reason: string;
  }>;
}

export async function verifyAdminAccess() {
  return apiAuthorizedGet<{ ok: boolean }>('/admin/me');
}

type TaskgenTraceResponse = { events: TaskgenTraceEvent[] };

export async function fetchTaskgenTraceByUser(userId: string) {
  return apiAuthorizedGet<TaskgenTraceResponse>('/admin/taskgen/trace', { user_id: userId });
}

export async function fetchTaskgenTraceByCorrelation(correlationId: string) {
  return apiAuthorizedGet<TaskgenTraceResponse>(
    `/admin/taskgen/trace/by-correlation/${encodeURIComponent(correlationId)}`,
  );
}

export async function fetchTaskgenTraceGlobal(limit?: number) {
  const params = typeof limit === 'number' ? { limit } : undefined;
  return apiAuthorizedGet<TaskgenTraceResponse>('/admin/taskgen/trace/global', params);
}

export async function postTaskgenForceRun(payload: { userId: string; mode?: string }) {
  const response = await apiAuthorizedFetch(buildApiUrl('/admin/taskgen/force-run'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ user_id: payload.userId, mode: payload.mode }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, buildApiUrl('/admin/taskgen/force-run'));
  }

  return response.json() as Promise<{ ok: boolean; correlation_id: string }>;
}

type ReminderSendResponse = {
  ok: boolean;
  reminder_id: string;
  recipient: string;
  sent_at: string;
};

type TasksReadySendResponse = {
  ok: boolean;
  tasks_group_id: string;
  recipient: string;
  sent_at: string;
  task_count: number;
};

export async function sendAdminDailyReminder(userId: string) {
  const url = buildApiUrl(`/admin/users/${encodeURIComponent(userId)}/daily-reminder/send`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ channel: 'email' }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<ReminderSendResponse>;
}

export async function sendAdminTasksReadyEmail(userId: string) {
  const url = buildApiUrl(`/admin/users/${encodeURIComponent(userId)}/tasks-ready/send`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<TasksReadySendResponse>;
}


export type AdminTaskDifficultyCalibrationRunResponse = {
  ok: boolean;
  source: 'admin_run';
  scope: 'single_user' | 'all_users';
  userId: string | null;
  window_days: number;
  mode: 'baseline';
  evaluated: number;
  adjusted: number;
  skipped: number;
  ignored: number;
  actionBreakdown: { up: number; keep: number; down: number };
  errors: { taskId: string; reason: string }[];
};

export type AdminTaskDifficultyCalibrationAuditRow = {
  taskDifficultyRecalibrationId: string;
  userId: string;
  userEmail: string | null;
  taskId: string;
  taskTitle: string;
  pillar: string | null;
  periodStart: string;
  periodEnd: string;
  evaluationMonthLabel: string;
  difficultyBefore: string | null;
  difficultyAfter: string | null;
  gameModeUsed: string | null;
  expectedTarget: number;
  actualCompletions: number;
  completionRate: number;
  completionRatePct: number;
  ruleMatched: string;
  finalAction: 'up' | 'keep' | 'down';
  result: 'increased' | 'kept' | 'decreased';
  reason: string;
  clampApplied: boolean;
  clampReason: string | null;
  source: string;
  evaluatedAt: string;
  createdAt: string;
};

export type AdminTaskDifficultyCalibrationAuditResponse = {
  items: AdminTaskDifficultyCalibrationAuditRow[];
  total: number;
  summary: { down: number; keep: number; up: number };
};

export async function runAdminTaskDifficultyCalibration(payload: {
  userId?: string;
  windowDays?: number;
  mode?: 'baseline';
}) {
  const url = buildApiUrl('/admin/task-difficulty-calibration/run');
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      userId: payload.userId,
      window_days: payload.windowDays ?? 90,
      mode: payload.mode ?? 'baseline',
    }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<AdminTaskDifficultyCalibrationRunResponse>;
}

export async function fetchAdminTaskDifficultyCalibrationAudit(params: {
  userId?: string;
  taskId?: string;
  limit?: number;
  latestPerTask?: boolean;
}) {
  return apiAuthorizedGet<AdminTaskDifficultyCalibrationAuditResponse>('/admin/task-difficulty-calibration/audit', {
    userId: params.userId,
    taskId: params.taskId,
    limit: params.limit ?? 100,
    latestPerTask: params.latestPerTask ? 'true' : 'false',
  });
}

export async function runAdminHabitAchievementRetroactive(payload: { userId?: string }) {
  const url = buildApiUrl('/admin/habit-achievement/retroactive/run');
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      userId: payload.userId,
    }),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response.json() as Promise<AdminHabitAchievementRetroactiveRunResponse>;
}

export async function fetchAdminHabitAchievementDiagnostics(userId: string) {
  return apiAuthorizedGet<AdminHabitAchievementDiagnosticsResponse>(
    '/admin/habit-achievement/retroactive/diagnostics',
    { userId },
  );
}
