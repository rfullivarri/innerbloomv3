import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryRow = { is_admin: boolean | null };

const { mockQuery, authMiddlewareMock } = vi.hoisted(() => ({
  mockQuery: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }>>(),
  authMiddlewareMock: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & {
      user?: {
        id: string;
        clerkId: string;
        email: string;
        isNew: boolean;
      };
    }).user = {
      id: 'admin-user-id',
      clerkId: 'clerk-admin',
      email: 'admin@example.com',
      isNew: false,
    };
    next();
  },
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../middlewares/auth-middleware.js', () => ({
  authMiddleware: authMiddlewareMock,
}));

import app from '../../app.js';

describe('Admin routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockQuery.mockResolvedValue({ rows: [{ is_admin: true }] });
  });

  it('returns a paginated list of users', async () => {
    const response = await request(app).get('/api/admin/users').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: expect.any(Array),
      page: 1,
      pageSize: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it('validates query parameters', async () => {
    const response = await request(app)
      .get('/api/admin/users/00000000-0000-4000-8000-000000000001/logs')
      .query({ page: 0 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
  });

  it('exports CSV logs', async () => {
    const response = await request(app)
      .get('/api/admin/users/00000000-0000-4000-8000-000000000001/logs.csv')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/csv');
    expect(response.text.split('\n')[0]).toContain('date');
  });
});
