import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUserRow } from '../controllers/users/get-user-me.js';
import { HttpError } from '../lib/http-error.js';

const { mockQuery, mockVerifyToken } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

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

// The Express app is created after the database module is mocked to avoid
// requiring a real DATABASE_URL during tests.
import app from '../app.js';

describe('GET /api/_health', () => {
  it('returns a healthy response', async () => {
    const response = await request(app).get('/api/_health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe('GET /api/users/me', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
  });

  it('returns 401 when the authentication header is missing', async () => {
    mockVerifyToken.mockImplementation(async (header?: string | null) => {
      if (!header) {
        throw new HttpError(401, 'unauthorized', 'Authentication required');
      }

      throw new Error('unexpected call');
    });

    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('returns the user when found', async () => {
    const user: CurrentUserRow = {
      user_id: 'user-row-id',
      clerk_user_id: 'user_456',
      email_primary: 'test@example.com',
      full_name: 'Test User',
      image_url: 'https://example.com/avatar.png',
      game_mode: 'standard',
      weekly_target: 1000,
      timezone: 'UTC',
      locale: 'en',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
      deleted_at: null,
    };

    mockQuery.mockResolvedValueOnce({ rows: [user] });
    mockVerifyToken.mockResolvedValue({
      id: 'user-row-id',
      clerkId: 'user_456',
      email: 'test@example.com',
      isNew: false,
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE clerk_user_id = $1 LIMIT 1',
      ['user_456'],
    );
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer token');
  });

  it('creates and returns the user when missing', async () => {
    const created: CurrentUserRow = {
      user_id: 'new-id',
      clerk_user_id: 'user_123',
      email_primary: null,
      full_name: null,
      image_url: null,
      game_mode: null,
      weekly_target: null,
      timezone: null,
      locale: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      deleted_at: null,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [created] });
    mockVerifyToken.mockResolvedValue({
      id: 'new-id',
      clerkId: 'user_123',
      email: null,
      isNew: true,
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ user: created });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM users WHERE clerk_user_id = $1 LIMIT 1',
      ['user_123'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO users (clerk_user_id, email_primary) VALUES ($1, $2) ON CONFLICT (clerk_user_id) DO NOTHING RETURNING *',
      ['user_123', null],
    );
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('falls back to selecting the user when the insert returns no rows', async () => {
    const fetched: CurrentUserRow = {
      user_id: 'existing-id',
      clerk_user_id: 'user_789',
      email_primary: 'test@example.com',
      full_name: 'Test User',
      image_url: null,
      game_mode: null,
      weekly_target: null,
      timezone: null,
      locale: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      deleted_at: null,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [fetched] });
    mockVerifyToken.mockResolvedValue({
      id: 'existing-id',
      clerkId: 'user_789',
      email: 'fallback@example.com',
      isNew: true,
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: fetched });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM users WHERE clerk_user_id = $1 LIMIT 1',
      ['user_789'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO users (clerk_user_id, email_primary) VALUES ($1, $2) ON CONFLICT (clerk_user_id) DO NOTHING RETURNING *',
      ['user_789', 'fallback@example.com'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      'SELECT * FROM users WHERE clerk_user_id = $1 LIMIT 1',
      ['user_789'],
    );
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });
});
