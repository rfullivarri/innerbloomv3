import { AsyncLocalStorage } from 'node:async_hooks';
import process from 'node:process';
import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const databaseUrl = process.env.DATABASE_URL;
const dbDebugEnabled = process.env.DB_DEBUG === 'true';
const defaultPoolIdleMs = 240_000;
const parsedIdleTimeout = Number.parseInt(process.env.DB_POOL_IDLE_MS ?? String(defaultPoolIdleMs), 10);
const poolIdleTimeoutMs = Number.isNaN(parsedIdleTimeout) ? defaultPoolIdleMs : parsedIdleTimeout;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to create a database pool');
}

const shouldUseSsl = databaseUrl.includes('sslmode=require');
const skipDbReady = process.env.SKIP_DB_READY === 'true';

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let poolGeneration = 0;

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

function resetIdleTimer(currentGeneration: number): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(async () => {
    if (currentGeneration !== poolGeneration) {
      return;
    }

    const currentPool = pool;
    pool = null;
    dbInstance = null;
    idleTimer = null;

    if (!currentPool) {
      return;
    }

    try {
      await currentPool.end();
      if (dbDebugEnabled) {
        console.info('[db-debug] Idle pool closed', { generation: currentGeneration });
      }
    } catch (error) {
      console.error('Failed to close idle pool', error);
    }
  }, poolIdleTimeoutMs);
}

function wireLogging(instance: Pool, currentGeneration: number): Pool {
  const originalQuery = instance.query.bind(instance);

  instance.query = (async (...args: Parameters<typeof originalQuery>) => {
    if (dbDebugEnabled) {
      const [textOrConfig, values] = args;
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

    try {
      return await originalQuery(...args);
    } finally {
      resetIdleTimer(currentGeneration);
    }
  }) as typeof instance.query;

  instance.on('connect', (client: PoolClient) => {
    if (dbDebugEnabled) {
      console.info('[db-debug] new connection acquired', {
        context: getDbContext(),
        generation: currentGeneration,
      });
    }
    client
      .query('SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED')
      .catch((error: unknown) => {
        console.error('Failed to enforce READ COMMITTED isolation level', error);
      });
  });

  resetIdleTimer(currentGeneration);

  return instance;
}

function createPool(): Pool {
  poolGeneration += 1;

  if (dbDebugEnabled) {
    console.info('[db-debug] Creating Postgres pool', { generation: poolGeneration });
  }

  const instance = new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    idleTimeoutMillis: poolIdleTimeoutMs,
  });

  pool = wireLogging(instance, poolGeneration);
  dbInstance = drizzle(pool);

  return pool;
}

export function getPool(): Pool {
  return pool ?? createPool();
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const instance = getPool();
    const value = instance[prop as keyof Pool];

    if (typeof value === 'function') {
      return (...args: unknown[]) => (value as (...args: unknown[]) => unknown).apply(instance, args);
    }

    return value;
  },
});

export function getPoolIfInitialized(): Pool | null {
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool());
  }

  return dbInstance;
}

export const dbReady = skipDbReady
  ? Promise.resolve()
  : getPool()
      .query('select 1')
      .then(() => {
        console.log('Database connection established');
      })
      .catch((error: unknown) => {
        console.error('Database connection failed during startup', error);
        throw error;
      });

export async function withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;
  dbInstance = null;

  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  await currentPool.end();

  if (dbDebugEnabled) {
    console.info('[db-debug] Pool closed on demand');
  }
}

export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
