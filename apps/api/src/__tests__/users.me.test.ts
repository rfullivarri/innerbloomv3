import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUserRow } from '../controllers/users/get-user-me.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
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
  });

  it('returns 401 when the authentication header is missing', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/users/me')
      .set('x-user-id', 'user_123');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'user_not_found',
      message: 'User not found',
    });
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE clerk_user_id = $1', ['user_123']);
  });

  it('returns the user when found', async () => {
    const user: CurrentUserRow = {
      id: 'user-row-id',
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

    const response = await request(app)
      .get('/api/users/me')
      .set('x-user-id', 'user_456');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(user);
  });
});
