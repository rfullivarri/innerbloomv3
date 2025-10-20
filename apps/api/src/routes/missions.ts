import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { parseWithValidation } from '../lib/validation.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import {
  getMissionBoard,
  claimMissionReward,
  linkDailyToHuntMission,
  registerBossPhase2,
  rerollMissionSlot,
  runFortnightlyBossMaintenance,
  runWeeklyAutoSelection,
  selectMission,
} from '../services/missionsV2Service.js';
import { MISSION_SLOT_KEYS, type MissionSlotKey } from '../services/missionsV2Types.js';

const router = Router();

const slotEnum = z.enum(MISSION_SLOT_KEYS);

const selectBodySchema = z.object({
  slot: slotEnum,
  missionId: z.string().min(1),
});

const rerollBodySchema = z.object({
  slot: slotEnum,
});

const linkDailyBodySchema = z.object({
  mission_id: z.string().min(1),
  task_id: z.string().uuid({ message: 'task_id must be a valid UUID' }),
});

const phase2BodySchema = z.object({
  mission_id: z.string().min(1),
  proof: z.string().min(8, 'Proof must contain details about the special hit'),
});

const heartbeatBodySchema = z.object({
  missionId: z.string().min(1),
});

const CLAIM_SOURCE_HEADER = 'x-missions-claim-source';
const CLAIM_ALLOWED_PATH = '/dashboard-v3/missions-v2';

function normalizeError(error: unknown, message: string, status = 400): never {
  if (error instanceof HttpError) {
    throw error;
  }

  throw new HttpError(status, 'invalid_request', message);
}

router.get(
  '/missions/board',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const board = await getMissionBoard(user.id);
    res.json(board);
  }),
);

router.post(
  '/missions/select',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { slot, missionId } = parseWithValidation(selectBodySchema, req.body, 'Invalid select payload');

    try {
      const board = await selectMission(user.id, slot as MissionSlotKey, missionId);
      res.json(board);
    } catch (error) {
      normalizeError(error, 'Unable to select mission');
    }
  }),
);

router.post(
  '/missions/reroll',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { slot } = parseWithValidation(rerollBodySchema, req.body, 'Invalid reroll payload');

    try {
      const board = await rerollMissionSlot(user.id, slot as MissionSlotKey);
      res.json(board);
    } catch (error) {
      normalizeError(error, 'Unable to reroll slot');
    }
  }),
);

router.post(
  '/missions/link-daily',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { missionId, taskId } = parseWithValidation(linkDailyBodySchema, req.body, 'Invalid link payload');

    try {
      const result = await linkDailyToHuntMission(user.id, missionId, taskId);
      res.json(result);
    } catch (error) {
      normalizeError(error, 'Unable to link daily task to mission');
    }
  }),
);

router.post(
  '/boss/phase2',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const parsed = parseWithValidation(phase2BodySchema, req.body, 'Invalid boss payload');

    try {
      const boss = await registerBossPhase2(user.id, {
        missionId: parsed.mission_id,
        proof: parsed.proof,
      });
      res.json(boss);
    } catch (error) {
      normalizeError(error, 'Unable to register boss phase 2');
    }
  }),
);

router.post(
  '/missions/:id/claim',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const missionId = z.string().min(1).parse(req.params.id);

    const claimSource = req.get(CLAIM_SOURCE_HEADER) ?? req.get('referer') ?? '';
    const claimAllowed =
      typeof claimSource === 'string' && claimSource.toLowerCase().includes(CLAIM_ALLOWED_PATH.toLowerCase());

    if (!claimAllowed) {
      const board = await getMissionBoard(user.id, { claimAccess: 'blocked' });
      res.json({
        board,
        rewards: { xp: 0, currency: 0, items: [] },
      });
      return;
    }

    try {
      const result = await claimMissionReward(user.id, missionId);
      res.json(result);
    } catch (error) {
      normalizeError(error, 'Unable to claim mission reward');
    }
  }),
);

router.post(
  '/missions/auto/weekly',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const board = await runWeeklyAutoSelection(user.id);
    res.json(board);
  }),
);

router.post(
  '/missions/auto/boss',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const board = await runFortnightlyBossMaintenance(user.id);
    res.json(board);
  }),
);

export default router;
