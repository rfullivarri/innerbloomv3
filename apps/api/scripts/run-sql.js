#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { neon, neonConfig } from '@neondatabase/serverless';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const sqlDir = resolve(currentDir, '../sql');

function ensureDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    console.error('DATABASE_URL is required to run SQL files');
    process.exit(1);
  }

  try {
    const parsed = new URL(rawUrl);
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    return parsed.toString();
  } catch (error) {
    console.error('DATABASE_URL is not a valid URL', error);
    process.exit(1);
  }
}

const databaseUrl = ensureDatabaseUrl();

neonConfig.fetchConnectionCache = true;
const client = neon(databaseUrl);

const [, , maybeFile] = process.argv;

function isAlreadyExistsError(error) {
  return typeof error?.message === 'string'
    ? /already exists|duplicate key|DuplicateObject/i.test(error.message)
    : false;
}

function listSqlFiles() {
  if (maybeFile) {
    return [resolve(process.cwd(), maybeFile)];
  }

  return readdirSync(sqlDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => join(sqlDir, file));
}

async function runFile(filePath) {
  const fileName = basename(filePath);
  const sql = readFileSync(filePath, 'utf8');

  console.log(`\n→ Running ${fileName}`);

  try {
    await client.unsafe(sql);
    console.log(`✓ Applied ${fileName}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.warn(`⚠️  Skipped ${fileName}: ${error.message}`);
      return;
    }

    console.error(`✖ Failed ${fileName}`);
    throw error;
  }
}

(async () => {
  try {
    const files = listSqlFiles();

    for (const file of files) {
      await runFile(file);
    }

    console.log('\nAll done!');
  } catch (error) {
    console.error('SQL runner stopped because of an error.', error);
    process.exit(1);
  }
})();
