import { ApiError, apiAuthorizedFetch, apiAuthorizedGet, buildApiUrl } from './api';
import type {
  AdminInsights,
  AdminLogRow,
  AdminTaskRow,
  AdminTaskSummaryRow,
  AdminUser,
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
