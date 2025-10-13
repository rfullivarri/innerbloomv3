import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OnboardingIntroPayload } from '../../schemas/onboarding.js';
import { getLatestOnboardingSession, submitOnboardingIntro } from '../onboardingIntroService.js';

const { mockClient, withClientSpy } = vi.hoisted(() => {
  const client = {
    query: vi.fn<Promise<unknown>, [string, unknown[]?]>(),
  };

  return {
    mockClient: client,
    withClientSpy: vi.fn(
      async (callback: (client: typeof client) => Promise<unknown>) =>
        callback(client),
    ),
  };
});

vi.mock('../../db.js', () => ({
  withClient: (callback: (client: typeof mockClient) => Promise<unknown>) =>
    withClientSpy(callback),
}));

type Expectation = {
  match: (sql: string) => boolean;
  handle: (sql: string, params: unknown[] | undefined) => unknown;
};

const basePayload: OnboardingIntroPayload = {
  ts: '2024-01-01T00:00:00.000Z',
  client_id: '11111111-1111-1111-1111-111111111111',
  email: 'user@example.com',
  mode: 'FLOW',
  data: {
    low: {
      body: ['stretch'],
      soul: ['meditate'],
      mind: ['read'],
      note: 'note',
    },
    chill: {
      oneThing: 'rest',
      motiv: ['music'],
    },
    flow: {
      goal: 'goal',
      imped: ['time'],
    },
    evolve: {
      goal: 'grow',
      trade: ['sleep'],
      att: 'attitude',
    },
    foundations: {
      body: ['hydrate'],
      soul: ['gratitude'],
      mind: ['journal'],
      bodyOpen: 'body open',
      soulOpen: 'soul open',
      mindOpen: 'mind open',
    },
  },
  xp: {
    total: 123,
    Body: 41,
    Mind: 41,
    Soul: 41,
  },
  meta: {
    tz: 'UTC',
    lang: 'es',
    device: 'ios',
    version: 'forms-intro-react',
    user_id: 'user_123',
  },
};

beforeEach(() => {
  mockClient.query.mockReset();
  withClientSpy.mockReset();
  withClientSpy.mockImplementation(async (callback) => callback(mockClient));
});

type ExpectedXp = { total: number; body: number; mind: number; soul: number };

function createSubmitExpectations(options: {
  xpBonusRowCounts: [number, number, number];
  payload?: OnboardingIntroPayload;
  expectedXp?: ExpectedXp;
}) {
  const userId = 'user-1';
  const gameModeId = 'mode-1';
  const sessionId = 'session-1';
  const pillars = {
    BODY: 'pillar-body',
    MIND: 'pillar-mind',
    SOUL: 'pillar-soul',
  } as const;

  const payload = options.payload ?? basePayload;
  const expectedXp =
    options.expectedXp ?? ({
      total: payload.xp.total,
      body: payload.xp.Body,
      mind: payload.xp.Mind,
      soul: payload.xp.Soul,
    } satisfies ExpectedXp);

  const metaJson = JSON.stringify(payload.meta);
  const serializedPayload = JSON.stringify(payload);

  const foundationPayloads = [
    {
      pillarId: pillars.BODY,
      items: payload.data.foundations.body,
      openText: payload.data.foundations.bodyOpen,
    },
    {
      pillarId: pillars.MIND,
      items: payload.data.foundations.mind,
      openText: payload.data.foundations.mindOpen,
    },
    {
      pillarId: pillars.SOUL,
      items: payload.data.foundations.soul,
      openText: payload.data.foundations.soulOpen,
    },
  ] as const;

  const foundationExpectations: Expectation[] = foundationPayloads.map((foundation) => ({
    match: (sql) => sql.includes('INSERT INTO onboarding_foundations'),
    handle: (_sql, params) => {
      expect(params).toEqual([
        sessionId,
        foundation.pillarId,
        foundation.items,
        foundation.openText,
      ]);
      return { rowCount: 1 };
    },
  }));

  const xpBonusPayloads = [
    { pillarId: pillars.BODY, amount: expectedXp.body },
    { pillarId: pillars.MIND, amount: expectedXp.mind },
    { pillarId: pillars.SOUL, amount: expectedXp.soul },
  ] as const;

  const xpBonusExpectations: Expectation[] = xpBonusPayloads.map((bonus, index) => ({
    match: (sql) => sql.includes('INSERT INTO xp_bonus'),
    handle: (_sql, params) => {
      expect(params).toEqual([
        userId,
        bonus.pillarId,
        bonus.amount,
        expect.any(String),
      ]);

      const meta = JSON.parse(params?.[3] as string);
      expect(meta).toMatchObject({
        onboarding_session_id: sessionId,
        ts: payload.ts,
        client_id: payload.client_id,
      });

      return { rowCount: options.xpBonusRowCounts[index] };
    },
  }));

  return [
    {
      match: (sql) => sql === 'BEGIN',
      handle: () => ({}),
    },
    {
      match: (sql) => sql.includes('SELECT user_id FROM users'),
      handle: (_sql, params) => {
        expect(params).toEqual(['user_123']);
        return { rows: [{ user_id: userId }] };
      },
    },
    {
      match: (sql) => sql.includes('SELECT game_mode_id, code FROM cat_game_mode'),
      handle: (_sql, params) => {
        expect(params).toEqual([payload.mode]);
        return { rows: [{ game_mode_id: gameModeId, code: payload.mode.toLowerCase() }] };
      },
    },
    {
      match: (sql) => sql.includes('SELECT pillar_id, code FROM cat_pillar'),
      handle: (_sql, params) => {
        expect(params).toEqual([['BODY', 'MIND', 'SOUL']]);
        return {
          rows: [
            { pillar_id: pillars.BODY, code: 'BODY' },
            { pillar_id: pillars.MIND, code: 'MIND' },
            { pillar_id: pillars.SOUL, code: 'SOUL' },
          ],
        };
      },
    },
    {
      match: (sql) => sql.includes('INSERT INTO onboarding_session'),
      handle: (_sql, params) => {
        expect(params).toEqual([
          userId,
          payload.client_id,
          gameModeId,
          expectedXp.total,
          expectedXp.body,
          expectedXp.mind,
          expectedXp.soul,
          payload.email,
          metaJson,
        ]);
        return { rows: [{ onboarding_session_id: sessionId }] };
      },
    },
    {
      match: (sql) => sql.includes('INSERT INTO onboarding_answers'),
      handle: (_sql, params) => {
        expect(params).toEqual([sessionId, serializedPayload]);
        return { rowCount: 1 };
      },
    },
    ...foundationExpectations,
    {
      match: (sql) => sql === 'UPDATE users SET game_mode_id = $2 WHERE user_id = $1',
      handle: (_sql, params) => {
        expect(params).toEqual([userId, gameModeId]);
        return { rowCount: 1 };
      },
    },
    ...xpBonusExpectations,
    {
      match: (sql) => sql === 'COMMIT',
      handle: () => ({}),
    },
  ];
}

