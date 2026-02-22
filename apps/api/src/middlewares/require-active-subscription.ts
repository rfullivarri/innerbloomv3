import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

const ENABLED_STATUSES = new Set(['trialing', 'active']);
const EXPLICIT_BLOCKED_STATUSES = new Set(['canceled', 'expired']);

type SubscriptionRow = {
  status: string;
  grace_ends_at: string | null;
};

const LATEST_SUBSCRIPTION_SQL = `
  SELECT status, grace_ends_at
    FROM user_subscriptions
   WHERE user_id = $1
   ORDER BY updated_at DESC
   LIMIT 1
`;

function hasGraceExpired(graceEndsAt: string | null): boolean {
  if (!graceEndsAt) {
    return true;
  }

  const graceEndsAtTime = Date.parse(graceEndsAt);

  if (Number.isNaN(graceEndsAtTime)) {
    return true;
  }

  return graceEndsAtTime <= Date.now();
}

function isSubscriptionActive(status: string | null | undefined, graceEndsAt: string | null): boolean {
  if (!status) {
    return true;
  }

  const normalizedStatus = status.trim().toLowerCase();

  if (ENABLED_STATUSES.has(normalizedStatus)) {
    return true;
  }

  if (normalizedStatus === 'past_due') {
    return !hasGraceExpired(graceEndsAt);
  }

  if (EXPLICIT_BLOCKED_STATUSES.has(normalizedStatus)) {
    return false;
  }

  return false;
}

export async function requireActiveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id ?? req.params.id;

    if (!userId) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const result = await pool.query<SubscriptionRow>(LATEST_SUBSCRIPTION_SQL, [userId]);
    const subscription = result.rows?.[0];

    if (!subscription) {
      next();
      return;
    }

    if (!isSubscriptionActive(subscription.status, subscription.grace_ends_at)) {
      throw new HttpError(402, 'subscription_inactive', 'Active subscription required');
    }

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(500, 'internal_error', 'Unable to validate subscription', { cause: error }));
  }
}

export const subscriptionStatusPolicy = {
  enabled: Array.from(ENABLED_STATUSES),
  blocked: ['past_due (if grace expired)', ...Array.from(EXPLICIT_BLOCKED_STATUSES)],
};
