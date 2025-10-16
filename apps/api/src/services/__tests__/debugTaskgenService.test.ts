// #REMOVE_ME_DEBUG_BYPASS
import { describe, expect, it, vi } from 'vitest';
import { createDebugTaskgenRunner, type DebugTaskgenInput, type DebugTaskgenResult } from '../debugTaskgenService.js';

const baseContext = {
  user: {
    user_id: '00000000-0000-0000-0000-000000000000',
    tasks_group_id: '11111111-1111-1111-1111-111111111111',
  },
  onboarding: undefined,
  gameMode: { game_mode_id: 1, code: 'FLOW', name: 'Flow', weekly_target: 3 },
  catalogs: {
    catalogPillars: 'BODY, MIND',
    catalogTraits: 'BODY_MOBILITY [BODY], MIND_FOCUS [MIND]',
    catalogStats: 'BODY_MOBILITY [BODY], MIND_FOCUS [MIND]',
    catalogDifficulty: 'Easy — xp_base 1, Medium — xp_base 2',
    pillarCodes: new Set(['BODY', 'MIND']),
    traitsByCode: new Map([
      ['BODY_MOBILITY', { trait_id: 1, pillar_id: 1, code: 'BODY_MOBILITY' }],
      ['MIND_FOCUS', { trait_id: 2, pillar_id: 2, code: 'MIND_FOCUS' }],
    ]),
    pillarById: new Map([
      [1, { pillar_id: 1, code: 'BODY' }],
      [2, { pillar_id: 2, code: 'MIND' }],
    ]),
    statCodes: new Set(['BODY_MOBILITY', 'MIND_FOCUS']),
    difficultyCodes: new Set(['Easy', 'Medium']),
    difficultiesByCode: new Map([
      ['Easy', { difficulty_id: 1, code: 'Easy', xp_base: 1 }],
      ['Medium', { difficulty_id: 2, code: 'Medium', xp_base: 2 }],
    ]),
    pillarsByCode: new Map([
      ['BODY', { pillar_id: 1, code: 'BODY' }],
      ['MIND', { pillar_id: 2, code: 'MIND' }],
    ]),
  },
  gameModesByCode: new Map([
    ['flow', { game_mode_id: 1, code: 'FLOW', weekly_target: 3 }],
  ]),
};

const basePrompt = {
  prompt: {
    messages: [
      { role: 'system', content: 'Hello {{USER_ID}}' },
      { role: 'user', content: 'List tasks for {{GAME_MODE}}' },
    ],
  },
  path: '/tmp/mock.json',
};

const basePayload = {
  user_id: baseContext.user.user_id,
  tasks_group_id: String(baseContext.user.tasks_group_id),
  tasks: [
    {
      task: 'Test task',
      pillar_code: 'BODY',
      trait_code: 'BODY_MOBILITY',
      stat_code: 'BODY_MOBILITY',
      difficulty_code: 'Easy',
      friction_score: 10,
      friction_tier: 'E-F',
    },
  ],
};

describe('createDebugTaskgenRunner', () => {
  it('skips OpenAI when dryRun is true', async () => {
    const callOpenAI = vi.fn();
    const runner = createDebugTaskgenRunner({
      getContext: vi.fn().mockResolvedValue(baseContext),
      loadPrompt: vi.fn().mockResolvedValue(basePrompt),
      buildPlaceholders: vi.fn().mockReturnValue({ USER_ID: baseContext.user.user_id, TASKS_GROUP_ID: 'group' }),
      buildMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'mock' }]),
      buildPromptPreview: vi.fn().mockReturnValue('preview'),
      callOpenAI,
      validateTasks: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    });

    const input: DebugTaskgenInput = {
      userId: baseContext.user.user_id,
      dryRun: true,
    };

    const result = await runner(input);
    expect(result.status).toBe('ok');
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it('validates payload and returns error when invalid', async () => {
    const runner = createDebugTaskgenRunner({
      getContext: vi.fn().mockResolvedValue(baseContext),
      loadPrompt: vi.fn().mockResolvedValue(basePrompt),
      buildPlaceholders: vi.fn().mockReturnValue({ USER_ID: baseContext.user.user_id, TASKS_GROUP_ID: 'group' }),
      buildMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'mock' }]),
      buildPromptPreview: vi.fn().mockReturnValue('preview'),
      callOpenAI: vi.fn().mockResolvedValue({ raw: JSON.stringify(basePayload), model: 'gpt-test', durationMs: 1000 }),
      validateTasks: vi.fn().mockReturnValue({ valid: false, errors: ['oops'] }),
    });

    const input: DebugTaskgenInput = {
      userId: baseContext.user.user_id,
      dryRun: false,
    };

    const result = await runner(input);
    expect(result.status).toBe('error');
    expect(result.validation.errors).toEqual(['oops']);
  });

  it('persists tasks when store=true', async () => {
    const storeTasks = vi.fn().mockResolvedValue(undefined);
    const runner = createDebugTaskgenRunner({
      getContext: vi.fn().mockResolvedValue(baseContext),
      loadPrompt: vi.fn().mockResolvedValue(basePrompt),
      buildPlaceholders: vi.fn().mockReturnValue({ USER_ID: baseContext.user.user_id, TASKS_GROUP_ID: String(baseContext.user.tasks_group_id) }),
      buildMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'mock' }]),
      buildPromptPreview: vi.fn().mockReturnValue('preview'),
      callOpenAI: vi.fn().mockResolvedValue({ raw: JSON.stringify(basePayload), model: 'gpt-test', durationMs: 2000 }),
      validateTasks: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      storeTasks,
    });

    const input: DebugTaskgenInput = {
      userId: baseContext.user.user_id,
      dryRun: false,
      store: true,
    };

    const result: DebugTaskgenResult = await runner(input);
    expect(result.status).toBe('ok');
    expect(storeTasks).toHaveBeenCalledTimes(1);
    expect(result.persisted).toBe(true);
  });
});
