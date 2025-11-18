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
