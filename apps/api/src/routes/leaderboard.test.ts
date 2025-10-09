import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('GET /api/leaderboard', () => {
  it('returns default pagination when no params are provided', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ limit: 10, offset: 0, users: [] });
  });

  it('rejects a limit greater than 50', async () => {
    const res = await request(app).get('/api/leaderboard').query({ limit: 99 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'invalid_request', message: 'limit must be 50 or less' });
  });
});
