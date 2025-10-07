import process from 'node:process';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

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

export const db = drizzle(pool);

pool.on('connect', (client: PoolClient) => {
  client
    .query('SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED')
    .catch((error: unknown) => {
      console.error('Failed to enforce READ COMMITTED isolation level', error);
    });
});

export const dbReady = pool
  .query('select 1')
  .then(() => {
    console.log('Database connection established');
  })
  .catch((error: unknown) => {
    console.error('Database connection failed during startup', error);
    throw error;
  });

export async function withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
