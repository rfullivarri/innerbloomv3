import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to start the database client');
}

if (!databaseUrl.includes('sslmode=')) {
  console.warn('DATABASE_URL is missing sslmode requirement; Neon needs ?sslmode=require');
}

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
