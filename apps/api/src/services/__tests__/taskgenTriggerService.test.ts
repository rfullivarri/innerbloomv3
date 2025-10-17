import { describe, expect, it, vi } from 'vitest';

describe('triggerTaskGenerationForUser', () => {
  it('normalizes the mode, disables dry runs, and persists tasks', async () => {
    vi.resetModules();

    const storeTasksSpy = vi.fn(async () => {});
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
    let capturedInput: unknown;

    vi.doMock('../debugTaskgenService.js', async () => {
      const actual = await vi.importActual<typeof import('../debugTaskgenService.js')>(
        '../debugTaskgenService.js',
      );

      return {
        __esModule: true,
        ...actual,
        createDebugTaskgenRunner: () => {
          const baseRunner = actual.createDebugTaskgenRunner({
            getContext: async (userId: string) => ({
              user: {
                user_id: userId,
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
              catalogs: {
                catalogPillars: '',
                catalogTraits: '',
                catalogStats: '',
                catalogDifficulty: '',
                pillarCodes: new Set(),
                traitsByCode: new Map(),
                pillarById: new Map(),
                statCodes: new Set(),
                difficultyCodes: new Set(),
                difficultiesByCode: new Map(),
                pillarsByCode: new Map(),
              },
              gameModesByCode: new Map(),
            }),
            resolveMode: (mode) => {
              expect(mode).toBe('flow');
              return 'flow';
            },
            loadPrompt: async () => ({
              path: 'test-prompt',
              prompt: { messages: [], response_format: { type: 'json_object' } },
            }),
            buildPlaceholders: () => ({ USER_ID: 'user-123' }),
            buildMessages: () => [],
            buildPromptPreview: () => 'preview',
            callOpenAI: async ({ mode }) => {
              expect(mode).toBe('flow');
              return {
                raw: JSON.stringify({ user_id: 'user-123', tasks_group_id: 'group-1', tasks }),
                model: 'gpt-test',
                durationMs: 1,
              };
            },
            validateTasks: () => ({ valid: true, errors: [] }),
            storeTasks: async (payload) => {
              await storeTasksSpy(payload);
            },
          });

          return async (input) => {
            capturedInput = input;
            return baseRunner(input);
          };
        },
      };
    });

    const { triggerTaskGenerationForUser } = await import('../taskgenTriggerService.js');

    triggerTaskGenerationForUser({ userId: 'user-123', mode: 'FLOW' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(storeTasksSpy).toHaveBeenCalledTimes(1);

    expect(capturedInput).toMatchObject({
      userId: 'user-123',
      dryRun: false,
      store: true,
      mode: 'flow',
    });

    const storePayload = storeTasksSpy.mock.calls[0][0];
    expect(storePayload.user.user_id).toBe('user-123');
    expect(storePayload.tasks).toEqual(tasks);
  });
});
