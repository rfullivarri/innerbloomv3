import request from 'supertest';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

const spawnMock = vi.fn<
  [string, string[], { cwd: string; env: NodeJS.ProcessEnv; stdio: 'pipe' }],
  import('node:child_process').ChildProcess
>();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

afterEach(() => {
  delete process.env.ADMIN_TRIGGER_TOKEN;
  delete process.env.ENABLE_TASKGEN_TRIGGER;
  spawnMock.mockReset();
});

describe('GET /api/taskgen/dry-run/:user_id', () => {
  it('falls back to npm exec when pnpm is unavailable', async () => {
    process.env.ADMIN_TRIGGER_TOKEN = 'test-token';
    process.env.ENABLE_TASKGEN_TRIGGER = 'true';
    spawnMock.mockImplementationOnce(() => {
      const child = new MockChildProcess();

      setImmediate(() => {
        const error = new Error('spawn pnpm ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        child.emit('error', error);
      });

      return child as unknown as import('node:child_process').ChildProcess;
    });

    spawnMock.mockImplementationOnce(() => {
      const child = new MockChildProcess();

      setImmediate(() => {
        child.stdout.emit('data', 'Generated exports for test-user.low\n');
        child.emit('close', 0);
      });

      return child as unknown as import('node:child_process').ChildProcess;
    });

    const { default: app } = await import('../app.js');

    const response = await request(app)
      .get('/api/taskgen/dry-run/test-user')
      .set('x-admin-token', 'test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      user_id: 'test-user',
      mode: 'low',
      files: [
        '/exports/test-user.low.json',
        '/exports/test-user.low.jsonl',
        '/exports/test-user.low.csv',
      ],
    });

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock.mock.calls[0]?.[0]).toBe('pnpm');
    expect(spawnMock.mock.calls[0]?.[1]).toEqual([
      'ts-node',
      'scripts/generateTasks.ts',
      '--user',
      'test-user',
    ]);

    expect(spawnMock.mock.calls[1]?.[0]).toBe(process.platform === 'win32' ? 'npm.cmd' : 'npm');
    expect(spawnMock.mock.calls[1]?.[1]).toEqual([
      'exec',
      '--',
      'ts-node',
      'scripts/generateTasks.ts',
      '--user',
      'test-user',
    ]);
  });

  it('returns a combined error when pnpm and npm exec are unavailable', async () => {
    process.env.ADMIN_TRIGGER_TOKEN = 'test-token';
    process.env.ENABLE_TASKGEN_TRIGGER = 'true';

    spawnMock.mockImplementationOnce(() => {
      const child = new MockChildProcess();

      setImmediate(() => {
        const error = new Error('spawn pnpm ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        child.emit('error', error);
      });

      return child as unknown as import('node:child_process').ChildProcess;
    });

    spawnMock.mockImplementationOnce(() => {
      const child = new MockChildProcess();

      setImmediate(() => {
        const error = new Error('spawn npm ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        child.emit('error', error);
      });

      return child as unknown as import('node:child_process').ChildProcess;
    });

    const { default: app } = await import('../app.js');

    const response = await request(app)
      .get('/api/taskgen/dry-run/test-user')
      .set('x-admin-token', 'test-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      user_id: 'test-user',
      mode: null,
      message: 'Failed to launch task generation CLI: spawn pnpm ENOENT; spawn npm ENOENT',
      error_log: '/exports/errors.log',
    });
  });
});
