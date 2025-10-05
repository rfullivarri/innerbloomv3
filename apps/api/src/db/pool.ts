import process from 'node:process';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

export default pool;
