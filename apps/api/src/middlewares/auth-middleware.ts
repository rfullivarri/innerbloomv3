import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { getAuthService, type AuthService, type VerifiedUser } from '../services/auth-service.js';

type GetService = () => AuthService;

export type RequestUser = VerifiedUser;

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export function createAuthMiddleware(getService: GetService = getAuthService) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const service = getService();
      const authHeader = req.get('authorization') ?? req.header('authorization');
      const verifiedUser = await service.verifyToken(authHeader);

      req.user = verifiedUser;
      next();
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }

      next(new HttpError(401, 'unauthorized', 'Authentication required', { cause: error }));
    }
  };
}

export const authMiddleware = createAuthMiddleware();
