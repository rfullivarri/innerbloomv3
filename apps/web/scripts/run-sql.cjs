const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

function ensureSslModeRequire(url) {
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  if (url.includes('sslmode=')) {
    return url.replace(/sslmode=[^&]+/i, 'sslmode=require');
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}sslmode=require`;
}

function resolveSqlDir() {
  const baseDir = __dirname;
  return process.env.SQL_DIR
    ? path.resolve(process.cwd(), process.env.SQL_DIR)
    : path.resolve(baseDir, '../sql');
}

async function main() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  const connectionString = ensureSslModeRequire(rawDatabaseUrl);
  const sqlDir = resolveSqlDir();

  if (!fs.existsSync(sqlDir)) {
    throw new Error(`SQL directory not found: ${sqlDir}`);
  }

  const sqlFiles = fs
    .readdirSync(sqlDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    console.warn(`⚠️  No SQL files found in ${sqlDir}`);
    return;
  }

  console.log(`Using SQL directory: ${sqlDir}`);

  const pool = new Pool({ connectionString });

  try {
    for (const file of sqlFiles) {
      const fullPath = path.join(sqlDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      console.log(`→ Running ${file}`);

      try {
        await pool.query(sql);
        console.log(`  ✓ Applied ${file}`);
      } catch (error) {
        const message = error?.message || '';
        if (/already exists/i.test(message) || /duplicate/i.test(message)) {
          console.warn(`  ⚠️  Skipped ${file}: ${message}`);
          continue;
        }

        console.error(`  ✖ Failed ${file}: ${message}`);
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
