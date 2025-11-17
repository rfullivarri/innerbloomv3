import { describe, expect, it, beforeEach, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

describe('userDailyRemindersRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('inserts reminders with normalized time', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_daily_reminder_id: 'r1',
          user_id: 'u1',
          channel: 'email',
          status: 'active',
          timezone: 'UTC',
          local_time: '08:30:00',
          last_sent_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const { createUserDailyReminder } = await import('../user-daily-reminders.repository.js');

    const row = await createUserDailyReminder({ userId: 'u1', localTime: '8:30' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_daily_reminders'),
      ['u1', null, null, null, '08:30:00'],
    );
    expect(row.local_time).toBe('08:30:00');
  });

  it('updates reminders when a patch is provided', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_daily_reminder_id: 'r1',
          user_id: 'u1',
          channel: 'email',
          status: 'paused',
          timezone: 'America/Argentina/Buenos_Aires',
          local_time: '06:00:00',
          last_sent_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const { updateUserDailyReminder } = await import('../user-daily-reminders.repository.js');

    await updateUserDailyReminder('r1', {
      status: 'paused',
      timezone: 'America/Argentina/Buenos_Aires',
      localTime: '6:00',
      lastSentAt: now,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_daily_reminders SET'),
      expect.arrayContaining(['r1', 'paused', 'America/Argentina/Buenos_Aires', '06:00:00', now, expect.any(Date)]),
    );
  });

  it('returns pending reminders filtered by now', async () => {
    const now = new Date('2024-01-02T12:00:00Z');
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_daily_reminder_id: 'r2',
          user_id: 'u2',
          channel: 'email',
          status: 'active',
          timezone: 'UTC',
          local_time: '09:00:00',
          last_sent_at: null,
          created_at: now,
          updated_at: now,
          email_primary: 'test@example.com',
          email: null,
          first_name: 'Test',
          full_name: 'Test User',
          effective_timezone: 'UTC',
        },
      ],
    });

    const { findPendingEmailReminders } = await import('../user-daily-reminders.repository.js');

    const rows = await findPendingEmailReminders(now);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WITH reminder_context'), [now]);
    expect(rows).toHaveLength(1);
  });

  it('marks reminders as sent in batch', async () => {
    const { markRemindersAsSent } = await import('../user-daily-reminders.repository.js');
    const sentAt = new Date();

    await markRemindersAsSent(['r1', 'r2'], sentAt);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_daily_reminders'),
      [['r1', 'r2'], sentAt],
    );
  });

  it('skips update when there are no reminders to mark as sent', async () => {
    const { markRemindersAsSent } = await import('../user-daily-reminders.repository.js');
    await markRemindersAsSent([], new Date());
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
