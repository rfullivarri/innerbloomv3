import { logApiDebug, logApiError } from './logger';

export type DbEditorEventName =
  | 'dbeditor_opened'
  | 'dbeditor_task_created'
  | 'dbeditor_task_updated'
  | 'dbeditor_task_deleted'
  | 'dbeditor_error';

export type DbEditorEventStatus = 'success' | 'error';

export interface DbEditorEventPayload {
  userId: string;
  taskId?: string | null;
  latencyMs: number;
  status: DbEditorEventStatus;
  timestamp?: string;
  errorMessage?: string;
  context?: string;
}

function normalizeLatency(latency: number): number {
  if (!Number.isFinite(latency) || latency < 0) {
    return 0;
  }
  return Math.round(latency);
}

export function emitDbEditorEvent(event: DbEditorEventName, payload: DbEditorEventPayload) {
  const { userId, taskId = null, latencyMs, status, timestamp, errorMessage, context } = payload;

  const normalizedUserId = userId && userId.trim().length > 0 ? userId : 'unknown';

  const normalizedPayload = {
    event,
    user_id: normalizedUserId,
    task_id: taskId,
    timestamp: timestamp ?? new Date().toISOString(),
    latency_ms: normalizeLatency(latencyMs),
    status,
    success: status === 'success',
    ...(errorMessage ? { error_message: errorMessage } : {}),
    ...(context ? { context } : {}),
  } satisfies Record<string, unknown>;

  if (status === 'error') {
    logApiError('[analytics] dbeditor event', normalizedPayload);
  } else {
    logApiDebug('[analytics] dbeditor event', normalizedPayload);
  }
}

export type MissionsV2EventName =
  | 'missions_v2_view'
  | 'missions_v2_claim_open'
  | 'missions_v2_select_open'
  | 'missions_v2_heartbeat'
  | 'missions_v2_reward_claimed';

export interface MissionsV2EventPayload {
  userId?: string | null;
  slot?: string | null;
  source?: string | null;
  missionId?: string | null;
  reward?: unknown;
  timestamp?: string;
}

export function emitMissionsV2Event(event: MissionsV2EventName, payload: MissionsV2EventPayload = {}) {
  const normalizedUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  const normalizedSlot = typeof payload.slot === 'string' ? payload.slot.trim().toLowerCase() : '';
  const normalizedSource = typeof payload.source === 'string' ? payload.source.trim() : '';
  const normalizedMissionId = typeof payload.missionId === 'string' ? payload.missionId.trim() : '';

  const normalizedPayload: Record<string, unknown> = {
    event,
    user_id: normalizedUserId.length > 0 ? normalizedUserId : undefined,
    slot: normalizedSlot.length > 0 ? normalizedSlot : undefined,
    source: normalizedSource.length > 0 ? normalizedSource : undefined,
    mission_id: normalizedMissionId.length > 0 ? normalizedMissionId : undefined,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  if (payload.reward !== undefined) {
    normalizedPayload.reward = payload.reward;
  }

  logApiDebug('[analytics] missions v2 event', normalizedPayload);
}
