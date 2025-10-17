import { randomUUID } from 'node:crypto';
import { withClient } from '../db.js';
import {
  createDebugTaskgenRunner,
  createDefaultDebugTaskgenDeps,
  type DebugTaskgenDeps,
  type Mode,
} from './debugTaskgenService.js';
import {
  recordTaskgenEvent,
  type TaskgenEventLevel,
  type TaskgenEventName,
} from './taskgenTraceService.js';

type TriggerInput = {
  userId: string;
  mode?: string | null;
  origin?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

type StoreArgs = Parameters<DebugTaskgenDeps['storeTasks']>[0];

type StoreOutcome = {
  inserted: number;
  skipped: number;
  reason: 'existing_active_tasks' | 'no_tasks' | 'inserted';
};

const LOG_PREFIX = '[taskgen-trigger]';
const OPENAI_MISCONFIGURED_MESSAGE = 'OPENAI_API_KEY is not configured';
const PREVIEW_LIMIT = 180;

function normalizeMode(mode: string | null | undefined): Mode | undefined {
  if (!mode) {
    return undefined;
  }

  const normalized = mode.toLowerCase();

  switch (normalized) {
    case 'low':
    case 'chill':
    case 'flow':
    case 'evolve':
      return normalized as Mode;
    default:
      return undefined;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function logWithLevel(level: TaskgenEventLevel, event: TaskgenEventName, metadata: Record<string, unknown>): void {
  const payload = { event, ...metadata };

  switch (level) {
    case 'info':
      console.info(LOG_PREFIX, payload);
      break;
    case 'warn':
      console.warn(LOG_PREFIX, payload);
      break;
    case 'error':
      console.error(LOG_PREFIX, payload);
      break;
    default:
      console.log(LOG_PREFIX, payload);
  }
}

function emitEvent(args: {
  level: TaskgenEventLevel;
  event: TaskgenEventName;
  correlationId: string;
  userId: string;
  mode?: Mode;
  origin: string;
  data?: Record<string, unknown>;
}) {
  recordTaskgenEvent({
    level: args.level,
    event: args.event,
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode ?? null,
    origin: args.origin,
    data: args.data,
  });

  logWithLevel(args.level, args.event, {
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    ...(args.data ?? {}),
  });
}

async function storeTasksWithIdempotency(args: StoreArgs): Promise<StoreOutcome> {
  const { user, catalogs, tasks } = args;

  if (!user.tasks_group_id) {
    throw new Error('User is missing tasks_group_id; cannot persist tasks');
  }

  const tasksGroupId = user.tasks_group_id;

  return withClient(async (client) => {
    await client.query('BEGIN');

    try {
      const existing = await client.query<{ task_id: string }>(
        'SELECT task_id FROM tasks WHERE tasks_group_id = $1 AND active = TRUE LIMIT 1',
        [tasksGroupId],
      );

      if ((existing.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return { inserted: 0, skipped: tasks.length, reason: 'existing_active_tasks' } as const;
      }

      if (tasks.length === 0) {
        await client.query('COMMIT');
        return { inserted: 0, skipped: 0, reason: 'no_tasks' } as const;
      }

      let inserted = 0;

      for (const task of tasks) {
        const pillar = catalogs.pillarsByCode.get(task.pillar_code);
        const trait = catalogs.traitsByCode.get(task.trait_code);
        const difficulty = catalogs.difficultiesByCode.get(task.difficulty_code);

        if (!pillar || !trait || !difficulty) {
          throw new Error(`Unable to resolve catalog IDs for task ${task.task}`);
        }

        const result = await client.query(
          `INSERT INTO tasks (task_id, user_id, tasks_group_id, task, pillar_id, trait_id, difficulty_id, xp_base, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [
            randomUUID(),
            user.user_id,
            tasksGroupId,
            task.task,
            pillar.pillar_id,
            trait.trait_id,
            difficulty.difficulty_id,
            difficulty.xp_base ?? 0,
          ],
        );

        inserted += result.rowCount ?? 0;
      }

      await client.query('COMMIT');
      return {
        inserted,
        skipped: Math.max(tasks.length - inserted, 0),
        reason: 'inserted',
      } as const;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

function createInstrumentedRunner(options: {
  correlationId: string;
  userId: string;
  mode: Mode | undefined;
  origin: string;
  metadata?: Record<string, unknown>;
}) {
  const baseDeps = createDefaultDebugTaskgenDeps();

  return createDebugTaskgenRunner({
    getContext: async (userId) => {
      const context = await baseDeps.getContext(userId);
      emitEvent({
        level: 'info',
        event: 'CONTEXT_READY',
        correlationId: options.correlationId,
        userId: options.userId,
        mode: options.mode,
        origin: options.origin,
        data: {
          tasksGroupId: context.user.tasks_group_id ?? null,
          hasOnboarding: Boolean(context.onboarding?.onboarding_session_id),
          gameModeCode: context.gameMode?.code ?? null,
        },
      });
      return context;
    },
    resolveMode: baseDeps.resolveMode,
    loadPrompt: baseDeps.loadPrompt,
    parseOverride: baseDeps.parseOverride,
    buildPlaceholders: baseDeps.buildPlaceholders,
    buildMessages: baseDeps.buildMessages,
    buildPromptPreview: baseDeps.buildPromptPreview,
    callOpenAI: async (input) => {
      emitEvent({
        level: 'info',
        event: 'OPENAI_REQUEST',
        correlationId: options.correlationId,
        userId: options.userId,
        mode: options.mode,
        origin: options.origin,
        data: {
          messageCount: input.messages.length,
          responseFormat: input.responseFormat ? (input.responseFormat as Record<string, unknown>).type ?? null : null,
        },
      });

      try {
        const result = await baseDeps.callOpenAI(input);
        emitEvent({
          level: 'info',
          event: 'OPENAI_RESPONSE',
          correlationId: options.correlationId,
          userId: options.userId,
          mode: options.mode,
          origin: options.origin,
          data: {
            model: result.model,
            durationMs: result.durationMs,
            preview: result.raw.slice(0, PREVIEW_LIMIT),
          },
        });
        return result;
      } catch (error) {
        if (getErrorMessage(error).includes(OPENAI_MISCONFIGURED_MESSAGE)) {
          emitEvent({
            level: 'error',
            event: 'OPENAI_MISCONFIGURED',
            correlationId: options.correlationId,
            userId: options.userId,
            mode: options.mode,
            origin: options.origin,
            data: { message: OPENAI_MISCONFIGURED_MESSAGE },
          });
        }
        throw error;
      }
    },
    validateTasks: (payload, catalogs, placeholders, schema) => {
      const result = baseDeps.validateTasks(payload, catalogs, placeholders, schema);
      emitEvent({
        level: result.valid ? 'info' : 'warn',
        event: result.valid ? 'VALIDATION_OK' : 'VALIDATION_FAILED',
        correlationId: options.correlationId,
        userId: options.userId,
        mode: options.mode,
        origin: options.origin,
        data: {
          taskCount: payload.tasks?.length ?? 0,
          errors: result.valid ? [] : result.errors,
        },
      });
      return result;
    },
    storeTasks: async ({ user, catalogs, tasks }) => {
      const outcome = await storeTasksWithIdempotency({ user, catalogs, tasks });
      emitEvent({
        level: outcome.inserted > 0 ? 'info' : 'warn',
        event: 'TASKS_STORED',
        correlationId: options.correlationId,
        userId: options.userId,
        mode: options.mode,
        origin: options.origin,
        data: {
          inserted: outcome.inserted,
          skipped: outcome.skipped,
          reason: outcome.reason,
          tasksGroupId: user.tasks_group_id ?? null,
        },
      });
    },
  });
}

async function runTaskGeneration(args: {
  correlationId: string;
  userId: string;
  mode: Mode | undefined;
  origin: string;
  metadata?: Record<string, unknown>;
}) {
  emitEvent({
    level: 'info',
    event: 'RUNNER_STARTED',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: args.metadata,
  });

  const runner = createInstrumentedRunner(args);

  const result = await runner({
    userId: args.userId,
    mode: args.mode,
    dryRun: false,
    store: true,
  });

  if (result.error) {
    emitEvent({
      level: 'error',
      event: 'RUNNER_EXCEPTION',
      correlationId: args.correlationId,
      userId: args.userId,
      mode: args.mode,
      origin: args.origin,
      data: { message: result.error },
    });
  }

  emitEvent({
    level: result.status === 'ok' ? 'info' : result.error ? 'error' : 'warn',
    event: 'RUNNER_ENDED',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: {
      status: result.status,
      persisted: result.persisted,
      validation: result.validation,
      openaiModel: result.openai.model,
      taskCount: result.tasks?.length ?? 0,
      error: result.error ?? null,
    },
  });
}

export function triggerTaskGenerationForUser(input: TriggerInput): string {
  const correlationId = input.correlationId ?? randomUUID();
  const normalizedMode = normalizeMode(input.mode);
  const origin = input.origin ?? 'system';

  emitEvent({
    level: 'info',
    event: 'TRIGGER_RECEIVED',
    correlationId,
    userId: input.userId,
    mode: normalizedMode,
    origin,
    data: {
      mode: input.mode ?? null,
      metadata: input.metadata ?? null,
    },
  });

  setImmediate(() => {
    void runTaskGeneration({
      correlationId,
      userId: input.userId,
      mode: normalizedMode,
      origin,
      metadata: input.metadata,
    }).catch((error: unknown) => {
      const message = getErrorMessage(error);
      emitEvent({
        level: 'error',
        event: 'RUNNER_EXCEPTION',
        correlationId,
        userId: input.userId,
        mode: normalizedMode,
        origin,
        data: { message, stage: 'unhandled_rejection' },
      });
      emitEvent({
        level: 'error',
        event: 'RUNNER_ENDED',
        correlationId,
        userId: input.userId,
        mode: normalizedMode,
        origin,
        data: {
          status: 'error',
          persisted: false,
          error: message,
        },
      });
    });
  });

  return correlationId;
}
