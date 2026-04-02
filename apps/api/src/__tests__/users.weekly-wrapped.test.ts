import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockQuery,
  mockVerifyToken,
  mockGetRecentWrapped,
  mockMaybeGenerateWrapped,
  mockCountUnseenWeeklyWrapped,
  mockFindPendingWeeklyWrappedId,
  mockListSeenWeeklyWrappedIds,
  mockMarkWeeklyWrappedSeen,
} =
  vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockVerifyToken: vi.fn(),
    mockGetRecentWrapped: vi.fn(),
    mockMaybeGenerateWrapped: vi.fn(),
    mockCountUnseenWeeklyWrapped: vi.fn(),
    mockFindPendingWeeklyWrappedId: vi.fn(),
    mockListSeenWeeklyWrappedIds: vi.fn(),
    mockMarkWeeklyWrappedSeen: vi.fn(),
  }));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

vi.mock('../services/weeklyWrappedService.js', () => ({
  getRecentWeeklyWrapped: mockGetRecentWrapped,
  maybeGenerateWeeklyWrappedForDate: mockMaybeGenerateWrapped,
}));

vi.mock('../services/weeklyWrappedViewsService.js', () => ({
  countUnseenWeeklyWrapped: mockCountUnseenWeeklyWrapped,
  findPendingWeeklyWrappedId: mockFindPendingWeeklyWrappedId,
  listSeenWeeklyWrappedIds: mockListSeenWeeklyWrappedIds,
  markWeeklyWrappedSeen: mockMarkWeeklyWrappedSeen,
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('GET /api/users/:id/weekly-wrapped/latest', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetRecentWrapped.mockReset();
    mockMaybeGenerateWrapped.mockReset();
    mockCountUnseenWeeklyWrapped.mockReset();
    mockFindPendingWeeklyWrappedId.mockReset();
    mockListSeenWeeklyWrappedIds.mockReset();
    mockMarkWeeklyWrappedSeen.mockReset();
    mockCountUnseenWeeklyWrapped.mockResolvedValue(0);
    mockListSeenWeeklyWrappedIds.mockResolvedValue(new Set());
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(app).get(`/api/users/${userId}/weekly-wrapped/latest`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
  });

  it('returns the latest weekly wrapped entry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-10-13T12:00:00Z'));
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockGetRecentWrapped.mockResolvedValue([
      {
        id: 'wrap-1',
        userId,
        weekStart: '2024-10-07',
        weekEnd: '2024-10-13',
        createdAt: '2024-10-14T10:00:00.000Z',
        updatedAt: '2024-10-14T10:00:00.000Z',
        summary: { highlight: 'Hábito', pillarDominant: 'Body', completions: 5, xpTotal: 120 },
        payload: {
          mode: 'final',
          dataSource: 'real',
          variant: 'full',
          weekRange: { start: '2024-10-07T00:00:00.000Z', end: '2024-10-13T00:00:00.000Z' },
          summary: { pillarDominant: 'Body', highlight: 'Hábito', completions: 5, xpTotal: 120 },
          emotions: { weekly: null, biweekly: null },
          levelUp: { happened: false, currentLevel: 1, previousLevel: 1, xpGained: 120, forced: false },
          sections: [],
        },
      },
    ]);

    const response = await request(app)
      .get(`/api/users/${userId}/weekly-wrapped/latest`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      item: {
        id: 'wrap-1',
        userId,
        weekStart: '2024-10-07',
        weekEnd: '2024-10-13',
        createdAt: '2024-10-14T10:00:00.000Z',
        updatedAt: '2024-10-14T10:00:00.000Z',
        summary: { highlight: 'Hábito', pillarDominant: 'Body', completions: 5, xpTotal: 120 },
        payload: {
          mode: 'final',
          dataSource: 'real',
          variant: 'full',
          weekRange: { start: '2024-10-07T00:00:00.000Z', end: '2024-10-13T00:00:00.000Z' },
          summary: { pillarDominant: 'Body', highlight: 'Hábito', completions: 5, xpTotal: 120 },
          emotions: { weekly: null, biweekly: null },
          levelUp: { happened: false, currentLevel: 1, previousLevel: 1, xpGained: 120, forced: false },
          sections: [],
        },
        seen: false,
      },
      unseen_count: 0,
    });
    expect(mockGetRecentWrapped).toHaveBeenCalledWith(userId, 2);
    vi.useRealTimers();
  });

  it('returns the most recent entry when the current week is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-10-20T12:00:00Z'));
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockGetRecentWrapped.mockResolvedValue([
      {
        id: 'wrap-1',
        userId,
        weekStart: '2024-10-07',
        weekEnd: '2024-10-13',
        createdAt: '2024-10-14T10:00:00.000Z',
        updatedAt: '2024-10-14T10:00:00.000Z',
        summary: null,
        payload: { mode: 'final' },
      },
    ]);

    const response = await request(app)
      .get(`/api/users/${userId}/weekly-wrapped/latest`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.item?.id).toBe('wrap-1');
    expect(mockGetRecentWrapped).toHaveBeenCalledWith(userId, 2);
    vi.useRealTimers();
  });
});

