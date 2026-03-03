import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { parseWithValidation } from '../lib/validation.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { requireActiveSubscription } from '../middlewares/require-active-subscription.js';
import {
  getModerationState,
  TRACKER_TYPES,
  updateModerationConfig,
  updateModerationStatus,
  type TrackerType,
} from '../services/moderationService.js';

const router = Router();

const trackerTypeSchema = z.enum(TRACKER_TYPES as [TrackerType, ...TrackerType[]]);

const statusBodySchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  status: z.enum(['on_track', 'off_track', 'not_logged']),
});


const moderationDebugEnabled =
  process.env.NODE_ENV !== 'production' || String(process.env.DEBUG_MODERATION ?? 'false').toLowerCase() === 'true';

function logModerationRoute(message: string, payload?: unknown) {
  if (!moderationDebugEnabled) {
    return;
  }

  if (payload === undefined) {
    console.info(`[moderation-route] ${message}`);
    return;
  }

  console.info(`[moderation-route] ${message}`, payload);
}

const configBodySchema = z
  .object({
    isEnabled: z.boolean().optional(),
    isPaused: z.boolean().optional(),
    notLoggedToleranceDays: z.coerce.number().int().min(0).max(14).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one config field is required');

router.get(
  '/moderation',
  authMiddleware,
  requireActiveSubscription,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const response = await getModerationState(req.user.id);
    logModerationRoute('GET /api/moderation success', { userId: req.user.id, trackers: response.trackers });
    res.json(response);
  }),
);

router.put(
  '/moderation/:type/status',
  authMiddleware,
  requireActiveSubscription,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { type } = parseWithValidation(z.object({ type: trackerTypeSchema }), req.params);
    const body = parseWithValidation(statusBodySchema, req.body);
    const response = await updateModerationStatus(req.user.id, type, body);
    res.json(response);
  }),
);

router.put(
  '/moderation/:type/config',
  authMiddleware,
  requireActiveSubscription,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { type } = parseWithValidation(z.object({ type: trackerTypeSchema }), req.params);
    const body = parseWithValidation(configBodySchema, req.body);
    logModerationRoute(`PUT /api/moderation/${type}/config request`, { userId: req.user.id, body });
    const response = await updateModerationConfig(req.user.id, type, body);
    logModerationRoute(`PUT /api/moderation/${type}/config success`, { userId: req.user.id, trackers: response.trackers });
    res.json(response);
  }),
);

export default router;
