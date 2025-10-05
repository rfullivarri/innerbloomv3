#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { neon, neonConfig } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required to run SQL files');
  process.exit(1);
}

neonConfig.fetchConnectionCache = true;

const client = neon(databaseUrl);

const [, , maybeFile] = process.argv;
const sqlDir = path.resolve(__dirname, '../sql');

/**
 * Check if an error is about already-existing structures so we can keep going.
 */
const isAlreadyExistsError = (error) => {
  if (!error || typeof error.message !== 'string') {
    return false;
  }

  return /already exists|duplicate key|DuplicateObject/i.test(error.message);
};

const listSqlFiles = () => {
  if (maybeFile) {
    return [path.resolve(process.cwd(), maybeFile)];
  }

  return fs
    .readdirSync(sqlDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => path.join(sqlDir, file));
};

const runFile = async (filePath) => {
  const fileName = path.basename(filePath);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`\n→ Running ${fileName}`);

  await client`BEGIN`;
  try {
    await client.unsafe(sql);
    await client`COMMIT`;
    console.log(`✓ Applied ${fileName}`);
  } catch (error) {
    await client`ROLLBACK`;

    if (isAlreadyExistsError(error)) {
      console.warn(`⚠️  Skipped ${fileName}: ${error.message}`);
      return;
    }

    console.error(`✖ Failed ${fileName}`);
    throw error;
  }
};

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
