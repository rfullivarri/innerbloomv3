import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __TESTING__ as controllerTesting } from '../controllers/users/user-daily-reminder.js';
import { VALIDATE_TIMEZONE_SQL } from '../lib/timezones.js';

const {
  mockQuery,
  mockVerifyToken,
  mockGetAuthService,
  mockFindReminders,
  mockCreateReminder,
  mockUpdateReminder,
} = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockGetAuthService: vi.fn(() => ({
    verifyToken: mockVerifyToken,
  })),
  mockFindReminders: vi.fn(),
  mockCreateReminder: vi.fn(),
  mockUpdateReminder: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
  dbReady: Promise.resolve(),
}));

vi.mock('../repositories/user-daily-reminders.repository.js', () => ({
  findUserDailyRemindersByUser: (...args: unknown[]) => mockFindReminders(...args),
  createUserDailyReminder: (...args: unknown[]) => mockCreateReminder(...args),
  updateUserDailyReminder: (...args: unknown[]) => mockUpdateReminder(...args),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: mockGetAuthService,
  createAuthRepository: vi.fn(() => undefined),
  createAuthService: vi.fn(() => undefined),
  resetAuthServiceCache: vi.fn(() => undefined),
}));

import app from '../app.js';

const verifiedUser = {
  id: 'user-id',
  clerkId: 'clerk_user_123',
  email: 'user@example.com',
  isNew: false,
};

const reminderRow = {
  user_daily_reminder_id: 'rem-1',
  user_id: verifiedUser.id,
  channel: 'email',
  status: 'paused',
  timezone: 'Europe/Madrid',
  local_time: '07:30:00',
  last_sent_at: new Date('2024-01-02T12:00:00Z'),
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-05T00:00:00Z'),
};

describe('GET /api/me/daily-reminder', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockFindReminders.mockReset();
    mockCreateReminder.mockReset();
    mockUpdateReminder.mockReset();
    mockGetAuthService.mockClear();
    mockVerifyToken.mockResolvedValue(verifiedUser);
  });

  it('returns defaults when the user has no reminder configured', async () => {
    mockFindReminders.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'America/Chicago' }] });

    const response = await request(app)
      .get('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: verifiedUser.id,
      reminder: {
        user_daily_reminder_id: null,
        channel: 'email',
        status: 'active',
        timezone: 'America/Chicago',
        local_time: controllerTesting.DEFAULT_LOCAL_TIME,
        last_sent_at: null,
        created_at: null,
        updated_at: null,
      },
    });
    expect(mockFindReminders).toHaveBeenCalledWith(verifiedUser.id);
    expect(mockQuery).toHaveBeenCalledWith(controllerTesting.SELECT_USER_TIMEZONE_SQL, [verifiedUser.id]);
  });

  it('returns the stored reminder configuration when available', async () => {
    mockFindReminders.mockResolvedValueOnce([reminderRow]);

    const response = await request(app)
      .get('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: verifiedUser.id,
      reminder: {
        user_daily_reminder_id: reminderRow.user_daily_reminder_id,
        channel: reminderRow.channel,
        status: reminderRow.status,
        timezone: reminderRow.timezone,
        local_time: reminderRow.local_time,
        last_sent_at: reminderRow.last_sent_at.toISOString(),
        created_at: reminderRow.created_at.toISOString(),
        updated_at: reminderRow.updated_at.toISOString(),
      },
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('PUT /api/me/daily-reminder', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockFindReminders.mockReset();
    mockCreateReminder.mockReset();
    mockUpdateReminder.mockReset();
    mockGetAuthService.mockClear();
    mockVerifyToken.mockResolvedValue(verifiedUser);
  });

  it('rejects invalid timezone formats', async () => {
    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'UTC', local_time: '08:00' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_timezone' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unknown timezones', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Europe/Atlantis', local_time: '08:00' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'unknown_timezone' });
    expect(mockQuery).toHaveBeenCalledWith(VALIDATE_TIMEZONE_SQL, ['Europe/Atlantis']);
  });

  it('creates a reminder when none exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    mockFindReminders.mockResolvedValueOnce([]);
    mockCreateReminder.mockResolvedValueOnce(reminderRow);

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Europe/Madrid', local_time: '07:30', status: 'paused' });

    expect(response.status).toBe(201);
    expect(mockCreateReminder).toHaveBeenCalledWith({
      userId: verifiedUser.id,
      channel: 'email',
      status: 'paused',
      timezone: 'Europe/Madrid',
      localTime: '07:30',
    });
    expect(response.body.reminder.user_daily_reminder_id).toBe(reminderRow.user_daily_reminder_id);
  });

  it('updates an existing reminder', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    mockFindReminders.mockResolvedValueOnce([reminderRow]);
    const updatedRow = { ...reminderRow, status: 'active', local_time: '09:00:00' };
    mockUpdateReminder.mockResolvedValueOnce(updatedRow);

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Europe/Madrid', local_time: '09:00' });

    expect(response.status).toBe(200);
    expect(mockUpdateReminder).toHaveBeenCalledWith(reminderRow.user_daily_reminder_id, {
      timezone: 'Europe/Madrid',
      localTime: '09:00',
    });
    expect(response.body.reminder.local_time).toBe('09:00:00');
  });

  it('maps repository local time errors to validation responses', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    mockFindReminders.mockResolvedValueOnce([]);
    mockCreateReminder.mockRejectedValueOnce(new Error('localTime is outside the valid range'));

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ timezone: 'Europe/Madrid', local_time: '99:00' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_local_time' });
  });
});
