import process from 'node:process';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to create a database pool');
}

const shouldUseSsl = databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}
