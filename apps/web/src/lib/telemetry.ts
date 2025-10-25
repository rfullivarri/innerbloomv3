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
  | 'missions_v2_reward_claimed'
  | 'missions_v2_market_activate'
  | 'missions_v2_market_view'
  | 'missions_v2_market_nav_prev'
  | 'missions_v2_market_nav_next'
  | 'missions_v2_market_flip_open'
  | 'missions_v2_market_flip_close'
  | 'missions_v2_market_inner_scroll'
  | 'missions_v2_market_proposal_select'
  | 'missions_v2_scroll_market_snap'
  | 'missions_v2_scroll_active_snap';

export interface TelemetryViewport {
  width: number;
  height: number;
}

export interface MissionsV2EventPayload {
  userId?: string | null;
  slot?: string | null;
  source?: string | null;
  missionId?: string | null;
  reward?: unknown;
  timestamp?: string;
  proposalId?: string | null;
  track?: 'market' | 'active' | null;
  cardIndex?: number | null;
  viewport?: TelemetryViewport | null;
  userAgentHash?: string | null;
}

export function emitMissionsV2Event(event: MissionsV2EventName, payload: MissionsV2EventPayload = {}) {
  const normalizedUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  const normalizedSlot = typeof payload.slot === 'string' ? payload.slot.trim().toLowerCase() : '';
  const normalizedSource = typeof payload.source === 'string' ? payload.source.trim() : '';
  const normalizedMissionId = typeof payload.missionId === 'string' ? payload.missionId.trim() : '';
  const normalizedProposalId = typeof payload.proposalId === 'string' ? payload.proposalId.trim() : '';
  const normalizedTrack =
    typeof payload.track === 'string' ? payload.track.trim().toLowerCase() : '';
  const normalizedCardIndex = Number.isFinite(payload.cardIndex)
    ? Math.max(0, Math.trunc(payload.cardIndex as number))
    : null;
  const viewport = payload.viewport ?? null;
  const normalizedViewport =
    viewport &&
    Number.isFinite(viewport.width) &&
    Number.isFinite(viewport.height) &&
    viewport.width >= 0 &&
    viewport.height >= 0
      ? {
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        }
      : undefined;
  const normalizedUserAgentHash =
    typeof payload.userAgentHash === 'string' ? payload.userAgentHash.trim() : '';

  const normalizedPayload: Record<string, unknown> = {
    event,
    user_id: normalizedUserId.length > 0 ? normalizedUserId : undefined,
    slot: normalizedSlot.length > 0 ? normalizedSlot : undefined,
    source: normalizedSource.length > 0 ? normalizedSource : undefined,
    mission_id: normalizedMissionId.length > 0 ? normalizedMissionId : undefined,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  if (normalizedProposalId.length > 0) {
    normalizedPayload.proposal_id = normalizedProposalId;
  }

  if (normalizedTrack === 'market' || normalizedTrack === 'active') {
    normalizedPayload.track = normalizedTrack;
  }

  if (normalizedCardIndex != null) {
    normalizedPayload.card_index = normalizedCardIndex;
  }

  if (normalizedViewport) {
    normalizedPayload.viewport = normalizedViewport;
  }

  if (normalizedUserAgentHash.length > 0) {
    normalizedPayload.user_agent_hash = normalizedUserAgentHash;
  }

  if (payload.reward !== undefined) {
    normalizedPayload.reward = payload.reward;
  }

  logApiDebug('[analytics] missions v2 event', normalizedPayload);
}

let cachedUserAgentHash: string | null | undefined;

function computeUserAgentHash(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userAgent = window.navigator?.userAgent ?? '';
  if (userAgent.length === 0) {
    return null;
  }

  const FNV_OFFSET_BASIS = BigInt('0xcbf29ce484222325');
  const FNV_PRIME = BigInt('0x100000001b3');
  const MODULUS = BigInt('0x10000000000000000');

  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < userAgent.length; index += 1) {
    hash ^= BigInt(userAgent.charCodeAt(index));
    hash = (hash * FNV_PRIME) % MODULUS;
  }

  return hash.toString(16).padStart(16, '0');
}

export function getUserAgentHash(): string | null {
  if (cachedUserAgentHash === undefined) {
    cachedUserAgentHash = computeUserAgentHash();
  }
  return cachedUserAgentHash ?? null;
}

export function getViewportSnapshot(): TelemetryViewport | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const width = Number.isFinite(window.innerWidth) ? Math.round(window.innerWidth) : null;
  const height = Number.isFinite(window.innerHeight) ? Math.round(window.innerHeight) : null;

  if (width == null || height == null || width < 0 || height < 0) {
    return null;
  }

  return { width, height };
}
