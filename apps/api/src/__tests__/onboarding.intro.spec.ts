import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSubmitOnboardingIntro,
  mockGetLatestOnboardingSession,
  mockVerifyToken,
} = vi.hoisted(() => ({
  mockSubmitOnboardingIntro: vi.fn(),
  mockGetLatestOnboardingSession: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock('../services/onboardingIntroService.js', () => ({
  submitOnboardingIntro: mockSubmitOnboardingIntro,
  getLatestOnboardingSession: mockGetLatestOnboardingSession,
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({ verifyToken: mockVerifyToken }),
  createAuthRepository: vi.fn(() => undefined),
  createAuthService: vi.fn(() => undefined),
  resetAuthServiceCache: vi.fn(() => undefined),
}));

import app from '../app.js';

const basePayload = {
  ts: '2024-01-01T00:00:00.000Z',
  client_id: '11111111-1111-1111-1111-111111111111',
  email: 'user@example.com',
  mode: 'FLOW' as const,
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

function createPayload(overrides: Partial<typeof basePayload> = {}) {
  return {
    ...basePayload,
    ...overrides,
    data: {
      ...basePayload.data,
      ...(overrides.data ?? {}),
      foundations: {
        ...basePayload.data.foundations,
        ...(overrides.data?.foundations ?? {}),
      },
    },
    xp: {
      ...basePayload.xp,
      ...(overrides.xp ?? {}),
    },
    meta: {
      ...basePayload.meta,
      ...(overrides.meta ?? {}),
    },
  };
}

const originalNodeEnv = process.env.NODE_ENV;

describe('POST /api/onboarding/intro', () => {
  beforeEach(() => {
    mockSubmitOnboardingIntro.mockReset();
    mockGetLatestOnboardingSession.mockReset();
    mockVerifyToken.mockReset();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('returns 401 when the authorization header is missing', async () => {
    const response = await request(app).post('/api/onboarding/intro').send(createPayload());

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockSubmitOnboardingIntro).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload is invalid', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });

    const { client_id: _clientId, ...invalidPayload } = createPayload();
    void _clientId;

    const response = await request(app)
      .post('/api/onboarding/intro')
      .set('Authorization', 'Bearer token')
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
    expect(mockSubmitOnboardingIntro).not.toHaveBeenCalled();
  });

  it('returns 400 when the meta.user_id does not match the authenticated user', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });

    const payload = createPayload({
      meta: { ...basePayload.meta, user_id: 'different_user' },
    });

    const response = await request(app)
      .post('/api/onboarding/intro')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'user_mismatch',
      message: 'Payload user_id does not match authenticated user',
    });
    expect(mockSubmitOnboardingIntro).not.toHaveBeenCalled();
  });

  it('returns 200 and awarded=true for the first submission', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });
    mockSubmitOnboardingIntro.mockResolvedValue({ sessionId: 'session-1', awarded: true });

    const payload = createPayload();

    const response = await request(app)
      .post('/api/onboarding/intro')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, session_id: 'session-1', awarded: true });
    expect(mockSubmitOnboardingIntro).toHaveBeenCalledWith('user_123', payload);
  });

  it('returns 200 and awarded=false for subsequent submissions', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });
    mockSubmitOnboardingIntro.mockResolvedValue({ sessionId: 'session-1', awarded: false });

    const payload = createPayload();

    const response = await request(app)
      .post('/api/onboarding/intro')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, session_id: 'session-1', awarded: false });
    expect(mockSubmitOnboardingIntro).toHaveBeenCalledWith('user_123', payload);
  });
});

describe('GET /api/debug/onboarding/last', () => {
  beforeEach(() => {
    mockSubmitOnboardingIntro.mockReset();
    mockGetLatestOnboardingSession.mockReset();
    mockVerifyToken.mockReset();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('returns the latest sanitized onboarding session for the authenticated user', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });

    const debugResult = {
      session: {
        onboarding_session_id: 'session-1',
        client_id: basePayload.client_id,
        game_mode_id: 'mode-1',
        xp_total: 123,
        xp_body: 41,
        xp_mind: 41,
        xp_soul: 41,
        email: 'user@example.com',
        meta: basePayload.meta,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:05:00.000Z',
      },
      answers: {
        ts: basePayload.ts,
        client_id: basePayload.client_id,
        mode: basePayload.mode,
        data: basePayload.data,
        xp: basePayload.xp,
      },
      foundations: [
        {
          pillar_id: 'pillar-body',
          pillar_code: 'BODY',
          items: basePayload.data.foundations.body,
          open_text: basePayload.data.foundations.bodyOpen,
        },
      ],
    };

    mockGetLatestOnboardingSession.mockResolvedValue(debugResult);

    const response = await request(app)
      .get('/api/debug/onboarding/last')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      session: debugResult,
    });
  });

  it('returns 403 in production environments', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'uuid-user',
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .get('/api/debug/onboarding/last')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'forbidden',
      message: 'Debug endpoint is disabled in production',
    });
    expect(mockGetLatestOnboardingSession).not.toHaveBeenCalled();
  });
});
