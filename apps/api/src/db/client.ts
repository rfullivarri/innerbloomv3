import process from 'node:process';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const databaseUrl = (() => {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error('DATABASE_URL is required to start the database client');
  }

  const parsed = new URL(rawUrl);
  if (!parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  return parsed.toString();
})();

neonConfig.fetchConnectionCache = true;

export const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export const dbReady = sql`select 1`
  .then(() => {
    console.log('db ready');
  })
  .catch((error) => {
    console.error('Database connection failed during startup', error);
    throw error;
  });
