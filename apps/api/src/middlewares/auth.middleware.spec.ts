import { describe, expect, it, beforeEach, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import { mockNext, mockReq, mockRes } from '../tests/test-utils.js';

const verifyTokenMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: '11111111-2222-3333-4444-555555555555',
    clerkId: 'clrk_1',
    email: 'a@b.c',
    isNew: false,
  })),
);

const resolveUserIdFromClerkMock = vi.hoisted(() =>
  vi.fn(async () => '11111111-2222-3333-4444-555555555555'),
);

vi.mock('../services/auth-service', () => ({
  getAuthService: () => ({ verifyToken: verifyTokenMock }),
  resetAuthServiceCache: vi.fn(),
  verifyToken: verifyTokenMock,
  resolveUserIdFromClerk: resolveUserIdFromClerkMock,
}));

import { authMiddleware, type RequestUser } from './auth-middleware.js';

describe('authMiddleware', () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
    verifyTokenMock.mockImplementation(async () => ({
      id: '11111111-2222-3333-4444-555555555555',
      clerkId: 'clrk_1',
      email: 'a@b.c',
      isNew: false,
    } satisfies RequestUser));
    resolveUserIdFromClerkMock.mockReset();
    resolveUserIdFromClerkMock.mockImplementation(async () => '11111111-2222-3333-4444-555555555555');
  });

  it('calls next with a 401 error when no authorization header is present', async () => {
    const unauthorizedError = new HttpError(401, 'unauthorized', 'Authentication required');
    verifyTokenMock.mockRejectedValueOnce(unauthorizedError);

    const req = mockReq<RequestUser>();
    const res = mockRes();
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledTimes(1);
    expect(verifyTokenMock).toHaveBeenCalledWith(undefined);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(HttpError);
    const forwardedError = next.mock.calls[0]?.[0];
    if (forwardedError instanceof HttpError) {
      expect(forwardedError.status).toBe(401);
      expect(forwardedError.code).toBe('unauthorized');
    }
  });

  it('bubbles up HttpError instances from the auth service', async () => {
    const invalidTokenError = new HttpError(401, 'unauthorized', 'Invalid authentication token');
    verifyTokenMock.mockRejectedValueOnce(invalidTokenError);

    const req = mockReq<RequestUser>({ headers: { Authorization: 'Bearer invalid' } });
    const res = mockRes();
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith('Bearer invalid');
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(invalidTokenError);
  });

  it('injects the verified user on success', async () => {
    const verifiedUser: RequestUser = {
      id: 'user-123',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      isNew: false,
    };
    verifyTokenMock.mockResolvedValueOnce(verifiedUser);

    const req = mockReq<RequestUser>({ headers: { Authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();

    await authMiddleware(req, res, next);

    expect(verifyTokenMock).toHaveBeenCalledWith('Bearer valid-token');
    expect(req.user).toEqual(verifiedUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