describe('GET /api/users/:id/weekly-wrapped/previous', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetRecentWrapped.mockReset();
    mockMaybeGenerateWrapped.mockReset();
    mockCountUnseenWeeklyWrapped.mockReset();
    mockListSeenWeeklyWrappedIds.mockReset();
    mockCountUnseenWeeklyWrapped.mockResolvedValue(0);
    mockListSeenWeeklyWrappedIds.mockResolvedValue(new Set());
  });

  it('returns the previous weekly wrapped entry when available', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-10-20T12:00:00Z'));
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockGetRecentWrapped.mockResolvedValue([
      {
        id: 'wrap-latest',
        userId,
        weekStart: '2024-10-14',
        weekEnd: '2024-10-20',
        createdAt: '2024-10-21T10:00:00.000Z',
        updatedAt: '2024-10-21T10:00:00.000Z',
        summary: null,
        payload: {
          mode: 'final',
          dataSource: 'real',
          variant: 'full',
          weekRange: { start: '2024-10-14T00:00:00.000Z', end: '2024-10-20T00:00:00.000Z' },
          summary: { pillarDominant: null, highlight: null, completions: 0, xpTotal: 0 },
          emotions: { weekly: null, biweekly: null },
          levelUp: { happened: false, currentLevel: 1, previousLevel: 1, xpGained: 0, forced: false },
          sections: [],
        },
      },
      {
        id: 'wrap-previous',
        userId,
        weekStart: '2024-10-07',
        weekEnd: '2024-10-13',
        createdAt: '2024-10-14T10:00:00.000Z',
        updatedAt: '2024-10-14T10:00:00.000Z',
        summary: { highlight: 'Body', pillarDominant: 'Body', completions: 2, xpTotal: 80 },
        payload: {
          mode: 'final',
          dataSource: 'real',
          variant: 'light',
          weekRange: { start: '2024-10-07T00:00:00.000Z', end: '2024-10-13T00:00:00.000Z' },
          summary: { pillarDominant: 'Body', highlight: 'Body', completions: 2, xpTotal: 80 },
          emotions: { weekly: null, biweekly: null },
          levelUp: { happened: false, currentLevel: 1, previousLevel: 1, xpGained: 0, forced: false },
          sections: [],
        },
      },
    ]);

    const response = await request(app)
      .get(`/api/users/${userId}/weekly-wrapped/previous`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.item?.id).toBe('wrap-previous');
    expect(mockGetRecentWrapped).toHaveBeenCalledWith(userId, 2);
    vi.useRealTimers();
  });

  it('returns the most recent entry when the current week is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-10-20T12:00:00Z'));
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockGetRecentWrapped.mockResolvedValue([
      {
        id: 'wrap-previous',
        userId,
        weekStart: '2024-10-07',
        weekEnd: '2024-10-13',
        createdAt: '2024-10-14T10:00:00.000Z',
        updatedAt: '2024-10-14T10:00:00.000Z',
        summary: null,
        payload: { mode: 'final' },
      },
    ]);

    const response = await request(app)
      .get(`/api/users/${userId}/weekly-wrapped/previous`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.item?.id).toBe('wrap-previous');
    expect(mockGetRecentWrapped).toHaveBeenCalledWith(userId, 2);
    vi.useRealTimers();
  });
});

describe('GET /api/users/:id/weekly-wrapped/pending and POST /seen', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetRecentWrapped.mockReset();
    mockFindPendingWeeklyWrappedId.mockReset();
    mockCountUnseenWeeklyWrapped.mockReset();
    mockMarkWeeklyWrappedSeen.mockReset();
  });

  it('returns unseen weekly wrapup as pending with unseen count', async () => {
    mockVerifyToken.mockResolvedValue({ id: userId, clerkId: 'user_123', email: 'test@example.com', isNew: false });
    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockGetRecentWrapped.mockResolvedValue([{ id: 'wrap-pending', userId, weekStart: '2024-10-07', weekEnd: '2024-10-13', payload: { mode: 'final' } }]);
    mockFindPendingWeeklyWrappedId.mockResolvedValue('wrap-pending');
    mockCountUnseenWeeklyWrapped.mockResolvedValue(2);

    const response = await request(app)
      .get(`/api/users/${userId}/weekly-wrapped/pending`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.item?.id).toBe('wrap-pending');
    expect(response.body.item?.seen).toBe(false);
    expect(response.body.unseen_count).toBe(2);
  });

  it('marking seen is idempotent and updates unseen count', async () => {
    mockVerifyToken.mockResolvedValue({ id: userId, clerkId: 'user_123', email: 'test@example.com', isNew: false });
    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }] });
    mockMarkWeeklyWrappedSeen.mockResolvedValue('2024-10-14T10:00:00.000Z');
    mockCountUnseenWeeklyWrapped.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const first = await request(app)
      .post(`/api/users/${userId}/weekly-wrapped/123e4567-e89b-12d3-a456-426614174000/seen`)
      .set('Authorization', 'Bearer token');
    const second = await request(app)
      .post(`/api/users/${userId}/weekly-wrapped/123e4567-e89b-12d3-a456-426614174000/seen`)
      .set('Authorization', 'Bearer token');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mockMarkWeeklyWrappedSeen).toHaveBeenCalledTimes(2);
    expect(first.body.unseen_count).toBe(1);
    expect(second.body.unseen_count).toBe(0);
  });
});
