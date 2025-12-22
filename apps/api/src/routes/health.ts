import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { pool } from '../db.js';

const router = Router();
const parsedHealthCheckTimeout = Number.parseInt(process.env.DB_HEALTH_TIMEOUT_MS ?? '2000', 10);
const healthCheckTimeoutMs = Number.isNaN(parsedHealthCheckTimeout) ? 2000 : parsedHealthCheckTimeout;

async function checkDatabaseHealth(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Database health check exceeded ${healthCheckTimeoutMs}ms`)),
      healthCheckTimeoutMs,
    );
  });

  try {
    await Promise.race([pool.query('select 1'), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function mapDatabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to reach the database';
}

router.get(
  '/_health',
  asyncHandler(async (_req, res) => {
    try {
      await checkDatabaseHealth();
      res.json({ ok: true });
    } catch (error) {
      res.status(503).json({ code: 'database_unavailable', message: mapDatabaseError(error) });
    }
  }),
);

router.get(
  '/health/db',
  asyncHandler(async (_req, res) => {
    try {
      await checkDatabaseHealth();
      res.json({ ok: true });
    } catch (error) {
      const message = mapDatabaseError(error);
      res.status(500).json({ code: 'database_unavailable', message });
    }
  }),
);

export default router;
