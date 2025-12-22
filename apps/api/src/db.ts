import { AsyncLocalStorage } from 'node:async_hooks';
import process from 'node:process';
import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const databaseUrl = process.env.DATABASE_URL;
const dbDebugEnabled = process.env.DB_DEBUG === 'true';
const parsedPoolIdleTimeoutMs = Number.parseInt(process.env.DB_POOL_IDLE_MS ?? `${3 * 60 * 1000}`, 10);
const poolIdleTimeoutMs = Number.isFinite(parsedPoolIdleTimeoutMs) ? parsedPoolIdleTimeoutMs : 3 * 60 * 1000;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to create a database pool');
}

const shouldUseSsl = databaseUrl.includes('sslmode=require');
const skipDbReady = process.env.SKIP_DB_READY === 'true';

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

let activePool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;
let poolIdleTimer: NodeJS.Timeout | null = null;

function resetPoolIdleTimer(poolToWatch: Pool): void {
  if (!Number.isFinite(poolIdleTimeoutMs) || poolIdleTimeoutMs <= 0) {
    return;
  }

  if (poolIdleTimer) {
    clearTimeout(poolIdleTimer);
  }

  poolIdleTimer = setTimeout(async () => {
    if (activePool !== poolToWatch) {
      return;
    }

    if (dbDebugEnabled) {
      console.info('[db-debug] idle timeout reached, closing Postgres pool');
    }

    try {
      await poolToWatch.end();
    } catch (error) {
      console.error('Failed to close Postgres pool after idle timeout', error);
    } finally {
      if (activePool === poolToWatch) {
        activePool = null;
      }
      dbInstance = null;
      poolIdleTimer = null;
    }
  }, poolIdleTimeoutMs);

  poolIdleTimer.unref?.();
}

function createPool(): Pool {
  if (dbDebugEnabled) {
    console.info('[db-debug] Creating Postgres pool lazily (will auto-close on idle)');
  }

  const createdPool = new Pool({
    connectionString: databaseUrl,
    idleTimeoutMillis: poolIdleTimeoutMs,
    ssl: shouldUseSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });

  const originalConnect = createdPool.connect.bind(createdPool);

  createdPool.connect = (async (...args: Parameters<typeof originalConnect>) => {
    resetPoolIdleTimer(createdPool);
    return originalConnect(...args);
  }) as typeof createdPool.connect;

  const originalQuery = createdPool.query.bind(createdPool);

  createdPool.query = (async (...args: Parameters<typeof originalQuery>) => {
    resetPoolIdleTimer(createdPool);

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

    return originalQuery(...args);
  }) as typeof createdPool.query;

  createdPool.on('connect', (client: PoolClient) => {
    if (dbDebugEnabled) {
      console.info('[db-debug] new connection acquired', { context: getDbContext() });
    }
    client
      .query('SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED')
      .catch((error: unknown) => {
        console.error('Failed to enforce READ COMMITTED isolation level', error);
      });
  });

  resetPoolIdleTimer(createdPool);

  return createdPool;
}

export function getPool(): Pool {
  if (!activePool) {
    activePool = createPool();
    dbInstance = drizzle(activePool);
  }

  return activePool;
}

export const poolProxy: Pool = new Proxy({} as Pool, {
  get(_target, propertyKey) {
    const currentPool = getPool();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const value = (currentPool as any)[propertyKey];

    if (typeof value === 'function') {
      return value.bind(currentPool);
    }

    return value;
  },
});

export { poolProxy as pool };

export function getDb(): ReturnType<typeof drizzle> {
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

export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;

export async function endPool(): Promise<void> {
  if (!activePool) {
    return;
  }

  const poolToClose = activePool;
  activePool = null;
  dbInstance = null;

  if (poolIdleTimer) {
    clearTimeout(poolIdleTimer);
    poolIdleTimer = null;
  }

  await poolToClose.end();
}

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, propertyKey) {
    const currentDb = getDb();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const value = (currentDb as any)[propertyKey];

    if (typeof value === 'function') {
      return value.bind(currentDb);
    }

    return value;
  },
});
