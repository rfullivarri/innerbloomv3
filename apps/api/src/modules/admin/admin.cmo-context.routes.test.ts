import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  mockQuery,
  mockBuildContext,
} = vi.hoisted(() => ({
  authState: {
    authenticated: true,
  },
  mockQuery: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: { is_admin: boolean }[] }>>(),
  mockBuildContext: vi.fn(async () => ({
    status: 'written',
    periodKey: '2026-07',
    previousPeriodKey: '2026-06',
    outputPath: '/tmp/marketing/agent-inputs/2026-07/cmo-context.json',
    sourceSummary: [
      { source_type: 'strategy_memory', source_path_or_id: 'Docs/marketing/STRATEGY_MEMORY.md' },
    ],
  })),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../../middlewares/auth-middleware.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    if (authState.authenticated) {
      req.user = {
        id: 'admin-user-id',
        clerkId: 'clerk-admin',
        email: 'admin@example.com',
        isNew: false,
      };
    }
    next();
  },
}));

vi.mock('../../services/marketingCmoContextService.js', () => ({
  buildMarketingCmoContext: (...args: unknown[]) => mockBuildContext(...args),
  getMarketingCmoContextStatus: vi.fn(async () => ({
    periodKey: '2026-07',
    exists: true,
    outputPath: '/tmp/marketing/agent-inputs/2026-07/cmo-context.json',
    updatedAt: '2026-07-01T00:00:00.000Z',
    sizeBytes: 1234,
  })),
}));

import app from '../../app.js';

describe('admin CMO context routes', () => {
  beforeEach(() => {
    authState.authenticated = true;
    mockQuery.mockReset();
    mockBuildContext.mockClear();
    mockQuery.mockResolvedValue({ rows: [{ is_admin: true }] });
  });

  it('rejects unauthenticated context export requests', async () => {
    authState.authenticated = false;

    const response = await request(app)
      .post('/api/admin/marketing/agents/cmo/context')
      .send({ periodKey: '2026-07' });

    expect(response.status).toBe(401);
    expect(mockBuildContext).not.toHaveBeenCalled();
  });

  it('rejects non-admin context export requests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ is_admin: false }] });

    const response = await request(app)
      .post('/api/admin/marketing/agents/cmo/context')
      .send({ periodKey: '2026-07' });

    expect(response.status).toBe(403);
    expect(mockBuildContext).not.toHaveBeenCalled();
  });

  it('exports context for an admin without returning the full context', async () => {
    const response = await request(app)
      .post('/api/admin/marketing/agents/cmo/context')
      .send({ periodKey: '2026-07', force: true });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      status: 'written',
      periodKey: '2026-07',
      previousPeriodKey: '2026-06',
      outputPath: '/tmp/marketing/agent-inputs/2026-07/cmo-context.json',
    });
    expect(response.body.context).toBeUndefined();
    expect(mockBuildContext).toHaveBeenCalledWith({ periodKey: '2026-07', force: true });
  });
});
