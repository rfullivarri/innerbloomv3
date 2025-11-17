import express from 'express';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunJob } = vi.hoisted(() => ({
  mockRunJob: vi.fn(),
}));

vi.mock('../services/dailyReminderJob.js', () => ({
  runDailyReminderJob: (...args: unknown[]) => mockRunJob(...args),
}));

describe('internal cron routes', () => {
  let app: express.Express;
  const originalSecret = process.env.CRON_SECRET;

  beforeAll(async () => {
    const { default: router } = await import('./internal.js');
    app = express().use(router);
  });

  beforeEach(() => {
    mockRunJob.mockReset();
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (typeof originalSecret === 'string') {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it('returns 503 when the cron secret is not configured', async () => {
    const response = await request(app).post('/internal/cron/daily-reminders');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ code: 'cron_secret_missing', message: 'CRON secret is not configured' });
    expect(mockRunJob).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid secret', async () => {
    process.env.CRON_SECRET = 'secret';
    const response = await request(app)
      .post('/internal/cron/daily-reminders')
      .set('X-CRON-SECRET', 'wrong');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'invalid_cron_secret', message: 'Invalid or missing cron secret' });
    expect(mockRunJob).not.toHaveBeenCalled();
  });

  it('runs the reminder job when the secret matches', async () => {
    process.env.CRON_SECRET = 'secret';
    mockRunJob.mockResolvedValueOnce({ attempted: 1, sent: 1, skipped: 0, errors: [] });

    const response = await request(app)
      .post('/internal/cron/daily-reminders')
      .set('X-CRON-SECRET', 'secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, attempted: 1, sent: 1, skipped: 0, errors: [] });
    expect(mockRunJob).toHaveBeenCalledTimes(1);
  });
});
