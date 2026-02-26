import type { JourneyGenerationStateResponse } from './api';

const JOURNEY_GENERATION_KEY = 'journey_generation_state_v2';
const JOURNEY_GENERATION_TTL_MS = 1000 * 60 * 30;

type LocalJourneyGenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

type JourneyGenerationRecord = {
  clerkUserId: string;
  gameMode: string;
  status: LocalJourneyGenerationStatus;
  correlationId: string | null;
  createdAt: number;
  updatedAt: number;
};

function dispatchChange(): void {
  window.dispatchEvent(new Event('journey-generation-change'));
}

function readRecord(): JourneyGenerationRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(JOURNEY_GENERATION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as JourneyGenerationRecord;
  } catch {
    window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
    return null;
  }
}

function writeRecord(record: JourneyGenerationRecord): void {
  window.localStorage.setItem(JOURNEY_GENERATION_KEY, JSON.stringify(record));
  dispatchChange();
}

export function setJourneyGenerationPending(input: { clerkUserId: string; gameMode: string }): void {
  if (typeof window === 'undefined') {
    return;
  }

  const now = Date.now();
  writeRecord({
    clerkUserId: input.clerkUserId,
    gameMode: input.gameMode,
    status: 'pending',
    correlationId: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function syncJourneyGenerationFromServer(input: {
  clerkUserId: string;
  state: JourneyGenerationStateResponse | null;
}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readRecord();

  if (!input.state) {
    if (current?.clerkUserId === input.clerkUserId) {
      clearJourneyGenerationPending();
    }
    return;
  }

  const now = Date.now();
  writeRecord({
    clerkUserId: input.clerkUserId,
    gameMode: current?.gameMode ?? 'FLOW',
    status: input.state.status,
    correlationId: input.state.correlation_id,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  });
}

export function isJourneyGenerationPending(clerkUserId?: string | null): boolean {
  if (!clerkUserId || typeof window === 'undefined') {
    return false;
  }

  const record = readRecord();
  if (!record) {
    return false;
  }

  const isExpired = Date.now() - record.updatedAt > JOURNEY_GENERATION_TTL_MS;
  const isSameUser = record.clerkUserId === clerkUserId;

  if (!isSameUser || isExpired) {
    window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
    return false;
  }

  return record.status === 'pending' || record.status === 'running';
}

export function clearJourneyGenerationPending(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
  dispatchChange();
}
