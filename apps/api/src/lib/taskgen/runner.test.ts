// #REMOVE_ME_DEBUG_BYPASS
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSnapshotOrMock } from './runner.js';

const TEST_USER_ID = '11111111-2222-4333-8444-555555555555';

describe('getSnapshotOrMock', () => {
  beforeEach(() => {
    delete process.env.DB_SNAPSHOT_PATH;
  });

  afterEach(() => {
    delete process.env.DB_SNAPSHOT_PATH;
    vi.restoreAllMocks();
  });

  it('loads the snapshot specified by DB_SNAPSHOT_PATH when available', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taskgen-snapshot-'));
    const snapshotPath = path.join(tempDir, 'snapshot.json');
    const payload = {
      samples: {
        users: [{ user_id: TEST_USER_ID }],
        cat_game_mode: [],
        cat_pillar: [],
        cat_trait: [],
        cat_difficulty: [],
        onboarding_session: [],
      },
    };
    await fs.writeFile(snapshotPath, JSON.stringify(payload), 'utf8');
    process.env.DB_SNAPSHOT_PATH = snapshotPath;

    const result = await getSnapshotOrMock({ requestedSource: 'snapshot', userId: TEST_USER_ID });

    expect(result.source).toBe('snapshot');
    expect(result.path).toBe(path.resolve(snapshotPath));
    expect(result.snapshot.users?.[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('falls back to mock when no snapshot or sample files can be loaded', async () => {
    process.env.DB_SNAPSHOT_PATH = path.join(os.tmpdir(), 'does-not-exist.json');
    vi.spyOn(fs, 'readFile').mockRejectedValue(Object.assign(new Error('not found'), { code: 'ENOENT' }));

    const result = await getSnapshotOrMock({ requestedSource: 'snapshot', userId: TEST_USER_ID });

    expect(result.source).toBe('mock');
    expect(result.snapshot.users?.[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('returns the mock snapshot when explicitly requested', async () => {
    const result = await getSnapshotOrMock({ requestedSource: 'mock', userId: TEST_USER_ID });

    expect(result.source).toBe('mock');
    expect(result.snapshot.users?.[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('loads the static fixture when explicitly requested', async () => {
    const fixturePayload = {
      snapshot: {
        users: [{ user_id: TEST_USER_ID }],
        cat_game_mode: [],
        cat_pillar: [],
        cat_trait: [],
        cat_difficulty: [],
        onboarding_session: [],
      },
      payload: {
        user_id: TEST_USER_ID,
        tasks_group_id: 'group',
        tasks: [],
      },
    };
    const originalReadFile = fs.readFile.bind(fs);
    vi.spyOn(fs, 'readFile').mockImplementation(
      async (
        targetPath: Parameters<typeof fs.readFile>[0],
        options: Parameters<typeof fs.readFile>[1],
      ) => {
        const resolved =
          typeof targetPath === 'string'
            ? targetPath
            : targetPath instanceof URL
            ? targetPath.toString()
            : typeof targetPath === 'object' && targetPath !== null && 'toString' in targetPath
            ? (targetPath as { toString(): string }).toString()
            : '';
        if (resolved.endsWith('taskgen.static.json')) {
          return JSON.stringify(fixturePayload);
        }
        return originalReadFile(targetPath, options);
      },
    );

    const result = await getSnapshotOrMock({ requestedSource: 'static', userId: TEST_USER_ID });

    expect(result.source).toBe('static');
    expect(result.snapshot.users?.[0]?.user_id).toBe(TEST_USER_ID);
    expect(result.payloadFromFixture?.tasks_group_id).toBe('group');
  });

  it('uses the bundled snapshot sample when present', async () => {
    const originalReadFile = fs.readFile.bind(fs);
    vi.spyOn(fs, 'readFile').mockImplementation(
      async (
        targetPath: Parameters<typeof fs.readFile>[0],
        options: Parameters<typeof fs.readFile>[1],
      ) => {
        const resolved =
          typeof targetPath === 'string'
            ? targetPath
            : targetPath instanceof URL
            ? targetPath.toString()
            : typeof targetPath === 'object' && targetPath !== null && 'toString' in targetPath
            ? (targetPath as { toString(): string }).toString()
            : '';
      if (resolved.endsWith('db-snapshot.json')) {
        throw Object.assign(new Error('forced ENOENT'), { code: 'ENOENT' });
      }
        return originalReadFile(targetPath, options);
      },
    );

    const result = await getSnapshotOrMock({ requestedSource: 'snapshot', userId: TEST_USER_ID });

    expect(result.source).toBe('snapshot');
    expect(result.path && result.path.endsWith('db-snapshot.sample.json')).toBe(true);
    expect(result.snapshot.cat_pillar?.length).toBeGreaterThan(0);
  });
});
