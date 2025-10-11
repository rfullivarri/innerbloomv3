import type { NextFunction, Request, Response } from 'express';
import { pool } from '../../db.js';
import type { RequestUser } from '../../middlewares/auth-middleware.js';
import { HttpError } from '../../lib/http-error.js';

const SELECT_IS_ADMIN_SQL = 'SELECT is_admin FROM users WHERE user_id = $1 LIMIT 1';
const SELECT_IS_ADMIN_BY_CLERK_SQL = 'SELECT is_admin FROM users WHERE clerk_user_id = $1 LIMIT 1';

function resolveAdminOverrides(): Set<string> {
  const raw = process.env.ADMIN_USER_ID;
  if (!raw) {
    return new Set();
  }

  const ids = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return new Set(ids);
}

function isOverrideAdmin(user: RequestUser): boolean {
  const overrides = resolveAdminOverrides();
  if (overrides.size === 0) {
    return false;
  }

  if (overrides.has(user.id) || overrides.has(user.clerkId)) {
    return true;
  }

  if (user.email) {
    return overrides.has(user.email.toLowerCase());
  }

  return false;
}

async function fetchIsAdmin(user: RequestUser): Promise<boolean> {
  const resultById = await pool.query<{ is_admin: boolean | null }>(SELECT_IS_ADMIN_SQL, [user.id]);
  const rowById = resultById.rows[0];

  if (rowById?.is_admin) {
    return true;
  }

  if (rowById && rowById.is_admin === false) {
    return false;
  }

  if (user.clerkId) {
    const resultByClerk = await pool.query<{ is_admin: boolean | null }>(SELECT_IS_ADMIN_BY_CLERK_SQL, [
      user.clerkId,
    ]);
    const rowByClerk = resultByClerk.rows[0];
    if (rowByClerk?.is_admin) {
      return true;
    }
    if (rowByClerk && rowByClerk.is_admin === false) {
      return false;
    }
  }

  return false;
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    if (isOverrideAdmin(user)) {
      next();
      return;
    }

    const isAdmin = await fetchIsAdmin(user);

    if (!isAdmin) {
      throw new HttpError(403, 'forbidden', 'Admin access required');
    }

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(500, 'internal_error', 'Failed to verify admin access', { cause: error }));
  }
}
