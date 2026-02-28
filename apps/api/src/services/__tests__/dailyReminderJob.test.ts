import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindPendingReminders, mockMarkAsSent, mockSendEmail, mockFindFeedbackDefinition } = vi.hoisted(() => ({
  mockFindPendingReminders: vi.fn(),
  mockMarkAsSent: vi.fn(),
  mockSendEmail: vi.fn(),
  mockFindFeedbackDefinition: vi.fn(),
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

vi.mock('../../repositories/feedback-definitions.repository.js', () => ({
  DEFAULT_FEEDBACK_DEFINITION: {
    notificationKey: 'scheduler_daily_reminder_email',
    label: 'Email recordatorio diario',
    type: 'daily_reminder',
    scope: ['email'],
    trigger: 'cron',
    channel: 'email',
    frequency: 'daily',
    status: 'active',
    priority: 50,
    copy: 'Hola {{user_name}}, tu Daily Quest de {{friendly_date}} ya está lista. Sumá XP registrando tu emoción del día y marcando tus hábitos completados.',
    ctaLabel: 'Abrir Daily Quest',
    ctaHref: 'https://innerbloomjourney.org/dashboard-v3?daily-quest=open',
    previewVariables: {},
  },
  findFeedbackDefinitionByNotificationKey: (...args: unknown[]) => mockFindFeedbackDefinition(...args),
}));

describe('runDailyReminderJob', () => {
  beforeEach(() => {
    mockFindPendingReminders.mockReset();
    mockMarkAsSent.mockReset();
    mockSendEmail.mockReset();
    mockFindFeedbackDefinition.mockReset();
    mockFindFeedbackDefinition.mockResolvedValue(null);
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

  it('formats the reminder copy using the effective timezone for the local date', async () => {
    const now = new Date('2024-03-15T12:00:00Z');
    const reminder = {
      user_daily_reminder_id: 'tz-1',
      user_id: 'user-1',
      channel: 'email',
      status: 'active',
      timezone: 'America/Argentina/Buenos_Aires',
      local_time: '09:30:00',
      last_sent_at: null,
      created_at: now,
      updated_at: now,
      email_primary: 'argentina@example.com',
      email: null,
      first_name: 'Ludmila',
      full_name: 'Ludmila Test',
      effective_timezone: 'America/Argentina/Buenos_Aires',
    } as const;

    mockFindPendingReminders.mockResolvedValueOnce([reminder]);

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    await runDailyReminderJob(now);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const payload = mockSendEmail.mock.calls[0]?.[0];
    const friendlyDate = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: reminder.effective_timezone,
    }).format(now);

    expect(payload?.html).toContain(`Tu Daily Quest de ${friendlyDate} ya está lista.`);
    expect(payload?.html).toContain('Sumá XP registrando tu emoción del día');
  });

  it('uses the admin-defined template copy and CTA when available', async () => {
    const now = new Date('2024-06-10T15:00:00Z');
    mockFindFeedbackDefinition.mockResolvedValueOnce({
      copy: 'Recordatorio especial para {{user_name}} el {{friendly_date}}. Respirar y luego abrir la app.',
      cta_label: 'Reabrir Innerbloom',
      cta_href: 'https://example.com/custom',
    } as never);
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'templated',
        user_id: 'u-temp',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '08:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'template@example.com',
        email: null,
        first_name: 'Mate',
        full_name: 'Mate Test',
        effective_timezone: 'UTC',
      },
    ]);

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    await runDailyReminderJob(now);

    const payload = mockSendEmail.mock.calls[0]?.[0];
    expect(payload?.html).toContain('Recordatorio especial para Mate');
    expect(payload?.html).toContain('Reabrir Innerbloom');
    expect(payload?.html).toContain('https://example.com/custom');
    expect(payload?.text).toContain('Reabrir Innerbloom: https://example.com/custom');
  });


  it('normalizes legacy PRE daily quest URLs to the PRO domain', async () => {
    const now = new Date('2024-06-10T15:00:00Z');
    mockFindFeedbackDefinition.mockResolvedValueOnce({
      copy: 'Hola {{user_name}}, este es tu recordatorio de {{friendly_date}}.',
      cta_label: 'Abrir Daily Quest',
      cta_href: 'https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open',
    } as never);
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'legacy-pre',
        user_id: 'u-pre',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '08:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'legacy@example.com',
        email: null,
        first_name: 'Legacy',
        full_name: 'Legacy User',
        effective_timezone: 'UTC',
      },
    ]);

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    await runDailyReminderJob(now);

    const payload = mockSendEmail.mock.calls[0]?.[0];
    expect(payload?.html).toContain('https://innerbloomjourney.org/dashboard-v3?daily-quest=open');
    expect(payload?.html).not.toContain('https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open');
    expect(payload?.text).toContain('Abrir Daily Quest: https://innerbloomjourney.org/dashboard-v3?daily-quest=open');
  });

  it('only updates last_sent_at for reminders that were actually delivered', async () => {
    const now = new Date('2024-02-01T09:00:00Z');
    mockFindPendingReminders.mockResolvedValueOnce([
      {
        user_daily_reminder_id: 'delivered',
        user_id: 'user-good',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '06:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'ok@example.com',
        email: null,
        first_name: 'Ok',
        full_name: 'Ok User',
        effective_timezone: 'UTC',
      },
      {
        user_daily_reminder_id: 'failed',
        user_id: 'user-bad',
        channel: 'email',
        status: 'active',
        timezone: 'UTC',
        local_time: '06:00:00',
        last_sent_at: null,
        created_at: now,
        updated_at: now,
        email_primary: 'broken@example.com',
        email: null,
        first_name: 'Broken',
        full_name: 'Broken User',
        effective_timezone: 'UTC',
      },
    ]);

    mockSendEmail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('provider_error'));

    const { runDailyReminderJob } = await import('../dailyReminderJob.js');

    const result = await runDailyReminderJob(now);

    expect(mockMarkAsSent).toHaveBeenCalledTimes(1);
    expect(mockMarkAsSent).toHaveBeenCalledWith(['delivered'], now);
    expect(result).toMatchObject({
      attempted: 2,
      sent: 1,
      skipped: 0,
      errors: [{ reminderId: 'failed', reason: 'provider_error' }],
    });
  });
});
