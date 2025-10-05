const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const resolvedSqlDir = process.env.SQL_DIR
  ? path.resolve(process.cwd(), process.env.SQL_DIR)
  : path.resolve(baseDir, '../sql');

console.log('process.cwd():', process.cwd());
console.log('__dirname:', __dirname);
console.log('Resolved SQL_DIR:', resolvedSqlDir);

try {
  const files = fs
    .readdirSync(resolvedSqlDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  console.log('SQL files:');
  for (const file of files) {
    console.log(`  - ${file}`);
  }

  if (files.length === 0) {
    console.log('  (none found)');
  }
} catch (error) {
  console.warn(`Could not read SQL directory: ${error.message}`);
}
