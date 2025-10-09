import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import { ownUserGuard } from './own-user-guard.js';

type MockVerifiedUser = {
  id: string;
  clerkId: string;
  email: string | null;
  isNew: boolean;
};

type MutableRequest = {
  params: Record<string, string>;
  user?: MockVerifiedUser;
};

function createRequest(params: Record<string, string>, userId?: string): MutableRequest {
  return {
    params,
    user: userId
      ? {
          id: userId,
          clerkId: `clerk_${userId}`,
          email: 'user@example.com',
          isNew: false,
        }
      : undefined,
  };
}

function createNext() {
  return vi.fn<(err?: any) => void>();
}

describe('ownUserGuard', () => {
  it('returns 403 when the request user does not match the route id', () => {
    const req = createRequest({ id: '11111111-2222-3333-4444-555555555555' }, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    const next = createNext();

    ownUserGuard(req as unknown as Request, {} as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const [error] = next.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(403);
    expect((error as HttpError).code).toBe('forbidden');
  });

  it('allows the request to continue when the ids match', () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const req = createRequest({ id: userId }, userId);
    const next = createNext();

    ownUserGuard(req as unknown as Request, {} as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
