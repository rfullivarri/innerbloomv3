import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: mockGetAuthService,
  createAuthRepository: vi.fn(() => undefined),
  createAuthService: vi.fn(() => undefined),
  resetAuthServiceCache: vi.fn(() => undefined),
}));

import app from '../app.js';

const userRow = {
  user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  clerk_user_id: 'user_lowercase',
  email_primary: 'lower@example.com',
  full_name: 'Lower Bearer',
  image_url: 'https://example.com/avatar.png',
  game_mode: 'standard',
  weekly_target: 500,
  timezone: 'UTC',
  locale: 'en',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
  deleted_at: null,
};

describe('auth middleware bearer normalization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetAuthService.mockClear();
  });

  it('normalizes lowercase bearer tokens before verifying', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [userRow] });

    mockVerifyToken.mockResolvedValue({
      id: userRow.user_id,
      clerkId: userRow.clerk_user_id,
      email: userRow.email_primary,
      isNew: false,
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('authorization', 'bearer faketoken');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: userRow });
    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer faketoken');
  });
});
