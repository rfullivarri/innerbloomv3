// #REMOVE_ME_DEBUG_BYPASS
import type { Request, Response } from 'express';
import { Router } from 'express';
import process from 'node:process';
import { runTaskGeneration, type TaskgenSource, type Mode } from '../lib/taskgen/runner.js';

const router = Router();
const MODE_VALUES = new Set<Mode>(['low', 'chill', 'flow', 'evolve']);
const SOURCE_VALUES = new Set<TaskgenSource>(['snapshot', 'mock', 'static']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') {
    return fallback;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseSeed(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function sendError(res: Response, status: number, errors: string[]): Response {
  return res.status(status).json({ status: 'error', errors, meta: { schema_version: 'v1' } });
}

router.get('/_debug/taskgen', async (req: Request, res: Response) => {
  if (process.env.ENABLE_TASKGEN_TRIGGER !== 'true') {
    return sendError(res, 404, ['Task generation trigger is disabled']);
  }

  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 403, ['Task generation trigger is not available in production']);
  }

  const adminToken = process.env.ADMIN_TRIGGER_TOKEN;
  if (!adminToken) {
    return sendError(res, 403, ['ADMIN_TRIGGER_TOKEN is not configured']);
  }

  const providedToken = req.header('x-admin-token');
  if (providedToken !== adminToken) {
    return sendError(res, 401, ['Invalid admin token']);
  }

  const rawUserId = Array.isArray(req.query.user_id) ? req.query.user_id[0] : req.query.user_id;
  if (typeof rawUserId !== 'string' || !UUID_REGEX.test(rawUserId)) {
    return sendError(res, 400, ['user_id must be a valid UUID']);
  }

  const rawMode = Array.isArray(req.query.mode) ? req.query.mode[0] : req.query.mode;
  const mode =
    typeof rawMode === 'string' && MODE_VALUES.has(rawMode.toLowerCase() as Mode)
      ? (rawMode.toLowerCase() as Mode)
      : 'flow';

  const rawSource = Array.isArray(req.query.source) ? req.query.source[0] : req.query.source;
  const source =
    typeof rawSource === 'string' && SOURCE_VALUES.has(rawSource.toLowerCase() as TaskgenSource)
      ? (rawSource.toLowerCase() as TaskgenSource)
      : 'mock';

  const seed = parseSeed(Array.isArray(req.query.seed) ? req.query.seed[0] : req.query.seed);
  const dryRun = parseBoolean(Array.isArray(req.query.dry_run) ? req.query.dry_run[0] : req.query.dry_run, false);

  try {
    const result = await runTaskGeneration({
      userId: rawUserId,
      mode,
      source,
      dryRun,
      seed,
    });

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendError(res, 500, [message]);
  }
});

export default router;
