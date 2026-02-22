import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelUserSubscription,
  changeUserPlan,
  clearBillingSubscriptionsForTest,
  getUserBillingSubscription,
  reactivateUserSubscription,
  subscribeUser,
} from './billing.service.js';

describe('billing.service', () => {
  beforeEach(() => {
    clearBillingSubscriptionsForTest();
    vi.useRealTimers();
  });

  it('creates FREE subscription by default', () => {
    const result = getUserBillingSubscription('user-1');
    expect(result.subscription.plan).toBe('FREE');
    expect(result.subscription.status).toBe('ACTIVE');
  });

  it('subscribes and changes plan', () => {
    const subscribed = subscribeUser('user-1', { plan: 'MONTH' });
    expect(subscribed.subscription.plan).toBe('MONTH');
    expect(subscribed.subscription.currentPeriodStart).not.toBeNull();

    const changed = changeUserPlan('user-1', { plan: 'YEAR' });
    expect(changed.subscription.plan).toBe('YEAR');
    expect(changed.subscription.status).toBe('ACTIVE');
  });

  it('marks past_due with 7-day grace and auto-cancels after grace', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const pastDue = changeUserPlan('user-1', { plan: 'MONTH', status: 'PAST_DUE' });
    expect(pastDue.subscription.status).toBe('PAST_DUE');
    expect(pastDue.subscription.gracePeriodEndsAt).toBe('2026-01-08T00:00:00.000Z');

    vi.setSystemTime(new Date('2026-01-09T00:00:00.000Z'));
    const expired = getUserBillingSubscription('user-1');
    expect(expired.subscription.status).toBe('CANCELED');
    expect(expired.subscription.canceledAt).toBe('2026-01-09T00:00:00.000Z');
  });

  it('cancels and reactivates subscription', () => {
    subscribeUser('user-1', { plan: 'SIX_MONTHS' });
    const canceled = cancelUserSubscription('user-1', {});
    expect(canceled.subscription.status).toBe('CANCELED');

    const reactivated = reactivateUserSubscription('user-1', {});
    expect(reactivated.subscription.status).toBe('ACTIVE');
    expect(reactivated.subscription.plan).toBe('SIX_MONTHS');
  });
});
