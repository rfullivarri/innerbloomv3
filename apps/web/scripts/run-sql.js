#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { Pool, neonConfig } from '@neondatabase/serverless';

function ensureDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error('DATABASE_URL is required to run SQL files');
    process.exit(1);
  }
  try {
    const u = new URL(rawUrl);
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    return u.toString();
  } catch (e) {
    console.error('DATABASE_URL is not a valid URL', e);
    process.exit(1);
  }
}

// **IMPORTANT**: hard-point to the API SQL folder regardless of CWD
const SQL_DIR = resolve(process.cwd(), '../api/sql');

function listSqlFiles() {
  return readdirSync(SQL_DIR).filter(f => f.endsWith('.sql')).sort()
    .map(f => join(SQL_DIR, f));
}

function isAlreadyExistsError(err) {
  return typeof err?.message === 'string' &&
    /already exists|duplicate key|DuplicateObject/i.test(err.message);
}

async function run() {
  const databaseUrl = ensureDatabaseUrl();
  neonConfig.fetchConnectionCache = true;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    for (const file of listSqlFiles()) {
      const name = basename(file);
      const sql = readFileSync(file, 'utf8');
      console.log(`\n→ Running ${name}`);
      try {
        await pool.query(sql);
        console.log(`✓ Applied ${name}`);
      } catch (e) {
        if (isAlreadyExistsError(e)) {
          console.warn(`⚠️  Skipped ${name}: ${e.message}`);
        } else {
          console.error(`✖ Failed ${name}`);
          throw e;
        }
      }
    }
    await pool.end();
    console.log('\nAll done!');
  } catch (e) {
    console.error('SQL runner stopped because of an error.', e);
    try { await pool.end(); } catch {}
    process.exit(1);
  }
}

run();
