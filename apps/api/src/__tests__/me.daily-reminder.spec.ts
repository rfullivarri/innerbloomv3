import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VALIDATE_TIMEZONE_SQL } from '../lib/timezones.js';

const { mockQuery, mockVerifyToken, mockGetAuthService } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockGetAuthService: vi.fn(() => ({
    verifyToken: mockVerifyToken,
  })),
}));

vi.mock('../db.js', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
  dbReady: Promise.resolve(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: mockGetAuthService,
  createAuthRepository: vi.fn(() => undefined),
  createAuthService: vi.fn(() => undefined),
  resetAuthServiceCache: vi.fn(() => undefined),
}));

import app from '../app.js';

type ReminderRow = {
  user_daily_reminder_id: string;
  user_id: string;
  channel: string;
  status: string;
  timezone: string;
  local_time: string;
  last_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const verifiedUser = {
  id: 'user-id',
  clerkId: 'clerk_123',
  email: 'user@example.com',
  isNew: false,
};

describe('GET /api/me/daily-reminder', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetAuthService.mockClear();
    mockVerifyToken.mockResolvedValue(verifiedUser);
  });

  it('returns 401 when the authorization header is missing', async () => {
    const response = await request(app).get('/api/me/daily-reminder');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'unauthorized', message: 'Authentication required' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns the reminder when it exists', async () => {
    const reminder: ReminderRow = {
      user_daily_reminder_id: 'rem-1',
      user_id: verifiedUser.id,
      channel: 'email',
      status: 'active',
      timezone: 'America/Bogota',
      local_time: '08:30:00',
      last_sent_at: null,
      created_at: new Date('2024-12-01T00:00:00Z'),
      updated_at: new Date('2024-12-02T00:00:00Z'),
    };

    mockQuery.mockResolvedValueOnce({ rows: [reminder] });

    const response = await request(app).get('/api/me/daily-reminder').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_daily_reminder_id: 'rem-1',
      reminder_id: 'rem-1',
      channel: 'email',
      status: 'active',
      enabled: true,
      timezone: 'America/Bogota',
      timeZone: 'America/Bogota',
      time_zone: 'America/Bogota',
      local_time: '08:30:00',
      localTime: '08:30:00',
      last_sent_at: null,
      delivery_strategy: 'user_local_time',
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns a default payload when the reminder is missing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ timezone: 'Europe/Madrid' }] });

    const response = await request(app).get('/api/me/daily-reminder').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_daily_reminder_id: null,
      reminder_id: null,
      channel: 'email',
      status: 'paused',
      enabled: false,
      timezone: 'Europe/Madrid',
      timeZone: 'Europe/Madrid',
      time_zone: 'Europe/Madrid',
      local_time: '09:00:00',
      localTime: '09:00:00',
      last_sent_at: null,
      delivery_strategy: 'user_local_time',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT timezone'), [verifiedUser.id]);
  });
});

describe('PUT /api/me/daily-reminder', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetAuthService.mockClear();
    mockVerifyToken.mockResolvedValue(verifiedUser);
  });

  it('returns 401 when the authorization header is missing', async () => {
    const response = await request(app)
      .put('/api/me/daily-reminder')
      .send({ status: 'active', timezone: 'UTC', local_time: '09:00' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'unauthorized', message: 'Authentication required' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unknown timezones', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ status: 'active', timezone: 'Invalid/Zone', local_time: '09:00' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid_timezone', message: 'Unknown timezone' });
    expect(mockQuery).toHaveBeenCalledWith(VALIDATE_TIMEZONE_SQL, ['Invalid/Zone']);
  });

  it('creates a reminder when it does not exist', async () => {
    const created: ReminderRow = {
      user_daily_reminder_id: 'new-rem',
      user_id: verifiedUser.id,
      channel: 'email',
      status: 'paused',
      timezone: 'America/Bogota',
      local_time: '10:00:00',
      last_sent_at: null,
      created_at: new Date('2024-12-01T00:00:00Z'),
      updated_at: new Date('2024-12-01T00:00:00Z'),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [created] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ status: 'paused', timezone: 'America/Bogota', local_time: '10:00' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_daily_reminder_id: 'new-rem',
      reminder_id: 'new-rem',
      channel: 'email',
      status: 'paused',
      enabled: false,
      timezone: 'America/Bogota',
      timeZone: 'America/Bogota',
      time_zone: 'America/Bogota',
      local_time: '10:00:00',
      localTime: '10:00:00',
      last_sent_at: null,
      delivery_strategy: 'user_local_time',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(1, VALIDATE_TIMEZONE_SQL, ['America/Bogota']);
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM user_daily_reminders'), [
      verifiedUser.id,
      'email',
    ]);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE users'), expect.any(Array));
  });

  it('updates an existing reminder', async () => {
    const existing: ReminderRow = {
      user_daily_reminder_id: 'existing-rem',
      user_id: verifiedUser.id,
      channel: 'email',
      status: 'active',
      timezone: 'UTC',
      local_time: '09:00:00',
      last_sent_at: null,
      created_at: new Date('2024-12-01T00:00:00Z'),
      updated_at: new Date('2024-12-02T00:00:00Z'),
    };

    const updated: ReminderRow = {
      ...existing,
      status: 'active',
      timezone: 'America/New_York',
      local_time: '07:30:00',
      updated_at: new Date('2024-12-03T00:00:00Z'),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [updated] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app)
      .put('/api/me/daily-reminder')
      .set('Authorization', 'Bearer token')
      .send({ status: 'active', timezone: 'America/New_York', local_time: '07:30' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_daily_reminder_id: 'existing-rem',
      reminder_id: 'existing-rem',
      channel: 'email',
      status: 'active',
      enabled: true,
      timezone: 'America/New_York',
      timeZone: 'America/New_York',
      time_zone: 'America/New_York',
      local_time: '07:30:00',
      localTime: '07:30:00',
      last_sent_at: null,
      delivery_strategy: 'user_local_time',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(1, VALIDATE_TIMEZONE_SQL, ['America/New_York']);
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM user_daily_reminders'), [
      verifiedUser.id,
      'email',
    ]);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE users'), expect.any(Array));
  });
});
