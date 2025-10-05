import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDirectory = path.resolve(__dirname, '..', 'sql');

async function applyFile(fileName: string): Promise<void> {
  const fullPath = path.join(sqlDirectory, fileName);
  const sql = await readFile(fullPath, 'utf8');
  const trimmed = sql.trim();

  if (!trimmed) {
    console.log(`⚠ Skipped ${fileName} (empty file)`);
    return;
  }

  const client = await pool.connect();

  try {
    console.log(`→ Running ${fileName}`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✓ Applied ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // ignore rollback errors
    });
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✖ ${fileName} → ${message}`);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const entries = await readdir(sqlDirectory);
  const files = entries.filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    await applyFile(file);
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    await pool.end();
    process.exitCode = 1;
    if (error instanceof Error) {
      console.error(error.stack);
    }
  });
