import type { MissionsV2EventName } from './missionsV2Types.js';

export type MissionsV2TelemetryEvent = {
  at: string;
  event: MissionsV2EventName;
  userId?: string;
  metadata?: Record<string, unknown>;
};

const MAX_EVENTS = 200;
const events: MissionsV2TelemetryEvent[] = [];

function cloneMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function recordMissionsV2Event(event: MissionsV2EventName, metadata?: {
  userId?: string;
  data?: Record<string, unknown>;
}): MissionsV2TelemetryEvent {
  const entry: MissionsV2TelemetryEvent = {
    at: new Date().toISOString(),
    event,
    userId: metadata?.userId,
    metadata: cloneMetadata(metadata?.data),
  };

  events.push(entry);

  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  const logPayload = {
    event,
    userId: entry.userId ?? null,
    ...(entry.metadata ?? {}),
  } satisfies Record<string, unknown>;

  console.info('[missions-v2]', logPayload);

  return entry;
}

export function getMissionsV2Events(filter?: { userId?: string }): MissionsV2TelemetryEvent[] {
  const filtered = filter?.userId ? events.filter((event) => event.userId === filter.userId) : events;
  return filtered.map((event) => ({ ...event, metadata: cloneMetadata(event.metadata) }));
}

export function clearMissionsV2Events(): void {
  events.splice(0, events.length);
}
