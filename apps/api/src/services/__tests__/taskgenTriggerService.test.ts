import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('triggerTaskGenerationForUser', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('normalizes the mode, records traces, and persists tasks only once', async () => {
    const tasks = [
      {
        task: 'Drink water',
        pillar_code: 'BODY',
        trait_code: 'HYDRATION',
        stat_code: 'BODY',
        difficulty_code: 'EASY',
        friction_score: 1,
        friction_tier: 'low',
      },
    ];

    const catalogs = {
      catalogPillars: '',
      catalogTraits: '',
      catalogStats: '',
      catalogDifficulty: '',
      pillarCodes: new Set(['BODY']),
      traitsByCode: new Map([
        [
          'HYDRATION',
          { trait_id: 10, pillar_id: 1, code: 'HYDRATION', name: 'Hydration' },
        ],
      ]),
      pillarById: new Map([[1, { pillar_id: 1, code: 'BODY', name: 'Body' }]]),
      statCodes: new Set(),
      difficultyCodes: new Set(['EASY']),
      difficultiesByCode: new Map([
        [
          'EASY',
          { difficulty_id: 1, code: 'EASY', name: 'Easy', xp_base: 10 },
        ],
      ]),
      pillarsByCode: new Map([[
        'BODY',
        { pillar_id: 1, code: 'BODY', name: 'Body' },
      ]]),
    } as const;

    const queryMock = vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return {};
      }

      if (sql.startsWith('SELECT task_id FROM tasks WHERE tasks_group_id')) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.startsWith('INSERT INTO tasks')) {
        return { rowCount: 1 };
      }

      if (sql.includes('INSERT INTO user_journey_generation_state')) {
        return { rowCount: 1 };
      }

      throw new Error(`Unexpected query: ${sql}`);
    });

    vi.doMock('../../db.js', () => ({
      withClient: (callback: (client: { query: typeof queryMock }) => Promise<unknown>) =>
        callback({ query: queryMock }),
    }));

    vi.doMock('../debugTaskgenService.js', async () => {
      const actual = await vi.importActual<typeof import('../debugTaskgenService.js')>('../debugTaskgenService.js');

      const baseContext = {
        user: {
          user_id: 'user-123',
          tasks_group_id: 'group-1',
          email_primary: null,
          full_name: null,
          image_url: null,
          game_mode_id: null,
          timezone: null,
          first_date_log: null,
          scheduler_enabled: null,
          user_profile: null,
          channel_scheduler: null,
          status_scheduler: null,
          preferred_language: null,
          preferred_timezone: null,
        },
        onboarding: undefined,
        gameMode: undefined,
        catalogs,
        gameModesByCode: new Map(),
      } as const;

      const baseDeps = {
        getContext: async () => baseContext,
        resolveMode: (requested: import('../debugTaskgenService.js').Mode | undefined) => requested ?? 'flow',
        loadPrompt: async () => ({
          path: 'prompt.json',
          prompt: { messages: [], response_format: { type: 'json_object' } },
        }),
        parseOverride: async (override: string) => ({
          prompt: { messages: [], response_format: { type: 'json_object' } },
          source: override,
        }),
        buildPlaceholders: () => ({
          USER_ID: baseContext.user.user_id,
          TASKS_GROUP_ID: baseContext.user.tasks_group_id ?? 'group-1',
        }),
        buildMessages: () => [],
        buildPromptPreview: () => 'preview',
        callOpenAI: async () => ({
          raw: JSON.stringify({
            user_id: baseContext.user.user_id,
            tasks_group_id: baseContext.user.tasks_group_id,
            tasks,
          }),
          model: 'gpt-test',
          durationMs: 1,
        }),
        validateTasks: () => ({ valid: true, errors: [] as string[] }),
        storeTasks: async () => undefined,
      } satisfies import('../debugTaskgenService.js').DebugTaskgenDeps;

      return {
        __esModule: true,
        ...actual,
        createDefaultDebugTaskgenDeps: () => baseDeps,
        createDebugTaskgenRunner: (overrides?: Partial<typeof baseDeps>) => {
          const deps = { ...baseDeps, ...overrides };

          return async (input: import('../debugTaskgenService.js').DebugTaskgenInput) => {
            const context = await deps.getContext(input.userId);
            const mode = deps.resolveMode(input.mode as import('../debugTaskgenService.js').Mode | undefined, context);
            const placeholders = deps.buildPlaceholders(context);
            await deps.loadPrompt(mode);
            const openAiResult = await deps.callOpenAI({ mode, messages: [], responseFormat: { type: 'json_object' } });
            const payload = JSON.parse(openAiResult.raw) as import('../debugTaskgenService.js').TaskPayload;
            const validation = deps.validateTasks(payload, context.catalogs, placeholders, undefined);

            if (validation.valid && input.store) {
              await deps.storeTasks({ user: context.user, catalogs: context.catalogs, tasks: payload.tasks });
            }

            return {
              status: validation.valid ? 'ok' : 'error',
              user_id: context.user.user_id,
              mode,
              placeholders,
              prompt_used: 'preview',
              openai: { model: 'gpt-test', timings_ms: { request: 1 }, raw_preview: openAiResult.raw.slice(0, 1000) },
              tasks: payload.tasks,
              validation,
              persisted: validation.valid && input.store,
              meta: { schema_version: 'v1', seed: input.seed },
              prompt_source: 'prompt.json',
              error: validation.valid ? undefined : 'validation failed',
            } satisfies import('../debugTaskgenService.js').DebugTaskgenResult;
          };
        },
      };
    });

    const traceModule = await import('../taskgenTraceService.js');
    traceModule.clearTaskgenEvents();

    const { triggerTaskGenerationForUser } = await import('../taskgenTriggerService.js');

    const correlationId = triggerTaskGenerationForUser({ userId: 'user-123', mode: 'FLOW', origin: 'test' });

    expect(typeof correlationId).toBe('string');

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const insertCalls = queryMock.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO tasks'));
    expect(insertCalls).toHaveLength(1);

    const events = traceModule.getTaskgenEventsByCorrelation(correlationId);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].correlationId).toBe(correlationId);

    const runnerStart = events.find((event) => event.event === 'RUNNER_STARTED');
    expect(runnerStart).toBeDefined();
    expect(runnerStart?.mode).toBe('flow');

    const openaiRequest = events.find((event) => event.event === 'OPENAI_REQUEST');
    expect(openaiRequest).toBeDefined();
    expect(openaiRequest?.data?.paramFilter).toBe('off');
  });
});
