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
    const response = await updateModerationConfig(req.user.id, type, body);
    res.json(response);
  }),
);

export default router;
