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

const LEGACY_USER_LOOKUP_SQL =
  'SELECT user_id, clerk_user_id, email_primary FROM users WHERE user_id = $1 LIMIT 1';

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

const originalDevFlag = process.env.ALLOW_X_USER_ID_DEV;
const originalNodeEnv = process.env.NODE_ENV;

describe('GET /api/users/me', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    delete process.env.ALLOW_X_USER_ID_DEV;
    process.env.NODE_ENV = 'test';
    mockGetAuthService.mockClear();
    delete process.env.DEV_ALLOW_X_USER_ID;
  });

  afterEach(() => {
    if (originalDevFlag === undefined) {
      delete process.env.ALLOW_X_USER_ID_DEV;
    } else {
      process.env.ALLOW_X_USER_ID_DEV = originalDevFlag;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
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

  it('allows the legacy X-User-Id header only when the development flag is enabled locally', async () => {
    process.env.ALLOW_X_USER_ID_DEV = 'true';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: baseUser.user_id,
            clerk_user_id: baseUser.clerk_user_id,
            email_primary: baseUser.email_primary,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [baseUser] });

    const response = await request(app)
      .get('/api/users/me')
      .set('X-User-Id', baseUser.user_id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: baseUser });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenNthCalledWith(1, LEGACY_USER_LOOKUP_SQL, [baseUser.user_id]);
    expect(mockQuery).toHaveBeenNthCalledWith(2, 'SELECT * FROM users WHERE user_id = $1 LIMIT 1', [baseUser.user_id]);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();

    delete process.env.ALLOW_X_USER_ID_DEV;
    mockVerifyToken.mockImplementation(async () => {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    });

    mockQuery.mockReset();

    const rejection = await request(app)
      .get('/api/users/me')
      .set('X-User-Id', baseUser.user_id);

    expect(rejection.status).toBe(401);
    expect(rejection.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('rejects the legacy header in production even when the flag is enabled', async () => {
    process.env.ALLOW_X_USER_ID_DEV = 'true';
    process.env.NODE_ENV = 'production';

    mockVerifyToken.mockRejectedValueOnce(
      new HttpError(401, 'unauthorized', 'Authentication required'),
    );

    const response = await request(app)
      .get('/api/users/me')
      .set('X-User-Id', baseUser.user_id);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).toHaveBeenCalledWith(undefined);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
