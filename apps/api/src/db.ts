import { AsyncLocalStorage } from 'node:async_hooks';
import process from 'node:process';
import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const databaseUrl = process.env.DATABASE_URL;
const dbDebugEnabled = process.env.DB_DEBUG === 'true';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to create a database pool');
}

const shouldUseSsl = databaseUrl.includes('sslmode=require');
const skipDbReady = process.env.SKIP_DB_READY === 'true';

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

const dbContext = new AsyncLocalStorage<string>();

function getQueryText(query: string | QueryConfig): string {
  if (typeof query === 'string') {
    return query;
  }
  if (typeof query.text === 'string') {
    return query.text;
  }
  return '[unknown query text]';
}

function getDbContext(): string {
  return dbContext.getStore() ?? 'unknown';
}

export function runWithDbContext<T>(context: string, callback: () => T): T {
  if (!dbDebugEnabled) {
    return callback();
  }
  return dbContext.run(context, callback);
}

if (dbDebugEnabled) {
  // WARN: The pool is created at module load and keeps at least one connection open for the
  // lifetime of the process, which can prevent Neon from suspending compute while the server
  // stays up even without user traffic.
  console.info('[db-debug] Creating global Postgres pool (keeps one connection open)');
}

export const db = drizzle(pool);

const originalQuery = pool.query.bind(pool);

pool.query = (async (...args: Parameters<typeof originalQuery>) => {
  if (dbDebugEnabled) {
    const [textOrConfig, values] = args as unknown as [string | QueryConfig, readonly unknown[] | undefined];
    const text = getQueryText(textOrConfig as string | QueryConfig);
    const resolvedValues =
      Array.isArray(values) && values.length > 0
        ? values
        : (typeof textOrConfig === 'object' && Array.isArray((textOrConfig as QueryConfig).values)
            ? (textOrConfig as QueryConfig).values
            : undefined);
    const previewText = text.replace(/\s+/g, ' ').trim();
    console.info('[db-debug] query', {
      context: getDbContext(),
      text: previewText.length > 180 ? `${previewText.slice(0, 180)}…` : previewText,
      values: resolvedValues,
    });
  }
  return originalQuery(...args);
}) as typeof pool.query;

pool.on('connect', (client: PoolClient) => {
  if (dbDebugEnabled) {
    console.info('[db-debug] new connection acquired', { context: getDbContext() });
  }
  client
    .query('SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED')
    .catch((error: unknown) => {
      console.error('Failed to enforce READ COMMITTED isolation level', error);
    });
});

export const dbReady = skipDbReady
  ? Promise.resolve()
  : pool
      .query('select 1')
      .then(() => {
        console.log('Database connection established');
      })
      .catch((error: unknown) => {
        console.error('Database connection failed during startup', error);
        throw error;
      });

export async function withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
