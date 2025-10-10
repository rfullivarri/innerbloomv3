import process from 'node:process';
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const tablesQuery = `
  SELECT table_name, table_type
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

const columnsQuery = `
  SELECT table_name, column_name, data_type, is_nullable, column_default, ordinal_position
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`;

// Views block:
// - We rely on information_schema.views to list view names available in the public schema.
// - view_definition exposes the SQL that defines each view for quick inspection and debugging.
const viewsQuery = `
  SELECT table_name AS view_name, view_definition
  FROM information_schema.views
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

// Indexes block:
// - pg_class and pg_index let us relate indexes with their parent tables inside the public schema.
// - pg_get_indexdef(i.oid) renders the CREATE INDEX statement exactly as stored in Postgres.
const indexesQuery = `
  SELECT
    t.relname AS table_name,
    i.relname AS index_name,
    pg_get_indexdef(i.oid) AS index_definition
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY t.relname, i.relname
`;

// Foreign keys block:
// - table_constraints narrows down the FK constraints present in the public schema.
// - key_column_usage and constraint_column_usage reveal the source and target columns respectively.
const foreignKeysQuery = `
  SELECT
    tc.constraint_name,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    kcu.ordinal_position
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
`;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

router.get('/_admin/db-snapshot', async (_req, res, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DB_SNAPSHOT !== 'true') {
    return res.status(403).json({ error: 'disabled' });
  }

  try {
    const [tablesResult, columnsResult, viewsResult, indexesResult, foreignKeysResult] =
      await Promise.all([
        pool.query(tablesQuery),
        pool.query(columnsQuery),
        pool.query(viewsQuery),
        pool.query(indexesQuery),
        pool.query(foreignKeysQuery),
      ]);

    const baseTables = tablesResult.rows.map((row) => row.table_name as string);

    const samples: Record<string, unknown[]> = {};

    for (const tableName of baseTables) {
      const sampleQuery = `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 50`;
      const sampleResult = await pool.query(sampleQuery);
      samples[tableName] = sampleResult.rows;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      schema: {
        tables: tablesResult.rows,
        columns: columnsResult.rows,
        views: viewsResult.rows,
        indexes: indexesResult.rows,
        foreign_keys: foreignKeysResult.rows,
      },
      samples,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
