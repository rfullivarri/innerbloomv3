import express from 'express';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

describe('health routes', () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: router } = await import('./health.js');
    app = express().use(router);
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok for the base health endpoint', async () => {
    const response = await request(app).get('/_health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('reports database status from the db health check', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const success = await request(app).get('/health/db');

    expect(success.status).toBe(200);
    expect(success.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith('select 1');

    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    const failure = await request(app).get('/health/db');

    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({ code: 'database_unavailable', message: 'connection refused' });
  });
});
