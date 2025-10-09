import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './lib/http-error.js';

const { authMiddlewareSpy } = vi.hoisted(() => ({
  authMiddlewareSpy: vi.fn<[
    Request,
    Response,
    NextFunction,
  ], Promise<void> | void>(),
}));

vi.mock('./middlewares/auth-middleware.js', () => ({
  authMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => authMiddlewareSpy(req, res, next),
  createAuthMiddleware: () => authMiddlewareSpy,
}));

vi.mock('./routes/index.js', () => {
  const router = Router();

  router.get('/secure', authMiddlewareSpy, (req, res) => {
    res.status(200).json({
      ok: true,
      user: req.user ?? null,
    });
  });

  router.get('/secure-error', authMiddlewareSpy, (_req, _res, next) => {
    next(new HttpError(401, 'unauthorized', 'forced by test'));
  });

  return { default: router };
});

describe('app', () => {
  beforeEach(() => {
    authMiddlewareSpy.mockReset();
    authMiddlewareSpy.mockImplementation((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  it('mounts the API router under /api and root, chaining the auth middleware', async () => {
    const { default: app } = await import('./app.js');

    const [apiResponse, rootResponse] = await Promise.all([
      request(app).get('/api/secure'),
      request(app).get('/secure'),
    ]);

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body).toEqual({ ok: true, user: { id: 'user-123' } });
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.body).toEqual({ ok: true, user: { id: 'user-123' } });
    expect(authMiddlewareSpy).toHaveBeenCalledTimes(2);
  });

  it('propagates HttpError instances thrown by the auth middleware', async () => {
    authMiddlewareSpy.mockImplementationOnce((_req, _res, next) => {
      next(new HttpError(401, 'unauthorized', 'token rejected'));
    });

    const { default: app } = await import('./app.js');

    const response = await request(app).get('/api/secure');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'token rejected',
    });
    expect(authMiddlewareSpy).toHaveBeenCalledTimes(1);
  });
});
