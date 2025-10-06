import type { NextFunction, Response } from 'express';
import {
  ClerkExpressWithAuth,
  createClerkClient,
  type ClerkClient,
  type WithAuthProp,
} from '@clerk/clerk-sdk-node';
import type { Request } from 'express';
import { query } from '../db/pool.js';
import { HttpError } from '../lib/http-error.js';

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  throw new Error('CLERK_SECRET_KEY must be configured');
}

const clerkClient: ClerkClient = createClerkClient({ secretKey: clerkSecretKey });
const clerkMiddleware = ClerkExpressWithAuth();

declare global {
  namespace Express {
    interface RequestContext {
      userId: string;
      clerkUserId: string;
    }

    interface Request {
      ctx?: RequestContext;
    }
  }
}

async function upsertUser(
  clerkUserId: string,
  email: string | null,
  fullName: string | null,
  imageUrl: string | null,
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO public.users (clerk_user_id, email_primary, full_name, image_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        email_primary = COALESCE(EXCLUDED.email_primary, public.users.email_primary),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        image_url = COALESCE(EXCLUDED.image_url, public.users.image_url),
        deleted_at = NULL
      RETURNING id;
    `,
    [clerkUserId, email, fullName, imageUrl],
  );

  return result.rows[0].id;
}

export async function resolveUserId(clerkUserId: string): Promise<string> {
  const existing = await query<{ id: string; deleted_at: Date | null }>(
    'SELECT id, deleted_at FROM public.users WHERE clerk_user_id = $1',
    [clerkUserId],
  );

  if (existing.rowCount && existing.rows[0]?.deleted_at === null) {
    return existing.rows[0].id;
  }

  let user;
  try {
    user = await clerkClient.users.getUser(clerkUserId);
  } catch (error) {
    throw new HttpError(401, 'Unable to resolve Clerk user', error);
  }
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName = user?.fullName ?? null;
  const imageUrl = user?.imageUrl ?? null;

  return upsertUser(clerkUserId, email, fullName, imageUrl);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  clerkMiddleware(req as WithAuthProp<Request>, res, async (error) => {
    if (error) {
      next(error);
      return;
    }

    const clerkUserId = (req as WithAuthProp<Request>).auth?.userId;

    if (!clerkUserId) {
      next(new HttpError(401, 'Unauthorized'));
      return;
    }

    try {
      const userId = await resolveUserId(clerkUserId);
      req.ctx = { userId, clerkUserId };
      next();
    } catch (err) {
      next(err);
    }
  });
}
