import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasDatabaseConfig = Boolean(process.env.DATABASE_URL) && Boolean(process.env.TEST_USER_ID);

if (!hasDatabaseConfig) {
  console.warn('Skipping dashboard API integration tests. Set DATABASE_URL and TEST_USER_ID to enable them.');
}

const describeIfReady = hasDatabaseConfig ? describe : describe.skip;

describeIfReady('Dashboard endpoints', () => {
  const userId = process.env.TEST_USER_ID as string;
  let app!: Express;
  let dbPool!: Pool;

  beforeAll(async () => {
    const [{ default: loadedApp }, dbModule] = await Promise.all([
      import('../app.js'),
      import('../db.js'),
    ]);

    app = loadedApp;
    dbPool = dbModule.pool;

    await dbPool.query('select 1');
  });

  afterAll(async () => {
    await dbPool?.end();
  });

  it('returns active tasks', async () => {
    const response = await request(app)
      .get(`/users/${userId}/tasks`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tasks)).toBe(true);
    expect(typeof response.body.limit).toBe('number');
    expect(typeof response.body.offset).toBe('number');
  });

  it('returns daily xp series', async () => {
    const response = await request(app)
      .get(`/users/${userId}/xp/daily`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('from');
    expect(response.body).toHaveProperty('to');
    expect(Array.isArray(response.body.series)).toBe(true);
  });

  it('returns total xp', async () => {
    const response = await request(app)
      .get(`/users/${userId}/xp/total`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(typeof response.body.total_xp).toBe('number');
  });

  it('returns level', async () => {
    const response = await request(app)
      .get(`/users/${userId}/level`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(typeof response.body.level).toBe('number');
  });

  it('returns journey summary', async () => {
    const response = await request(app)
      .get(`/users/${userId}/journey`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('first_date_log');
    expect(typeof response.body.days_of_journey).toBe('number');
    expect(typeof response.body.quantity_daily_logs).toBe('number');
  });

  it('returns emotion logs', async () => {
    const response = await request(app)
      .get(`/users/${userId}/emotions`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('from');
    expect(response.body).toHaveProperty('to');
    expect(Array.isArray(response.body.emotions)).toBe(true);
  });

  it('returns user state summary', async () => {
    const response = await request(app)
      .get(`/users/${userId}/state`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('mode');
    expect(response.body).toHaveProperty('weekly_target');
    expect(response.body).toHaveProperty('pillars');
  });

  it('returns user state timeseries', async () => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 6);

    const format = (date: Date) => date.toISOString().slice(0, 10);

    const response = await request(app)
      .get(`/users/${userId}/state/timeseries`)
      .query({ from: format(from), to: format(to) })
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
