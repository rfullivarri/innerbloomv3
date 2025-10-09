import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('GET /api/leaderboard', () => {
  it('returns default pagination when no params are provided', async () => {
    const response = await request(app).get('/api/leaderboard');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ limit: 10, offset: 0, users: [] });
  });

  it('rejects a limit greater than 50', async () => {
    const response = await request(app).get('/api/leaderboard').query({ limit: 99 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid_request', message: 'limit must be 50 or less' });
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPoolQuery } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: {
    query: mockPoolQuery,
    on: vi.fn(),
  },
  db: {},
  dbReady: Promise.resolve(),
}));

import app from '../app.js';

describe('GET /leaderboard', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('returns an invalid_request error when the limit exceeds 50', async () => {
    const response = await request(app).get('/leaderboard').query({ limit: 51 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'invalid_request',
      message: 'limit must be 50 or less',
      details: expect.any(Object),
    });
    expect(response.body.details?.fieldErrors?.limit?.[0]).toBe('limit must be 50 or less');
  });
});
