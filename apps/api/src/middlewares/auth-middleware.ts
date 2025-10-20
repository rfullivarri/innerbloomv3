import process from 'node:process';
import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { getAuthService, type AuthService, type VerifiedUser } from '../services/auth-service.js';

type GetService = () => AuthService;

export type RequestUser = VerifiedUser;

declare module 'express-serve-static-core' {
  interface Request {
    user?: RequestUser;
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
      const rawAuthHeader = req.get('authorization');
      const match = rawAuthHeader?.match(/^Bearer\s+(.+)$/i);
      const normalizedAuthHeader = match ? `Bearer ${match[1].trim()}` : undefined;

      const devUser = maybeResolveDevUser(req);
      if (devUser) {
        req.user = devUser;
        next();
        return;
      }

      if (!normalizedAuthHeader) {
        const legacyUser = await maybeResolveLegacyUser(req);
        if (legacyUser) {
          req.user = legacyUser;
          next();
          return;
        }

        console.warn('[auth] missing/invalid authorization header', {
          hasAuth: Boolean(rawAuthHeader),
          sample: rawAuthHeader?.slice(0, 20),
        });
        throw new HttpError(401, 'unauthorized', 'Authentication required');
      }

      const verifiedUser = await service.verifyToken(normalizedAuthHeader);

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

const LEGACY_HEADER_REMOVAL_DATE = '2024-09-30';
const LOCAL_ENVIRONMENTS = new Set(['development', 'test', 'local']);
const USERS_ME_PATHS = new Set(['/users/me', '/api/users/me']);
const LEGACY_USER_SQL =
  'SELECT user_id, clerk_user_id, email_primary FROM users WHERE user_id = $1 LIMIT 1';

type LegacyUserRow = {
  user_id: string;
  clerk_user_id: string;
  email_primary: string | null;
};

const DEV_USER_HEADER = 'X-Innerbloom-Demo-User';

function isLocalEnvironment(): boolean {
  const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
  return LOCAL_ENVIRONMENTS.has(env);
}

function isUsersMeRequest(req: Request): boolean {
  const originalUrl = req.originalUrl?.split('?')[0] ?? '';
  const normalized = originalUrl.replace(/\/+$/, '');
  const comparable = normalized.length > 0 ? normalized : '/';
  return USERS_ME_PATHS.has(comparable);
}

async function maybeResolveLegacyUser(req: Request): Promise<RequestUser | null> {
  if (process.env.ALLOW_X_USER_ID_DEV !== 'true') {
    return null;
  }

  if (!isLocalEnvironment()) {
    return null;
  }

  if (!isUsersMeRequest(req)) {
    return null;
  }

  const legacyUserIdHeader = req.get('X-User-Id');

  if (!legacyUserIdHeader) {
    return null;
  }

  const legacyUserId = legacyUserIdHeader.trim();

  if (!legacyUserId) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  try {
    const result = await pool.query<LegacyUserRow>(LEGACY_USER_SQL, [legacyUserId]);

    const row = result.rows[0];

    if (!row) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    console.warn(
      `[deprecation] X-User-Id header is deprecated and will be removed on ${LEGACY_HEADER_REMOVAL_DATE}. ` +
        'Use Authorization: Bearer <token> instead.',
    );

    return {
      id: row.user_id,
      clerkId: row.clerk_user_id,
      email: row.email_primary,
      isNew: false,
    } satisfies RequestUser;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, 'unauthorized', 'Authentication required', { cause: error });
  }
}

function maybeResolveDevUser(req: Request): RequestUser | null {
  const devSwitchEnabled = String(process.env.ALLOW_DEV_USER_SWITCH ?? 'true').toLowerCase() === 'true';

  if (!devSwitchEnabled) {
    return null;
  }

  if (!isLocalEnvironment()) {
    return null;
  }

  const header = req.get(DEV_USER_HEADER);
  if (!header) {
    return null;
  }

  const userId = header.trim();
  if (!userId) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  return {
    id: userId,
    clerkId: `dev:${userId}`,
    email: `${userId}@demo.local`,
    isNew: false,
  } satisfies RequestUser;
}
