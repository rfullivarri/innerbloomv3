import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireAdmin } from './admin.middleware.js';
import { HttpError } from '../../lib/http-error.js';

type NextFn = (error?: unknown) => void;

type TestUser = {
  id: string;
  clerkId?: string;
  email?: string | null;
};

type RequestLike = Partial<Request> & { user?: TestUser };

type QueryRow = { is_admin: boolean | null };

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }>>(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
}));

function createRequest(user?: TestUser): RequestLike {
  return {
    user,
  } as RequestLike;
}

const createResponse = () => ({}) as Response;

function createNext(): { next: NextFn; promise: Promise<unknown> } {
  let resolve: (value?: unknown) => void;
  const promise = new Promise((res) => {
    resolve = res;
  });
  const next: NextFn = (error) => {
    resolve?.(error);
  };
  return { next, promise };
}

describe('requireAdmin', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    delete process.env.ADMIN_USER_ID;
  });

  it('throws 401 when no user is present', async () => {
    const req = createRequest();
    const res = createResponse();
    const { next, promise } = createNext();

    await requireAdmin(req as Request, res, next);
    const error = (await promise) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
    expect(error.code).toBe('unauthorized');
  });

  it('allows access when ADMIN_USER_ID override matches the user', async () => {
    const req = createRequest({ id: 'user-1', clerkId: 'clerk-1', email: 'admin@example.com' });
    const res = createResponse();
    const { next, promise } = createNext();
    process.env.ADMIN_USER_ID = 'user-1';

    await requireAdmin(req as Request, res, next);
    const error = await promise;

    expect(error).toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('verifies admin status via the database', async () => {
    const req = createRequest({ id: 'user-2', clerkId: 'clerk-2', email: 'member@example.com' });
    const res = createResponse();
    const { next, promise } = createNext();
    mockQuery.mockResolvedValueOnce({ rows: [{ is_admin: true }] });

    await requireAdmin(req as Request, res, next);
    const error = await promise;

    expect(error).toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('rejects when the user is not an admin', async () => {
    const req = createRequest({ id: 'user-3', clerkId: 'clerk-3', email: 'member@example.com' });
    const res = createResponse();
    const { next, promise } = createNext();
    mockQuery.mockResolvedValueOnce({ rows: [{ is_admin: false }] });

    await requireAdmin(req as Request, res, next);
    const error = (await promise) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('forbidden');
  });
});
