import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __TESTING__ as controllerTesting } from '../controllers/users/update-user-timezone.js';

const { mockQuery, mockVerifyToken, mockGetAuthService } = vi.hoisted(() => ({
  mockQuery: vi.fn(() => undefined),
  mockVerifyToken: vi.fn(() => undefined),
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
  createAuthRepository: vi.fn(() => undefined),
  createAuthService: vi.fn(() => undefined),
  resetAuthServiceCache: vi.fn(() => undefined),
}));

import app from '../app.js';

const verifiedUser = {
  id: 'user-id',
  clerkId: 'clerk_user_123',
  email: 'user@example.com',
  isNew: false,
};

describe('PUT /api/me/timezone', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetAuthService.mockClear();
    mockVerifyToken.mockResolvedValue(verifiedUser);
  });

  it('returns 400 when the timezone is missing or invalid', async () => {
    const response = await request(app)
      .put('/api/me/timezone')
      .set('Authorization', 'Bearer token')
      .send({ timezone: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_timezone' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when the timezone is not recognized', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .put('/api/me/timezone')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Invalid/Timezone' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'unknown_timezone' });
    expect(mockQuery).toHaveBeenCalledWith(controllerTesting.VALIDATE_TIMEZONE_SQL, ['Invalid/Timezone']);
  });

  it('updates the timezone when the value is valid', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app)
      .put('/api/me/timezone')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Europe/Madrid' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, timezone: 'Europe/Madrid' });
    expect(mockQuery).toHaveBeenNthCalledWith(1, controllerTesting.VALIDATE_TIMEZONE_SQL, ['Europe/Madrid']);
    expect(mockQuery).toHaveBeenNthCalledWith(2, controllerTesting.UPDATE_TIMEZONE_SQL, [
      'Europe/Madrid',
      verifiedUser.clerkId,
    ]);
  });
});
