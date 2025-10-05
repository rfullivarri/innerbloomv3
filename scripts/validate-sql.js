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
  isTransactionControlStatement,
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

(async () => {
  let client;
  let hasError = false;

  try {
    const files = resolveSqlFiles();
    client = await pool.connect();

    for (const filePath of files) {
      const fileName = basename(filePath);
      const sql = readFileSync(filePath, 'utf8');
      const statements = splitSqlStatements(sql);

      if (statements.length === 0) {
        console.log(`\n→ Skipping ${fileName} (no statements found)`);
        continue;
      }

      console.log(`\n→ Validating ${fileName}`);
      await client.query('BEGIN;');

      try {
        for (const statement of statements) {
          if (isTransactionControlStatement(statement.text)) {
            continue;
          }

          try {
            await client.query(statement.text);
          } catch (error) {
            const location = computeErrorLocation(statement, error.position);
            const message = typeof error?.message === 'string' ? error.message.trim() : 'Unknown error';
            const label = formatLocation(fileName, location);

            if (isIgnorableError(error)) {
              console.warn(`⚠️  Skipped ${label} → ${message}`);
              continue;
            }

            console.error(`✖ ${label} → ${message}`);
            console.error('Failing statement:\n', statement.text);
            hasError = true;
            throw error;
          }
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    }
  } catch (error) {
    if (!hasError) {
      console.error('SQL validation stopped because of an unexpected error.', error);
      hasError = true;
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.log('\nValidation complete – no SQL errors found.');
})();
