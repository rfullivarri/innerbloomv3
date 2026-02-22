import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockSendEmail } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

vi.mock('../email/index.js', () => ({
  getEmailProvider: () => ({ sendEmail: (...args: unknown[]) => mockSendEmail(...args) }),
}));

describe('runSubscriptionNotificationsJob', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSendEmail.mockReset();
  });

  it('sends FREE notifications 7 days before trial end and marks as sent', async () => {
    const now = new Date('2026-03-01T10:00:00Z');
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_subscription_id: 'sub-1',
            plan_code: 'FREE',
            status: 'trialing',
            trial_ends_at: '2026-03-08T10:00:00Z',
            current_period_ends_at: null,
            user_id: 'u-1',
            email_primary: 'free@example.com',
            email: null,
            first_name: 'Free',
            full_name: 'User Free',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ subscription_notification_id: 'n-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { runSubscriptionNotificationsJob } = await import('../subscriptionNotificationsJob.js');
    const result = await runSubscriptionNotificationsJob(now);

    expect(result).toMatchObject({ attempted: 1, sent: 1, skipped: 0, deduplicated: 0 });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('deduplicates when dedupe key already exists', async () => {
    const now = new Date('2026-03-01T10:00:00Z');
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_subscription_id: 'sub-2',
            plan_code: 'MONTH',
            status: 'active',
            trial_ends_at: null,
            current_period_ends_at: '2026-03-08T10:00:00Z',
            user_id: 'u-2',
            email_primary: 'month@example.com',
            email: null,
            first_name: 'Month',
            full_name: 'User Month',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const { runSubscriptionNotificationsJob } = await import('../subscriptionNotificationsJob.js');
    const result = await runSubscriptionNotificationsJob(now);

    expect(result).toMatchObject({ attempted: 1, sent: 0, deduplicated: 1 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
