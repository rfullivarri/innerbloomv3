import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunner } = vi.hoisted(() => ({
  mockRunner: vi.fn(),
}));

vi.mock('../../services/debugTaskgenService.js', () => ({
  createDebugTaskgenRunner: () => mockRunner,
}));

describe('debug ai-taskgen router', () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.ENABLE_TASKGEN_TRIGGER = 'true';
    process.env.ADMIN_TRIGGER_TOKEN = 'test-token';
    process.env.DEBUG_ALLOW_IN_PROD = 'true';

    const { default: router } = await import('./ai-taskgen.js');
    app = express().use('/_debug/ai-taskgen', router);
  });

  beforeEach(() => {
    mockRunner.mockReset();
  });

  it('parses json bodies and forwards the payload to the runner', async () => {
    const payload = {
      user_id: '00000000-0000-0000-0000-000000000000',
      dry_run: false,
      mode: 'flow',
      seed: 123,
      prompt_override: '{"messages":[]}',
    };

    mockRunner.mockResolvedValue({
      status: 'ok',
      user_id: payload.user_id,
      mode: 'flow',
      placeholders: {},
      prompt_used: 'preview',
      openai: { model: 'gpt-test', timings_ms: { request: 0 } },
      tasks: [],
      validation: { valid: true, errors: [] },
      persisted: false,
      meta: { schema_version: 'v1' },
    });

    const response = await request(app)
      .post('/_debug/ai-taskgen/run')
      .set('content-type', 'application/json')
      .set('x-admin-token', 'test-token')
      .send(payload);

    expect(response.status).toBe(200);
    expect(mockRunner).toHaveBeenCalledWith({
      userId: payload.user_id,
      mode: 'flow',
      seed: 123,
      dryRun: false,
      promptOverride: payload.prompt_override,
      store: false,
    });
  });
});
