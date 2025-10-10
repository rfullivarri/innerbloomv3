import process from 'node:process';
import { Pool } from 'pg';

const statements = [
  `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS emotions_logs_user_date_key
     ON emotions_logs (user_id, date);`,
  `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS daily_log_user_task_date_key
     ON daily_log (user_id, task_id, date);`,
  'DROP INDEX IF EXISTS ix_emotions_logs_user_date;',
  'DROP INDEX IF EXISTS ix_daily_log_user_task_date;',
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString });

  try {
    for (const statement of statements) {
      console.log(`Executing: ${statement.replace(/\s+/g, ' ').trim()}`);
      await pool.query(statement);
    }

    console.log('Daily Quest unique indexes created successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to create Daily Quest unique indexes', error);
  process.exitCode = 1;
});
