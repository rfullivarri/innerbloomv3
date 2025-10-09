import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import { mockNext, mockReq, mockRes } from '../tests/test-utils.js';
import { createAuthMiddleware, type RequestUser } from './auth-middleware.js';

type MockVerifiedUser = RequestUser;

type MockAuthService = {
  verifyToken: (authHeader?: string | null) => Promise<MockVerifiedUser>;
};

type MockedRequest = Request & { user?: MockVerifiedUser };

function createMiddleware(service: MockAuthService) {
  return createAuthMiddleware(() => service);
}

describe('authMiddleware', () => {
  it('calls next with a 401 error when no authorization header is present', async () => {
    const verifyToken = vi
      .fn<MockAuthService['verifyToken']>()
      .mockRejectedValue(new HttpError(401, 'unauthorized', 'Authentication required'));
    const middleware = createMiddleware({ verifyToken });
    const req = mockReq<MockVerifiedUser>();
    const res: Response = mockRes();
    const next = mockNext();

    await middleware(req as MockedRequest, res, next);

    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith(undefined);
    expect(req.user).toBeUndefined();

    const error = next.mock.calls[0]?.[0] as unknown;
    expect(error).toBeInstanceOf(HttpError);
    if (error instanceof HttpError) {
      expect(error.status).toBe(401);
      expect(error.code).toBe('unauthorized');
    }
  });

  it('bubbles up HttpError instances from the auth service', async () => {
    const invalidTokenError = new HttpError(401, 'unauthorized', 'Invalid authentication token');
    const verifyToken = vi
      .fn<MockAuthService['verifyToken']>()
      .mockRejectedValue(invalidTokenError);
    const middleware = createMiddleware({ verifyToken });
    const req = mockReq<MockVerifiedUser>({ headers: { Authorization: 'Bearer invalid' } });
    const res: Response = mockRes();
    const next = mockNext();

    await middleware(req as MockedRequest, res, next);

    expect(verifyToken).toHaveBeenCalledWith('Bearer invalid');
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(invalidTokenError);
  });

  it('injects the verified user on success', async () => {
    const verifiedUser: MockVerifiedUser = {
      id: 'user-123',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      isNew: false,
    };
    const verifyToken = vi.fn<MockAuthService['verifyToken']>().mockResolvedValue(verifiedUser);
    const middleware = createMiddleware({ verifyToken });
    const req = mockReq<MockVerifiedUser>({ headers: { Authorization: 'Bearer valid-token' } });
    const res: Response = mockRes();
    const next = mockNext();

    await middleware(req as MockedRequest, res, next);

    expect(verifyToken).toHaveBeenCalledWith('Bearer valid-token');
    expect(req.user).toEqual(verifiedUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
