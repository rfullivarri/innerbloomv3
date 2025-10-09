import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUserRow } from '../controllers/users/get-user-me.js';
import { HttpError } from '../lib/http-error.js';

const { mockQuery, mockVerifyToken, mockGetAuthService } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockGetAuthService: vi.fn(() => ({
    verifyToken: mockVerifyToken,
  })),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: mockGetAuthService,
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

import app from '../app.js';

const baseUser: CurrentUserRow = {
  user_id: '11111111-2222-3333-4444-555555555555',
  clerk_user_id: 'user_123',
  email_primary: 'user@example.com',
  full_name: 'User Example',
  image_url: 'https://example.com/avatar.png',
  game_mode: 'standard',
  weekly_target: 1000,
  timezone: 'UTC',
  locale: 'en',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
  deleted_at: null,
};

const originalDevFlag = process.env.DEV_ALLOW_X_USER_ID;

describe('GET /api/users/me', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetAuthService.mockClear();
    delete process.env.DEV_ALLOW_X_USER_ID;
  });

  afterEach(() => {
    if (originalDevFlag === undefined) {
      delete process.env.DEV_ALLOW_X_USER_ID;
    } else {
      process.env.DEV_ALLOW_X_USER_ID = originalDevFlag;
    }
  });

  it('responds with the current user when a valid bearer token is provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [baseUser] });
    mockVerifyToken.mockResolvedValue({
      id: baseUser.user_id,
      clerkId: baseUser.clerk_user_id,
      email: baseUser.email_primary,
      isNew: false,
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: baseUser });
    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer token');
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [baseUser.user_id]);
  });

  it('returns 401 when the authorization header is missing', async () => {
    mockVerifyToken.mockRejectedValueOnce(new HttpError(401, 'unauthorized', 'Authentication required'));

    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('allows the legacy X-User-Id header only when the development flag is enabled', async () => {
    process.env.DEV_ALLOW_X_USER_ID = 'true';

    mockQuery.mockResolvedValueOnce({ rows: [baseUser] });
    mockVerifyToken.mockImplementation(async (header?: string | null) => {
      if (!header && process.env.DEV_ALLOW_X_USER_ID === 'true') {
        return {
          id: baseUser.user_id,
          clerkId: baseUser.clerk_user_id,
          email: baseUser.email_primary,
          isNew: false,
        };
      }

      throw new HttpError(401, 'unauthorized', 'Authentication required');
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('X-User-Id', baseUser.user_id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: baseUser });
    expect(mockVerifyToken).toHaveBeenCalledWith(undefined);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [baseUser.user_id]);

    mockVerifyToken.mockReset();
    mockQuery.mockReset();

    process.env.DEV_ALLOW_X_USER_ID = 'false';
    mockVerifyToken.mockRejectedValueOnce(new HttpError(401, 'unauthorized', 'Authentication required'));

    const rejection = await request(app)
      .get('/api/users/me')
      .set('X-User-Id', baseUser.user_id);

    expect(rejection.status).toBe(401);
    expect(rejection.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
  });
});
