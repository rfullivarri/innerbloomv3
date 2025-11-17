import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindPendingReminders, mockMarkAsSent, mockSendEmail } = vi.hoisted(() => ({
  mockFindPendingReminders: vi.fn(),
  mockMarkAsSent: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock('../../repositories/user-daily-reminders.repository.js', () => ({
  findPendingEmailReminders: (...args: unknown[]) => mockFindPendingReminders(...args),
  markRemindersAsSent: (...args: unknown[]) => mockMarkAsSent(...args),
}));

vi.mock('../email/index.js', () => ({
  getEmailProvider: () => ({
    sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  }),
}));

describe('runDailyReminderJob', () => {
  beforeEach(() => {
    mockFindPendingReminders.mockReset();
    mockMarkAsSent.mockReset();
    mockSendEmail.mockReset();
  });

  it('returns early when there are no reminders', async () => {
    mockFindPendingReminders.mockResolvedValueOnce([]);
    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    const result = await runDailyReminderJob(new Date('2024-01-01T00:00:00Z'));

    expect(result).toEqual({ attempted: 0, sent: 0, skipped: 0, errors: [] });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockMarkAsSent).not.toHaveBeenCalled();
  });

  it('sends reminder emails and marks them as sent', async () => {
    const now = new Date('2024-01-01T12:00:00Z');
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'r1',
        user_id: 'u1',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '08:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'test@example.com',
        email: null,
        first_name: 'Jane',
        full_name: 'Jane Doe',
        effective_timezone: 'UTC',
      },
    ]);

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    const result = await runDailyReminderJob(now);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockMarkAsSent).toHaveBeenCalledWith(['r1'], now);
    expect(result.attempted).toBe(1);
    expect(result.sent).toBe(1);
  });

  it('skips entries without an email address', async () => {
    const now = new Date('2024-01-01T12:00:00Z');
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'r2',
        user_id: 'u2',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '08:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: null,
        email: null,
        first_name: 'No Email',
        full_name: 'No Email',
        effective_timezone: 'UTC',
      },
    ]);

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    const result = await runDailyReminderJob(now);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockMarkAsSent).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([{ reminderId: 'r2', reason: 'missing_email' }]);
  });

  it('records failures when the provider rejects a message', async () => {
    const now = new Date('2024-01-01T12:00:00Z');
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'r3',
        user_id: 'u3',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '08:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'broken@example.com',
        email: null,
        first_name: 'Broken',
        full_name: 'Broken Mail',
        effective_timezone: 'UTC',
      },
    ]);
    mockSendEmail.mockRejectedValueOnce(new Error('SMTP down'));

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    const result = await runDailyReminderJob(now);

    expect(mockMarkAsSent).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.errors[0]).toEqual({ reminderId: 'r3', reason: 'SMTP down' });
  });
});
