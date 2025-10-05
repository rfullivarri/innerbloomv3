#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { Pool, neonConfig } from '@neondatabase/serverless';
import {
  computeErrorLocation,
  ensureDatabaseUrl,
  isIgnorableError,
  splitSqlStatements,
} from './sql-utils.js';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const defaultSqlDir = resolve(currentDir, '../apps/api/sql');
const [, , maybeTarget] = process.argv;

function resolveSqlFiles() {
  if (maybeTarget) {
    const absoluteTarget = resolve(process.cwd(), maybeTarget);
    const stats = statSync(absoluteTarget);

    if (stats.isDirectory()) {
      return readdirSync(absoluteTarget)
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => join(absoluteTarget, file));
    }

    if (stats.isFile()) {
      if (!absoluteTarget.endsWith('.sql')) {
        console.error(`Target ${maybeTarget} is not an .sql file`);
        process.exit(1);
      }
      return [absoluteTarget];
    }

    console.error(`Target ${maybeTarget} is neither a file nor directory`);
    process.exit(1);
  }

  return readdirSync(defaultSqlDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => join(defaultSqlDir, file));
}

const databaseUrl = ensureDatabaseUrl();
neonConfig.fetchConnectionCache = true;
const pool = new Pool({ connectionString: databaseUrl });

function formatLocation(fileName, location) {
  if (!location) {
    return fileName;
  }
  return `${fileName}:${location.line}:${location.column}`;
}

async function runStatement(fileName, statement) {
  try {
    await pool.query(statement.text);
  } catch (error) {
    const location = computeErrorLocation(statement, error.position);
    const message = typeof error?.message === 'string' ? error.message.trim() : 'Unknown error';
    const locationLabel = formatLocation(fileName, location);

    if (isIgnorableError(error)) {
      console.warn(`⚠️  Skipped ${locationLabel} → ${message}`);
      return;
    }

    console.error(`✖ ${locationLabel} → ${message}`);
    console.error('Failing statement:\n', statement.text);
    throw error;
  }
}

async function runFile(filePath) {
  const fileName = basename(filePath);
  const sql = readFileSync(filePath, 'utf8');
  const statements = splitSqlStatements(sql);

  if (statements.length === 0) {
    console.log(`\n→ Skipping ${fileName} (no statements found)`);
    return;
  }

  console.log(`\n→ Running ${fileName}`);

  for (const statement of statements) {
    await runStatement(fileName, statement);
  }

  console.log(`✓ Applied ${fileName}`);
}

(async () => {
  try {
    const files = resolveSqlFiles();

    for (const file of files) {
      await runFile(file);
    }

    await pool.end();
    console.log('\nAll done!');
  } catch (error) {
    try {
      await pool.end();
    } catch (closeError) {
      console.error('Failed to close database pool cleanly.', closeError);
    }

    if (error?.code === 'ENOENT') {
      console.error('SQL runner could not locate one of the files:', error.path);
    }

    process.exit(1);
  }
})();
