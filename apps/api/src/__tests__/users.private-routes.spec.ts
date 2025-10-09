import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';

type RouteKey =
  | 'tasks'
  | 'xp/daily'
  | 'xp/total'
  | 'xp/by-trait'
  | 'pillars'
  | 'streaks/panel'
  | 'level'
  | 'achievements'
  | 'daily-energy'
  | 'journey'
  | 'emotions'
  | 'state'
  | 'state/timeseries'
  | 'summary/today';

const { mockQuery, mockVerifyToken, handlerSpies, createStubHandler } = vi.hoisted(() => {
  const handlerSpies = new Map<RouteKey, ReturnType<typeof vi.fn>>();

  const createStubHandler = (route: RouteKey) => {
    const handler = vi.fn(async (req, res) => {
      const { z } = await import('zod');
      z.string().uuid().parse(req.params.id);
      res.json({ route, userId: req.params.id });
    });

    handlerSpies.set(route, handler);
    return handler;
  };

  return {
    mockQuery: vi.fn(),
    mockVerifyToken: vi.fn(),
    handlerSpies,
    createStubHandler,
  };
});

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

vi.mock('../controllers/tasks/get-user-tasks.js', () => ({
  getUserTasks: createStubHandler('tasks'),
}));

vi.mock('../controllers/logs/get-user-daily-xp.js', () => ({
  getUserDailyXp: createStubHandler('xp/daily'),
}));

vi.mock('../controllers/users/get-user-total-xp.js', () => ({
  getUserTotalXp: createStubHandler('xp/total'),
}));

vi.mock('../routes/users/xp-by-trait.js', () => ({
  getUserXpByTrait: createStubHandler('xp/by-trait'),
}));

vi.mock('../routes/users/pillars.js', () => ({
  getUserPillars: createStubHandler('pillars'),
}));

vi.mock('../routes/users/streak-panel.js', () => ({
  getUserStreakPanel: createStubHandler('streaks/panel'),
}));

vi.mock('../routes/users/daily-energy.js', () => ({
  getUserDailyEnergy: createStubHandler('daily-energy'),
}));

vi.mock('../controllers/users/get-user-level.js', () => ({
  getUserLevel: createStubHandler('level'),
}));

vi.mock('../controllers/users/get-user-achievements.js', () => ({
  getUserAchievements: createStubHandler('achievements'),
}));

vi.mock('../controllers/logs/get-user-journey.js', () => ({
  getUserJourney: createStubHandler('journey'),
}));

vi.mock('../controllers/emotions/get-user-emotions.js', () => ({
  getUserEmotions: createStubHandler('emotions'),
}));

vi.mock('../controllers/users/get-user-state.js', () => ({
  getUserState: createStubHandler('state'),
}));

vi.mock('../controllers/users/get-user-state-timeseries.js', () => ({
  getUserStateTimeseries: createStubHandler('state/timeseries'),
}));

vi.mock('../routes/users/summary-today.js', () => ({
  getUserSummaryToday: createStubHandler('summary/today'),
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';
const otherUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const invalidUserId = 'not-a-valid-uuid';

type UserRoute = { path: string; key: RouteKey };

const privateRoutes: UserRoute[] = [
  { path: '/tasks', key: 'tasks' },
  { path: '/xp/daily', key: 'xp/daily' },
  { path: '/xp/total', key: 'xp/total' },
  { path: '/xp/by-trait', key: 'xp/by-trait' },
  { path: '/pillars', key: 'pillars' },
  { path: '/streaks/panel', key: 'streaks/panel' },
  { path: '/level', key: 'level' },
  { path: '/achievements', key: 'achievements' },
  { path: '/daily-energy', key: 'daily-energy' },
  { path: '/journey', key: 'journey' },
  { path: '/emotions', key: 'emotions' },
  { path: '/state', key: 'state' },
  { path: '/state/timeseries', key: 'state/timeseries' },
  { path: '/summary/today', key: 'summary/today' },
];

describe.each(privateRoutes)('GET /api/users/:id%s', ({ path, key }) => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();

    for (const handler of handlerSpies.values()) {
      handler.mockClear();
    }
  });

  it('returns 200 when the token belongs to the requested user', async () => {
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });

    const response = await request(app)
      .get(`/api/users/${userId}${path}`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: key, userId });

    const handler = handlerSpies.get(key);
    expect(handler).toBeDefined();
    expect(handler!).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the token belongs to a different user', async () => {
    mockVerifyToken.mockResolvedValue({
      id: otherUserId,
      clerkId: 'user_999',
      email: 'hacker@example.com',
      isNew: false,
    });

    const response = await request(app)
      .get(`/api/users/${userId}${path}`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'forbidden',
      message: 'You do not have access to this resource',
    });

    const handler = handlerSpies.get(key);
    expect(handler).toBeDefined();
    expect(handler!).not.toHaveBeenCalled();
  });

  it('returns 401 when the authorization header is missing', async () => {
    mockVerifyToken.mockRejectedValueOnce(new HttpError(401, 'unauthorized', 'Authentication required'));

    const response = await request(app).get(`/api/users/${userId}${path}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });

    const handler = handlerSpies.get(key);
    expect(handler).toBeDefined();
    expect(handler!).not.toHaveBeenCalled();
  });

  it('returns 400 when the route id is not a valid UUID', async () => {
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'user@example.com',
      isNew: false,
    });

    const response = await request(app)
      .get(`/api/users/${invalidUserId}${path}`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'invalid_request',
      message: expect.any(String),
      details: expect.any(Object),
    });
  });
});
