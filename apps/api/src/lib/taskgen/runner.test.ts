// #REMOVE_ME_DEBUG_BYPASS
import { promises as fs, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import { isReasoningModel, sanitizeReasoningParameters } from './openaiPayload.js';
const mockResponsesCreate = vi.fn();

const PROMPT_TEST_DIR = mkdtempSync(path.join(os.tmpdir(), 'taskgen-prompts-static-'));
const PROMPT_TEST_FILE = path.join(PROMPT_TEST_DIR, 'flow.json');
const PROMPT_TEST_PAYLOAD = {
  messages: [{ system: 'System prompt', content: 'User {{USER_ID}} in group {{TASKS_GROUP_ID}}' }],
  response_format: { type: 'text' },
};
writeFileSync(PROMPT_TEST_FILE, JSON.stringify(JSON.stringify(PROMPT_TEST_PAYLOAD)), 'utf8');
process.env.TASKGEN_PROMPTS_PATH = PROMPT_TEST_DIR;

vi.mock('openai', () => {
  class OpenAI {
    responses = { create: mockResponsesCreate };
    constructor() {
      // no-op
    }
  }
  return { default: OpenAI };
});

const loadRunnerModule = () => import('./runner.js');

const TEST_USER_ID = '11111111-2222-4333-8444-555555555555';

describe('getSnapshotOrMock', () => {
  let getSnapshotOrMock: typeof import('./runner.js')['getSnapshotOrMock'];

  beforeEach(async () => {
    delete process.env.DB_SNAPSHOT_PATH;
    mockResponsesCreate.mockReset();
    ({ getSnapshotOrMock } = await loadRunnerModule());
  });

  afterEach(() => {
    delete process.env.DB_SNAPSHOT_PATH;
    vi.restoreAllMocks();
    mockResponsesCreate.mockReset();
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

describe('sanitizeReasoningParameters', () => {
  it('removes sampling parameters for reasoning models', () => {
    const baseRequest = {
      model: 'gpt-5.1-mini',
      input: [],
      temperature: 0.4,
      top_p: 0.8,
    } as ResponseCreateParamsNonStreaming & Record<string, unknown>;
    baseRequest.logprobs = 2;
    baseRequest.logit_bias = { one: 1 };

    const { body, removedKeys } = sanitizeReasoningParameters(baseRequest, baseRequest.model);

    expect(removedKeys).toEqual(
      expect.arrayContaining(['temperature', 'top_p', 'logprobs', 'logit_bias']),
    );
    expect('temperature' in body).toBe(false);
    expect('top_p' in body).toBe(false);
    expect('logprobs' in body).toBe(false);
    expect('logit_bias' in body).toBe(false);
  });

  it('keeps sampling parameters for non-reasoning models', () => {
    const baseRequest = {
      model: 'gpt-4.1-mini',
      input: [],
      temperature: 0.7,
      top_p: 0.8,
    } as ResponseCreateParamsNonStreaming & Record<string, unknown>;

    const { body, removedKeys } = sanitizeReasoningParameters(baseRequest, baseRequest.model);

    expect(removedKeys).toEqual([]);
    expect(body.temperature).toBe(0.7);
    expect(body.top_p).toBe(0.8);
  });

  it('detects reasoning models by prefix and keyword', () => {
    expect(isReasoningModel('gpt-5.0')).toBe(true);
    expect(isReasoningModel('my-reasoning-model')).toBe(true);
    expect(isReasoningModel('gpt-4.1-mini')).toBe(false);
  });
});

describe('runTaskGeneration', () => {
  beforeEach(() => {
    process.env.TASKGEN_OPENAI_TIMEOUT = '1000';
    process.env.TASKGEN_OPENAI_MAX_ATTEMPTS = '3';
    process.env.TASKGEN_OPENAI_RETRY_BASE_DELAY = '0';
    process.env.TASKGEN_OPENAI_RETRY_JITTER = '0';
  });

  afterEach(async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.TASKGEN_OPENAI_TIMEOUT;
    delete process.env.TASKGEN_OPENAI_MAX_ATTEMPTS;
    delete process.env.TASKGEN_OPENAI_RETRY_BASE_DELAY;
    delete process.env.TASKGEN_OPENAI_RETRY_JITTER;
    mockResponsesCreate.mockReset();
  });

  it('uses OPENAI_MODEL when invoking OpenAI', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-vitest';

    mockResponsesCreate.mockReset();

    const mockPayload = {
      user_id: TEST_USER_ID,
      tasks_group_id: 'debug-group',
      tasks: [
        {
          task: 'Mocked task',
          pillar_code: 'BODY',
          trait_code: 'BODY_MOBILITY',
          stat_code: 'BODY_MOBILITY',
          difficulty_code: 'Easy',
          friction_score: 1,
          friction_tier: 'LOW',
        },
      ],
    };

    mockResponsesCreate.mockResolvedValue({ output_text: JSON.stringify(mockPayload) });

    const { runTaskGeneration } = await loadRunnerModule();

    const result = await runTaskGeneration({
      userId: TEST_USER_ID,
      mode: 'flow',
      source: 'mock',
      dryRun: false,
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    const [requestBody] = mockResponsesCreate.mock.calls[0];
    expect(requestBody.model).toBe('gpt-vitest');
    expect(result.status).toBe('ok');
  });

  it('filters sampling parameters for reasoning models', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-5.1-mini';

    mockResponsesCreate.mockReset();

    const mockPayload = {
      user_id: TEST_USER_ID,
      tasks_group_id: 'debug-group',
      tasks: [
        {
          task: 'Reasoning safe task',
          pillar_code: 'BODY',
          trait_code: 'BODY_MOBILITY',
          stat_code: 'BODY_MOBILITY',
          difficulty_code: 'Easy',
          friction_score: 1,
          friction_tier: 'LOW',
        },
      ],
    };

    mockResponsesCreate.mockResolvedValue({ output_text: JSON.stringify(mockPayload) });

    const { runTaskGeneration } = await loadRunnerModule();

    const result = await runTaskGeneration({
      userId: TEST_USER_ID,
      mode: 'flow',
      source: 'mock',
      dryRun: false,
    });

    expect(result.status).toBe('ok');
    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    const [requestBody] = mockResponsesCreate.mock.calls[0];
    expect('temperature' in requestBody).toBe(false);
  });

  it('retries aborted OpenAI attempts before succeeding', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-vitest';

    mockResponsesCreate.mockReset();
    const abortError = Object.assign(new Error('Request was aborted.'), { name: 'AbortError' });
    mockResponsesCreate.mockRejectedValueOnce(abortError);
    mockResponsesCreate.mockRejectedValueOnce(abortError);

    const mockPayload = {
      user_id: TEST_USER_ID,
      tasks_group_id: 'debug-group',
      tasks: [
        {
          task: 'Recovered task',
          pillar_code: 'BODY',
          trait_code: 'BODY_MOBILITY',
          stat_code: 'BODY_MOBILITY',
          difficulty_code: 'Easy',
          friction_score: 1,
          friction_tier: 'LOW',
        },
      ],
    };

    mockResponsesCreate.mockResolvedValueOnce({ output_text: JSON.stringify(mockPayload) });

    const { runTaskGeneration } = await loadRunnerModule();

    const result = await runTaskGeneration({
      userId: TEST_USER_ID,
      mode: 'flow',
      source: 'mock',
      dryRun: false,
    });

    expect(result.status).toBe('ok');
    expect(result.meta.timings_ms.openai).toBeGreaterThanOrEqual(0);
    expect(mockResponsesCreate).toHaveBeenCalledTimes(3);
  });

  it('marks timeout failures with ABORTED_BY_TIMEOUT', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-vitest';

    mockResponsesCreate.mockReset();
    const abortError = Object.assign(new Error('Request was aborted.'), { name: 'AbortError' });
    mockResponsesCreate.mockRejectedValue(abortError);

    const { runTaskGeneration } = await loadRunnerModule();

    const result = await runTaskGeneration({
      userId: TEST_USER_ID,
      mode: 'flow',
      source: 'mock',
      dryRun: false,
    });

    expect(result.status).toBe('error');
    expect(result.error_code).toBe('ABORTED_BY_TIMEOUT');
    expect(result.meta.validation.valid).toBe(false);
    expect(result.errors?.[0]).toContain('OpenAI request timed out or was aborted');
    expect(mockResponsesCreate).toHaveBeenCalledTimes(3);
  });
});

afterAll(() => {
  rmSync(PROMPT_TEST_DIR, { recursive: true, force: true });
  delete process.env.TASKGEN_PROMPTS_PATH;
});
