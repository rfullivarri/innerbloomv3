import { randomUUID } from 'node:crypto';
import { withClient } from '../db.js';
import {
  createDebugTaskgenRunner,
  createDefaultDebugTaskgenDeps,
  type DebugTaskgenDeps,
  type Mode,
} from './debugTaskgenService.js';
import { isReasoningModel } from '../lib/taskgen/openaiPayload.js';
import {
  recordTaskgenEvent,
  type TaskgenEventLevel,
  type TaskgenEventName,
} from './taskgenTraceService.js';
import { notifyTasksReadyEmail } from './tasksReadyEmailService.js';
import { upsertJourneyGenerationState } from './journeyGenerationStateService.js';
import { markOnboardingProgressStep } from './onboardingProgressService.js';
import {
  assignBalancedDifficultiesByPillar,
  normalizeGameModeForDifficultyEngine,
} from './difficultyBalanceEngine.js';

type TriggerInput = {
  userId: string;
  mode?: string | null;
  origin?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

type StoreArgs = Parameters<DebugTaskgenDeps['storeTasks']>[0] & {
  correlationId?: string;
  origin?: string;
  mode?: Mode;
};

type StoreOutcome = {
  inserted: number;
  skipped: number;
  reason: 'existing_active_tasks' | 'no_tasks' | 'inserted';
};

type QuickStartManualCandidate = {
  task: string;
  pillar_code: string;
  trait_code: string;
  input_value?: string;
  metadata?: Record<string, unknown>;
};

function getStringFromMetadata(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type EngineDifficultyCode = 'EASY' | 'MEDIUM' | 'HARD';
type QuickStartDifficultyMap = Record<EngineDifficultyCode, string>;

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

      if (inserted > 0) {
        notifyTasksReadyEmail({
          userId: user.user_id,
          tasksGroupId,
          to: user.email_primary ?? user.email ?? null,
          displayName: user.first_name ?? user.full_name ?? null,
          timezone: user.timezone ?? null,
          taskCount: inserted,
          origin: args.origin,
          correlationId: args.correlationId,
        }).catch((error: unknown) => {
          console.error(LOG_PREFIX, {
            event: 'TASKS_READY_EMAIL_FAILED',
            userId: user.user_id,
            tasksGroupId,
            error: getErrorMessage(error),
          });
        });
      }

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
      const targetModel = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
      const paramFilter = isReasoningModel(targetModel) ? 'on' : 'off';
      emitEvent({
        level: 'info',
        event: 'OPENAI_REQUEST',
        correlationId: options.correlationId,
        userId: options.userId,
        mode: options.mode,
        origin: options.origin,
        data: {
          model: targetModel,
          messageCount: input.messages.length,
          responseFormat: input.responseFormat ? (input.responseFormat as Record<string, unknown>).type ?? null : null,
          paramFilter,
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
      const invalidTraitPillarPair =
        result.valid || !Array.isArray(payload.tasks)
          ? null
          : payload.tasks
              .map((task) => {
                const expectedPillarCode = catalogs.traitToPillarCode.get(task.trait_code);
                if (!expectedPillarCode || expectedPillarCode === task.pillar_code) {
                  return null;
                }
                return {
                  trait_code: task.trait_code,
                  pillar_code: task.pillar_code,
                  expected_pillar_code: expectedPillarCode,
                };
              })
              .find((pair) => pair !== null) ?? null;
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
          invalidTraitPillarPair,
        },
      });
      return result;
    },
    storeTasks: async ({ user, catalogs, tasks }) => {
      const outcome = await storeTasksWithIdempotency({
        user,
        catalogs,
        tasks,
        correlationId: options.correlationId,
        origin: options.origin,
        mode: options.mode,
      });
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
  if (isQuickStartManualGeneration(args.metadata)) {
    emitEvent({
      level: 'info',
      event: 'RUNNER_STARTED',
      correlationId: args.correlationId,
      userId: args.userId,
      mode: args.mode,
      origin: args.origin,
      data: { stage: 'quick_start manual branch entered' },
    });
    await runQuickStartManualTaskGeneration(args);
    return;
  }

  await upsertJourneyGenerationState(args.userId, 'running', { correlationId: args.correlationId });

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

  if (result.status === 'ok') {
    await upsertJourneyGenerationState(args.userId, 'completed', { correlationId: args.correlationId });
    await markOnboardingProgressStep(args.userId, 'tasks_generated', {
      source: { trigger: 'task_generation_completed', correlation_id: args.correlationId },
    });
  } else {
    await upsertJourneyGenerationState(args.userId, 'failed', {
      correlationId: args.correlationId,
      failureReason: result.error ?? 'task_generation_failed',
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

function isQuickStartManualGeneration(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata || metadata.onboardingPath !== 'quick_start') {
    return false;
  }

  const quickStartData = metadata.quickStart;
  if (!quickStartData || typeof quickStartData !== 'object') {
    return false;
  }

  const manualCandidates = (quickStartData as { manual_task_candidates?: unknown }).manual_task_candidates;
  return Array.isArray(manualCandidates) && manualCandidates.length > 0;
}

function normalizeDifficultyToken(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAnyToken(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function pickDifficultyCodeByTokens(
  difficulties: { code: string; name?: string | null }[],
  tokens: readonly string[],
  reserved: Set<string>,
): string | undefined {
  for (const difficulty of difficulties) {
    if (reserved.has(difficulty.code)) {
      continue;
    }
    const normalized = `${normalizeDifficultyToken(difficulty.code)} ${normalizeDifficultyToken(difficulty.name)}`.trim();
    if (includesAnyToken(normalized, tokens)) {
      return difficulty.code;
    }
  }
  return undefined;
}

function buildQuickStartDifficultyMap(context: Awaited<ReturnType<DebugTaskgenDeps['getContext']>>): QuickStartDifficultyMap {
  const difficultyRows = Array.from(context.catalogs.difficultiesByCode.values());
  if (difficultyRows.length === 0) {
    throw new Error('cat_difficulty catalog is empty; cannot map quick start difficulty codes');
  }

  const ordered = [...difficultyRows].sort((a, b) => {
    const xpA = Number.isFinite(a.xp_base) ? Number(a.xp_base) : Number.POSITIVE_INFINITY;
    const xpB = Number.isFinite(b.xp_base) ? Number(b.xp_base) : Number.POSITIVE_INFINITY;
    if (xpA !== xpB) {
      return xpA - xpB;
    }
    return a.difficulty_id - b.difficulty_id;
  });

  const reserved = new Set<string>();
  const easy = pickDifficultyCodeByTokens(ordered, ['easy', 'facil', 'baja', 'low', 'light'], reserved) ?? ordered[0]?.code;
  if (easy) {
    reserved.add(easy);
  }
  const hard = pickDifficultyCodeByTokens(ordered, ['hard', 'dificil', 'alta', 'high', 'intense'], reserved)
    ?? ordered[ordered.length - 1]?.code;
  if (hard) {
    reserved.add(hard);
  }
  const middleIndex = Math.floor((ordered.length - 1) / 2);
  const medium = pickDifficultyCodeByTokens(ordered, ['medium', 'med', 'normal', 'moderate'], reserved)
    ?? ordered[middleIndex]?.code
    ?? easy
    ?? hard;

  if (!easy || !medium || !hard) {
    throw new Error('Unable to resolve quick start difficulty mapping from cat_difficulty');
  }

  return {
    EASY: easy,
    MEDIUM: medium,
    HARD: hard,
  };
}

async function runQuickStartManualTaskGeneration(args: {
  correlationId: string;
  userId: string;
  mode: Mode | undefined;
  origin: string;
  metadata?: Record<string, unknown>;
}) {
  await upsertJourneyGenerationState(args.userId, 'running', { correlationId: args.correlationId });

  const deps = createDefaultDebugTaskgenDeps();
  const context = await deps.getContext(args.userId);

  const quickStartData = (args.metadata?.quickStart ?? {}) as {
    manual_task_candidates?: QuickStartManualCandidate[];
  };
  const manualCandidates = Array.isArray(quickStartData.manual_task_candidates)
    ? quickStartData.manual_task_candidates
    : [];

  emitEvent({
    level: 'info',
    event: 'CONTEXT_READY',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: {
      stage: 'quick_start candidates received',
      candidates: manualCandidates.length,
      tasksGroupId: context.user.tasks_group_id ?? null,
      gameModeCode: context.gameMode?.code ?? null,
    },
  });

  const gameModeCode = context.gameMode?.code ?? args.mode ?? null;
  const normalizedTasks = manualCandidates
    .map((candidate) => {
      const pillarCode = candidate.pillar_code.trim().toUpperCase();
      const traitCode = candidate.trait_code.trim().toUpperCase();
      const baseTask = candidate.task.trim();
      const inputValue = candidate.input_value?.trim();
      const taskPrefix = getStringFromMetadata(candidate.metadata, 'task_prefix');
      const taskInputBefore = getStringFromMetadata(candidate.metadata, 'task_input_before');
      const taskInputAfter = getStringFromMetadata(candidate.metadata, 'task_input_after');

      if (!pillarCode || !traitCode || !baseTask) {
        return null;
      }

      let resolvedTask = baseTask;

      if (inputValue) {
        const composed = [taskPrefix ?? baseTask, taskInputBefore, inputValue, taskInputAfter]
          .filter((part): part is string => Boolean(part && part.trim().length > 0))
          .join(' ')
          .trim();

        resolvedTask = composed.length > 0 ? composed : `${baseTask} ${inputValue}`.trim();
      }

      return {
        task: resolvedTask,
        pillar_code: pillarCode,
        trait_code: traitCode,
        stat_code: traitCode,
        friction_score: 0,
        friction_tier: 'quick_start',
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  emitEvent({
    level: 'info',
    event: 'VALIDATION_OK',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: { stage: 'quick_start normalized tasks', count: normalizedTasks.length },
  });

  const tasks = assignBalancedDifficultiesByPillar({
    tasks: normalizedTasks,
    gameMode: normalizeGameModeForDifficultyEngine(gameModeCode),
    seed: `${args.userId}:${args.correlationId}`,
  });

  const difficultyMap = buildQuickStartDifficultyMap(context);
  const mappedTasks = tasks.map((task) => ({
    ...task,
    difficulty_code: difficultyMap[task.difficulty_code as EngineDifficultyCode],
  }));

  emitEvent({
    level: 'info',
    event: 'VALIDATION_OK',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: {
      stage: 'quick_start difficulty assigned',
      count: mappedTasks.length,
      difficultyMap,
      byDifficulty: mappedTasks.reduce<Record<string, number>>((acc, task) => {
        acc[task.difficulty_code] = (acc[task.difficulty_code] ?? 0) + 1;
        return acc;
      }, {}),
    },
  });
  const payload = {
    user_id: context.user.user_id,
    tasks_group_id: context.user.tasks_group_id ?? 'N/A',
    tasks: mappedTasks,
  };
  const placeholders = deps.buildPlaceholders(context);
  const validation = deps.validateTasks(payload, context.catalogs, placeholders, undefined);

  if (!validation.valid) {
    await upsertJourneyGenerationState(args.userId, 'failed', {
      correlationId: args.correlationId,
      failureReason: validation.errors.join('; '),
    });
    emitEvent({
      level: 'warn',
      event: 'VALIDATION_FAILED',
      correlationId: args.correlationId,
      userId: args.userId,
      mode: args.mode,
      origin: args.origin,
      data: { stage: 'quick_start validate fail', errors: validation.errors, taskCount: mappedTasks.length },
    });
    return;
  }

  emitEvent({
    level: 'info',
    event: 'VALIDATION_OK',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: { stage: 'quick_start validate ok', taskCount: mappedTasks.length },
  });

  const outcome = await storeTasksWithIdempotency({
    user: context.user,
    catalogs: context.catalogs,
    tasks: mappedTasks,
    correlationId: args.correlationId,
    origin: args.origin,
    mode: args.mode,
  });

  emitEvent({
    level: outcome.inserted > 0 ? 'info' : 'warn',
    event: 'TASKS_STORED',
    correlationId: args.correlationId,
    userId: args.userId,
    mode: args.mode,
    origin: args.origin,
    data: {
      stage: 'quick_start store result',
      inserted: outcome.inserted,
      skipped: outcome.skipped,
      reason: outcome.reason,
    },
  });

  if (outcome.reason === 'inserted') {
    await upsertJourneyGenerationState(args.userId, 'completed', { correlationId: args.correlationId });
    await markOnboardingProgressStep(args.userId, 'tasks_generated', {
      source: { trigger: 'quick_start', correlation_id: args.correlationId },
    });
    emitEvent({
      level: 'info',
      event: 'RUNNER_ENDED',
      correlationId: args.correlationId,
      userId: args.userId,
      mode: args.mode,
      origin: args.origin,
      data: { stage: 'quick_start tasks_generated marked', status: 'completed' },
    });
  } else {
    await upsertJourneyGenerationState(args.userId, 'failed', {
      correlationId: args.correlationId,
      failureReason: outcome.reason,
    });
  }
}

export function triggerTaskGenerationForUser(input: TriggerInput): string {
  const correlationId = input.correlationId ?? randomUUID();
  const normalizedMode = normalizeMode(input.mode);
  const origin = input.origin ?? 'system';

  void upsertJourneyGenerationState(input.userId, 'pending', { correlationId })
    .catch(() => undefined);

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
      void upsertJourneyGenerationState(input.userId, 'failed', {
        correlationId,
        failureReason: message,
      }).catch(() => undefined);
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
