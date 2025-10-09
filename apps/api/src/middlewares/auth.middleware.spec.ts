import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';

vi.mock('../services/auth-service.js', () => ({
  getAuthService: vi.fn(),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

import { createAuthMiddleware } from './auth-middleware.js';

type MockVerifiedUser = {
  id: string;
  clerkId: string;
  email: string | null;
  isNew: boolean;
};

type MockAuthService = {
  verifyToken: (authHeader?: string | null) => Promise<MockVerifiedUser>;
};

type MutableRequest = Pick<Request, 'get' | 'header'> & { user?: MockVerifiedUser };

function createRequest(headers: Record<string, string | undefined> = {}): MutableRequest {
  const store = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(headers)) {
    store.set(key.toLowerCase(), value);
  }

  return {
    get: vi.fn((name: string) => store.get(name.toLowerCase()) ?? undefined),
    header: vi.fn((name: string) => store.get(name.toLowerCase()) ?? undefined),
  };
}

function createMiddleware(service: MockAuthService) {
  return createAuthMiddleware(() => service);
}

function createNext() {
  return vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();
}

describe('authMiddleware', () => {
  it('calls next with a 401 error when no authorization header is present', async () => {
    const verifyToken = vi
      .fn<MockAuthService['verifyToken']>()
      .mockRejectedValue(new HttpError(401, 'unauthorized', 'Authentication required'));
    const middleware = createMiddleware({ verifyToken });
    const req = createRequest();
    const next = createNext();

    await middleware(req as unknown as Request, {} as Response, next);

    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith(undefined);
    expect(req.user).toBeUndefined();

    const error = next.mock.calls[0]?.[0] as HttpError | undefined;
    expect(error).toBeInstanceOf(HttpError);
    expect(error?.status).toBe(401);
    expect(error?.code).toBe('unauthorized');
  });

  it('bubbles up HttpError instances from the auth service', async () => {
    const invalidTokenError = new HttpError(401, 'unauthorized', 'Invalid authentication token');
    const verifyToken = vi
      .fn<MockAuthService['verifyToken']>()
      .mockRejectedValue(invalidTokenError);
    const middleware = createMiddleware({ verifyToken });
    const req = createRequest({ Authorization: 'Bearer invalid' });
    const next = createNext();

    await middleware(req as unknown as Request, {} as Response, next);

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
    const req = createRequest({ Authorization: 'Bearer valid-token' });
    const next = createNext();

    await middleware(req as unknown as Request, {} as Response, next);

    expect(verifyToken).toHaveBeenCalledWith('Bearer valid-token');
    expect(req.user).toEqual(verifiedUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
