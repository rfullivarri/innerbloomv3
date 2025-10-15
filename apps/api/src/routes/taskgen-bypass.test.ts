import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');

  class MockChild extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
  }

  return {
    spawn: () => {
      const child = new MockChild();

      setImmediate(() => {
        const error = new Error('spawn pnpm ENOENT');
        child.emit('error', error);
      });

      return child as unknown as import('node:child_process').ChildProcess;
    },
  };
});

afterEach(() => {
  delete process.env.ADMIN_TRIGGER_TOKEN;
  delete process.env.ENABLE_TASKGEN_TRIGGER;
});

describe('GET /api/taskgen/dry-run/:user_id', () => {
  it('responds with structured error when pnpm cannot be found', async () => {
    process.env.ADMIN_TRIGGER_TOKEN = 'test-token';
    process.env.ENABLE_TASKGEN_TRIGGER = 'true';
    const { default: app } = await import('../app.js');

    const response = await request(app)
      .get('/api/taskgen/dry-run/test-user')
      .set('x-admin-token', 'test-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      user_id: 'test-user',
      mode: null,
      message: 'Failed to launch task generation CLI: spawn pnpm ENOENT',
      error_log: '/exports/errors.log',
    });
  });
});
