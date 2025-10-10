import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';

describe('daily quest unique indexes', () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE emotions_logs (
        user_id uuid NOT NULL,
        date date NOT NULL,
        emotion_id integer NOT NULL,
        notes text,
        created_at timestamptz NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE daily_log (
        user_id uuid NOT NULL,
        task_id uuid NOT NULL,
        date date NOT NULL,
        task_status integer NOT NULL,
        created_at timestamptz NOT NULL
      );
    `);
  });

  beforeEach(async () => {
    await pool.query('DROP INDEX IF EXISTS emotions_logs_user_date_key;');
    await pool.query('DROP INDEX IF EXISTS daily_log_user_task_date_key;');
    await pool.query('TRUNCATE emotions_logs CASCADE;');
    await pool.query('TRUNCATE daily_log CASCADE;');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('raises 23505 when inserting duplicates without ON CONFLICT after indexes exist', async () => {
    await pool.query(`
      INSERT INTO emotions_logs (user_id, date, emotion_id, created_at)
      VALUES ('00000000-0000-0000-0000-000000000001', '2024-11-21', 2, '2024-11-21T12:00:00Z');
    `);
    await pool.query(`
      INSERT INTO daily_log (user_id, task_id, date, task_status, created_at)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-0000000000aa',
        '2024-11-21',
        1,
        '2024-11-21T11:00:00Z'
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX emotions_logs_user_date_key ON emotions_logs (user_id, date);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX daily_log_user_task_date_key ON daily_log (user_id, task_id, date);
    `);

    const insertEmotion = pool.query(`
      INSERT INTO emotions_logs (user_id, date, emotion_id, created_at)
      VALUES ('00000000-0000-0000-0000-000000000001', '2024-11-21', 3, '2024-11-21T13:00:00Z');
    `);

    await expect(insertEmotion).rejects.toMatchObject({ code: '23505' });

    const insertTask = pool.query(`
      INSERT INTO daily_log (user_id, task_id, date, task_status, created_at)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-0000000000aa',
        '2024-11-21',
        1,
        '2024-11-21T12:30:00Z'
      );
    `);

    await expect(insertTask).rejects.toMatchObject({ code: '23505' });
  });
});