describe('submitOnboardingIntro', () => {
  it('persists onboarding data and awards XP when inserts succeed', async () => {
    const expectations = createSubmitExpectations({ xpBonusRowCounts: [1, 1, 1] });

    mockClient.query.mockImplementation(async (sql, params) => {
      const expectation = expectations.shift();
      expect(expectation, `Unexpected query: ${sql}`).toBeDefined();
      expect(expectation?.match(sql)).toBe(true);
      return expectation!.handle(sql, params);
    });

    const result = await submitOnboardingIntro('user_123', basePayload);

    expect(result).toEqual({ sessionId: 'session-1', awarded: true });
    expect(expectations).toHaveLength(0);
    expect(withClientSpy).toHaveBeenCalledTimes(1);
  });

  it('returns awarded=false when XP bonus rows already exist', async () => {
    const expectations = createSubmitExpectations({ xpBonusRowCounts: [0, 0, 0] });

    mockClient.query.mockImplementation(async (sql, params) => {
      const expectation = expectations.shift();
      expect(expectation, `Unexpected query: ${sql}`).toBeDefined();
      expect(expectation?.match(sql)).toBe(true);
      return expectation!.handle(sql, params);
    });

    const result = await submitOnboardingIntro('user_123', basePayload);

    expect(result).toEqual({ sessionId: 'session-1', awarded: false });
    expect(expectations).toHaveLength(0);
    expect(withClientSpy).toHaveBeenCalledTimes(1);
  });

  it('rounds XP values and enforces consistency before persisting', async () => {
    const payload: OnboardingIntroPayload = {
      ...basePayload,
      xp: {
        total: 109.98,
        Body: 36.66,
        Mind: 36.66,
        Soul: 36.66,
      },
    };

    const expectations = createSubmitExpectations({
      xpBonusRowCounts: [1, 1, 1],
      payload,
      expectedXp: { total: 111, body: 37, mind: 37, soul: 37 },
    });

    mockClient.query.mockImplementation(async (sql, params) => {
      const expectation = expectations.shift();
      expect(expectation, `Unexpected query: ${sql}`).toBeDefined();
      expect(expectation?.match(sql)).toBe(true);
      return expectation!.handle(sql, params);
    });

    const result = await submitOnboardingIntro('user_123', payload);

    expect(result).toEqual({ sessionId: 'session-1', awarded: true });
    expect(expectations).toHaveLength(0);
    expect(withClientSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getLatestOnboardingSession', () => {
  it('returns the latest session with sanitized answers', async () => {
    const sessionRow = {
      onboarding_session_id: 'session-1',
      client_id: basePayload.client_id,
      game_mode_id: 'mode-1',
      xp_total: basePayload.xp.total,
      xp_body: basePayload.xp.Body,
      xp_mind: basePayload.xp.Mind,
      xp_soul: basePayload.xp.Soul,
      email: basePayload.email,
      meta: basePayload.meta,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:05:00.000Z',
    };

    const answersPayload = {
      ts: basePayload.ts,
      client_id: basePayload.client_id,
      email: basePayload.email,
      mode: basePayload.mode,
      data: basePayload.data,
      xp: basePayload.xp,
      meta: basePayload.meta,
    };

    const foundationsRows = [
      { pillar_id: 'pillar-body', code: 'BODY', items: ['hydrate'], open_text: 'body open' },
      { pillar_id: 'pillar-mind', code: 'MIND', items: ['journal'], open_text: 'mind open' },
    ];

    const responses = [
      { rows: [{ user_id: 'user-1' }] },
      { rows: [sessionRow] },
      { rows: [{ payload: answersPayload }] },
      { rows: foundationsRows },
    ];

    mockClient.query.mockImplementation(async () => {
      const response = responses.shift();
      expect(response).toBeDefined();
      return response!;
    });

    const result = await getLatestOnboardingSession('user_123');

    expect(result).toEqual({
      session: sessionRow,
      answers: {
        ts: basePayload.ts,
        client_id: basePayload.client_id,
        mode: basePayload.mode,
        data: basePayload.data,
        xp: basePayload.xp,
      },
      foundations: foundationsRows.map((row) => ({
        pillar_id: row.pillar_id,
        pillar_code: row.code,
        items: row.items,
        open_text: row.open_text,
      })),
    });
    expect(responses).toHaveLength(0);
  });
});
