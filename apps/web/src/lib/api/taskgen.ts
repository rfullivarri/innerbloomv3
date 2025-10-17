import { ApiError, apiAuthorizedFetch, apiAuthorizedGet, buildApiUrl } from '../api';
import type {
  TaskgenJob,
  TaskgenJobLog,
  TaskgenJobsResponse,
  TaskgenUserOverview,
} from '../types';

export type TaskgenJobsParams = {
  status?: string;
  mode?: string;
  user?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function fetchTaskgenJobs(params: TaskgenJobsParams = {}) {
  return apiAuthorizedGet<TaskgenJobsResponse>('/admin/taskgen/jobs', params);
}

export async function fetchTaskgenJobLogs(jobId: string) {
  return apiAuthorizedGet<TaskgenJobLog[]>(`/admin/taskgen/jobs/${encodeURIComponent(jobId)}/logs`);
}

export async function fetchTaskgenUserOverview(userId: string) {
  return apiAuthorizedGet<TaskgenUserOverview>(`/admin/users/${encodeURIComponent(userId)}/taskgen/latest`);
}

export async function retryTaskgenJob(jobId: string) {
  const url = buildApiUrl(`/admin/taskgen/jobs/${encodeURIComponent(jobId)}/retry`);
  const response = await apiAuthorizedFetch(url, {
    method: 'POST',
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

  return response.json() as Promise<{ ok: boolean; job?: TaskgenJob | null }>;
}

export type ForceRunTaskgenPayload = {
  userId: string;
  mode?: string | null;
};

export async function forceRunTaskgen(payload: ForceRunTaskgenPayload) {
  const url = buildApiUrl('/admin/taskgen/force-run');
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

  return response.json() as Promise<{ ok: boolean; job?: TaskgenJob | null }>;
}
