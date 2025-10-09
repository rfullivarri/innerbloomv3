import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import { mockNext, mockReq, mockRes } from '../tests/test-utils.js';
import { ownUserGuard } from './own-user-guard.js';
import { type RequestUser } from './auth-middleware.js';

type MockedRequest = Request & { user?: RequestUser };

describe('ownUserGuard', () => {
  it('returns 403 when the request user does not match the route id', () => {
    const req = mockReq<RequestUser>({
      params: { id: '11111111-2222-3333-4444-555555555555' },
      user: {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        clerkId: 'clerk_123',
        email: 'user@example.com',
        isNew: false,
      },
    });
    const res: Response = mockRes();
    const next = mockNext();

    ownUserGuard(req as MockedRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0] as unknown;
    expect(error).toBeInstanceOf(HttpError);
    if (error instanceof HttpError) {
      expect(error.status).toBe(403);
      expect(error.code).toBe('forbidden');
    }
  });

  it('allows the request to continue when the ids match', () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const req = mockReq<RequestUser>({
      params: { id: userId },
      user: { id: userId, clerkId: 'clerk_456', email: 'user@example.com', isNew: false },
    });
    const res: Response = mockRes();
    const next = mockNext();

    ownUserGuard(req as MockedRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
