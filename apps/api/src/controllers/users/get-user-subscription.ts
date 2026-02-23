import type { Request, Response } from 'express';
import { pool } from '../../db.js';
import { HttpError } from '../../lib/http-error.js';

type SubscriptionRow = {
  plan_code: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  current_period_starts_at: string | null;
  updated_at: string;
};

type DatabaseError = {
  code?: string;
  message?: string;
};

function isMissingSubscriptionTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const databaseError = error as DatabaseError;
  return (
    databaseError.code === '42P01'
    || databaseError.message?.toLowerCase().includes('user_subscriptions') === true
  );
}

function mapStatus(status: string | null | undefined): 'trialing' | 'active' | 'inactive' {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'trialing' || normalized === 'past_due') {
    return 'trialing';
  }

  if (normalized === 'active') {
    return 'active';
  }

  return 'inactive';
}

export async function getUserSubscription(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  try {
    const result = await pool.query<SubscriptionRow>(
      `SELECT plan_code, status, trial_ends_at, current_period_starts_at, current_period_ends_at, updated_at
         FROM user_subscriptions
        WHERE user_id = $1
        ORDER BY
          CASE
            WHEN status IN ('trialing', 'active', 'past_due')
              AND COALESCE(current_period_ends_at, trial_ends_at, current_period_starts_at) >= now()
            THEN 0
            ELSE 1
          END,
          updated_at DESC
        LIMIT 1`,
      [userId],
    );

    const subscription = result.rows[0];
    if (!subscription) {
      res.json({
        plan: 'FREE',
        status: 'inactive',
        trialEndsAt: null,
        nextRenewalAt: null,
      });
      return;
    }

    res.json({
      plan: subscription.plan_code,
      status: mapStatus(subscription.status),
      trialEndsAt: subscription.trial_ends_at,
      nextRenewalAt: subscription.current_period_ends_at,
    });
  } catch (error) {
    if (isMissingSubscriptionTableError(error)) {
      res.json({
        plan: 'FREE',
        status: 'inactive',
        trialEndsAt: null,
        nextRenewalAt: null,
      });
      return;
    }

    throw new HttpError(500, 'internal_error', 'Unable to fetch subscription', { cause: error });
  }
}
