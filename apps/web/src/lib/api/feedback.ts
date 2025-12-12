import { ApiError, apiAuthorizedFetch, apiAuthorizedGet, buildApiUrl } from '../api';
import type { FeedbackDefinition } from '../types';

export type FeedbackDefinitionsResponse = {
  items: FeedbackDefinition[];
  total: number;
  syncedAt: string;
};

export type FeedbackDefinitionUpdatePayload = {
  label?: string;
  copy?: string;
  trigger?: string;
  channel?: string;
  type?: string;
  frequency?: string;
  scope?: string[];
  status?: FeedbackDefinition['status'];
  priority?: number;
  cta?: FeedbackDefinition['cta'];
  config?: Record<string, unknown>;
};

export type FeedbackPreviewPayloadResponse = {
  payload: Record<string, unknown> | null;
};

export async function fetchFeedbackDefinitions() {
  return apiAuthorizedGet<FeedbackDefinitionsResponse>('/admin/feedback/definitions');
}

export async function patchFeedbackDefinition(id: string, payload: FeedbackDefinitionUpdatePayload) {
  const url = buildApiUrl(`/admin/feedback/definitions/${encodeURIComponent(id)}`);
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

  return response.json() as Promise<{ item: FeedbackDefinition }>;
}

export async function fetchFeedbackDefinitionPreview(definitionId: string) {
  return apiAuthorizedGet<FeedbackPreviewPayloadResponse>(
    `/admin/feedback/definitions/${encodeURIComponent(definitionId)}/preview`,
  );
}

export type FeedbackUserNotificationState = {
  notificationKey: string;
  name: string;
  type: string;
  channel: string;
  state: 'active' | 'muted' | 'suppressed_by_rule';
  muteUntil: string | null;
  lastFiredForUserAt: string | null;
  lastInteractionType: 'shown' | 'clicked' | 'dismissed' | 'ignored' | 'auto_closed' | null;
};

export type FeedbackUserStateResponse = {
  user: {
    id: string;
    email: string | null;
    name?: string | null;
    alias?: string | null;
    gameMode?: string | null;
    level?: number | null;
    lastSeenAt?: string | null;
  };
  notifications: FeedbackUserNotificationState[];
};

export type FeedbackUserNotificationUpdatePayload = {
  notificationKey: string;
  state: 'active' | 'muted';
  muteUntil?: string | null;
};

export type FeedbackUserHistoryEntry = {
  id: string;
  timestamp: string;
  notificationKey: string;
  name: string;
  type: string;
  channel: string;
  context: string | null;
  action: 'shown' | 'clicked' | 'dismissed' | 'ignored' | 'auto_closed';
  isCriticalMoment: boolean;
  criticalTag?: string | null;
};

export type FeedbackUserHistorySummary = {
  notifsShownLast7d: number;
  notifsClickedLast7d: number;
  notifsCriticalLast30d: number;
  clickRateLast30d: number;
};

export type FeedbackUserHistoryResponse = {
  summary: FeedbackUserHistorySummary;
  items: FeedbackUserHistoryEntry[];
};

export async function fetchFeedbackUserState(userId: string) {
  return apiAuthorizedGet<FeedbackUserStateResponse>(
    `/admin/feedback/users/${encodeURIComponent(userId)}/state`,
  );
}

export async function fetchFeedbackUserHistory(userId: string) {
  return apiAuthorizedGet<FeedbackUserHistoryResponse>(
    `/admin/feedback/users/${encodeURIComponent(userId)}/history`,
  );
}

export async function patchFeedbackUserNotificationState(
  userId: string,
  payload: FeedbackUserNotificationUpdatePayload,
) {
  const url = buildApiUrl(`/admin/feedback/users/${encodeURIComponent(userId)}/state`);
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
