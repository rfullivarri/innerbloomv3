import type { BillingPlan, BillingStatus } from './billing.schemas.js';

export type BillingSubscriptionRecord = {
  userId: string;
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  pastDueMarkedAt: string | null;
  gracePeriodEndsAt: string | null;
  updatedAt: string;
};

const subscriptions = new Map<string, BillingSubscriptionRecord>();

function createDefaultSubscription(userId: string): BillingSubscriptionRecord {
  const now = new Date().toISOString();
  return {
    userId,
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    pastDueMarkedAt: null,
    gracePeriodEndsAt: null,
    updatedAt: now,
  };
}

export function getOrCreateBillingSubscription(userId: string): BillingSubscriptionRecord {
  const existing = subscriptions.get(userId);
  if (existing) {
    return existing;
  }

  const created = createDefaultSubscription(userId);
  subscriptions.set(userId, created);
  return created;
}

export function saveBillingSubscription(
  userId: string,
  patch: Partial<BillingSubscriptionRecord>,
): BillingSubscriptionRecord {
  const current = getOrCreateBillingSubscription(userId);
  const next = {
    ...current,
    ...patch,
    userId,
    updatedAt: new Date().toISOString(),
  } satisfies BillingSubscriptionRecord;
  subscriptions.set(userId, next);
  return next;
}

export function clearBillingSubscriptionsForTest(): void {
  subscriptions.clear();
}
