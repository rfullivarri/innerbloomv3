export type TaskgenEventLevel = 'info' | 'warn' | 'error';
export type TaskgenEventName =
  | 'TRIGGER_RECEIVED'
  | 'RUNNER_STARTED'
  | 'CONTEXT_READY'
  | 'OPENAI_REQUEST'
  | 'OPENAI_RESPONSE'
  | 'VALIDATION_OK'
  | 'VALIDATION_FAILED'
  | 'TASKS_STORED'
  | 'OPENAI_MISCONFIGURED'
  | 'RUNNER_EXCEPTION'
  | 'RUNNER_ENDED';

export type TaskgenTraceEvent = {
  at: string;
  level: TaskgenEventLevel;
  event: TaskgenEventName;
  userId: string;
  correlationId: string;
  mode?: string | null;
  origin?: string | null;
  data?: Record<string, unknown>;
};

type RecordTaskgenEventInput = {
  at?: string;
  level: TaskgenEventLevel;
  event: TaskgenEventName;
  userId: string;
  correlationId: string;
  mode?: string | null;
  origin?: string | null;
  data?: Record<string, unknown> | null;
};

const MAX_EVENTS = 500;
const events: TaskgenTraceEvent[] = [];

function cloneData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (!data) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function recordTaskgenEvent(input: RecordTaskgenEventInput): TaskgenTraceEvent {
  const entry: TaskgenTraceEvent = {
    at: input.at ?? new Date().toISOString(),
    level: input.level,
    event: input.event,
    userId: input.userId,
    correlationId: input.correlationId,
    mode: input.mode,
    origin: input.origin,
    data: cloneData(input.data),
  };

  events.push(entry);

  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  return entry;
}

function sortDesc(entries: TaskgenTraceEvent[]): TaskgenTraceEvent[] {
  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function getTaskgenEventsByUser(userId: string): TaskgenTraceEvent[] {
  return sortDesc(events.filter((event) => event.userId === userId)).map((event) => ({ ...event }));
}

export function getTaskgenEventsByCorrelation(correlationId: string): TaskgenTraceEvent[] {
  return sortDesc(events.filter((event) => event.correlationId === correlationId)).map((event) => ({ ...event }));
}

export function getTaskgenEventsGlobal(limit: number): TaskgenTraceEvent[] {
  return sortDesc(events.slice(-limit)).map((event) => ({ ...event }));
}

export function clearTaskgenEvents(): void {
  events.splice(0, events.length);
}
