import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

type TableRow = {
  table_catalog: string;
  table_schema: string;
  table_name: string;
  table_type: string;
  self_referencing_column_name: string | null;
  reference_generation: string | null;
  user_defined_type_catalog: string | null;
  user_defined_type_schema: string | null;
  user_defined_type_name: string | null;
  is_insertable_into: string;
  is_typed: string;
  commit_action: string | null;
};

type ColumnRow = {
  table_catalog: string;
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  column_default: string | null;
  is_nullable: string;
  data_type: string;
  character_maximum_length: number | null;
  character_octet_length: number | null;
  numeric_precision: number | null;
  numeric_precision_radix: number | null;
  numeric_scale: number | null;
  datetime_precision: number | null;
  interval_type: string | null;
  interval_precision: number | null;
  character_set_catalog: string | null;
  character_set_schema: string | null;
  character_set_name: string | null;
  collation_catalog: string | null;
  collation_schema: string | null;
  collation_name: string | null;
  domain_catalog: string | null;
  domain_schema: string | null;
  domain_name: string | null;
  udt_catalog: string;
  udt_schema: string;
  udt_name: string;
  scope_catalog: string | null;
  scope_schema: string | null;
  scope_name: string | null;
  maximum_cardinality: number | null;
  dtd_identifier: string;
  is_self_referencing: string;
  is_identity: string;
  identity_generation: string | null;
  identity_start: string | null;
  identity_increment: string | null;
  identity_maximum: string | null;
  identity_minimum: string | null;
  identity_cycle: string | null;
  is_generated: string;
  generation_expression: string | null;
  is_updatable: string;
};

type ForeignKeyRow = {
  constraint_name: string;
  table_schema: string;
  table_name: string;
  column_name: string;
  foreign_table_schema: string;
  foreign_table_name: string;
  foreign_column_name: string;
  update_rule: string;
  delete_rule: string;
};

type IndexRow = {
  schema_name: string;
  table_name: string;
  index_name: string;
  definition: string;
};

type ViewRow = {
  table_schema: string;
  table_name: string;
};

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function resolveSnapshotPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const directory = path.dirname(currentFile);
  return path.resolve(directory, '../db-snapshot.json');
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = new Client({ connectionString });

  await client.connect();

  try {
    const tablesResult = await client.query<TableRow>(
      `SELECT *
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const columnsResult = await client.query<ColumnRow>(
      `SELECT *
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    const foreignKeysResult = await client.query<ForeignKeyRow>(
      `SELECT
         tc.constraint_name,
         tc.table_schema,
         tc.table_name,
         kcu.column_name,
         ccu.table_schema AS foreign_table_schema,
         ccu.table_name AS foreign_table_name,
         ccu.column_name AS foreign_column_name,
         rc.update_rule,
         rc.delete_rule
       FROM information_schema.table_constraints AS tc
       JOIN information_schema.key_column_usage AS kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage AS ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
       JOIN information_schema.referential_constraints AS rc
         ON rc.constraint_name = tc.constraint_name
         AND rc.constraint_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'
       ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position`
    );

    const indexesResult = await client.query<IndexRow>(
      `SELECT schemaname AS schema_name,
              tablename AS table_name,
              indexname AS index_name,
              indexdef AS definition
       FROM pg_indexes
       WHERE schemaname = 'public'
       ORDER BY tablename, indexname`
    );

    const viewsResult = await client.query<ViewRow>(
      `SELECT table_schema, table_name
       FROM information_schema.views
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    const views = await Promise.all(
      viewsResult.rows.map(async (view) => {
        const definitionResult = await client.query<{ definition: string | null }>(
          `SELECT pg_get_viewdef(format('%I.%I', $1::text, $2::text)::regclass, true) AS definition`,
          [view.table_schema, view.table_name]
        );

        return {
          name: view.table_name,
          schema: view.table_schema,
          sql: definitionResult.rows[0]?.definition ?? null,
        };
      })
    );

    const samples: Record<string, unknown[]> = {};

    for (const table of tablesResult.rows) {
      const sql = `SELECT * FROM ${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)} LIMIT 50`;
      const result = await client.query(sql);
      samples[table.table_name] = result.rows;
    }

    const snapshot = {
      generated_at: new Date().toISOString(),
      schema: {
        tables: tablesResult.rows,
        columns: columnsResult.rows,
        foreign_keys: foreignKeysResult.rows,
        indexes: indexesResult.rows,
        views,
      },
      sample: samples,
    };

    const snapshotPath = resolveSnapshotPath();
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');

    console.log(`Database snapshot saved to ${snapshotPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.exitCode = 1;
  console.error('Failed to generate database snapshot');
  console.error(error);
});
