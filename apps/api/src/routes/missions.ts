import { Router } from 'express';
import { z } from 'zod';
import { FEATURE_MISSIONS_V2 } from '../config/feature-flags.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { parseWithValidation } from '../lib/validation.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import {
  getMissionBoard,
  claimMissionReward,
  linkDailyToHuntMission,
  registerBossPhase2,
  registerMissionHeartbeat,
  rerollMissionSlot,
  runFortnightlyBossMaintenance,
  runWeeklyAutoSelection,
  selectMission,
} from '../services/missionsV2Service.js';
import { MISSION_SLOT_KEYS, type MissionSlotKey } from '../services/missionsV2Types.js';
import {
  createMissionsV2BoardResponse,
  createMissionsV2ClaimResponse,
  createMissionsV2HeartbeatResponse,
  createMissionsV2MarketResponse,
} from '../modules/missions-v2/missions-v2.stubs.js';

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

const heartbeatBodySchema = z
  .object({
    missionId: z.string().min(1, 'Invalid heartbeat payload').optional(),
    mission_id: z.string().min(1, 'Invalid heartbeat payload').optional(),
  })
  .refine((value) => Boolean(value.missionId ?? value.mission_id), {
    message: 'Invalid heartbeat payload',
  });

const activateBodySchema = z.object({
  slot: slotEnum,
  proposal_id: z.string().min(1),
});

const abandonBodySchema = z.object({
  slot: slotEnum,
  mission_id: z.string().min(1),
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

    if (FEATURE_MISSIONS_V2) {
      res.json(createMissionsV2BoardResponse());
      return;
    }

    const board = await getMissionBoard(user.id);
    res.json(board);
  }),
);

router.get(
  '/missions/market',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    if (!FEATURE_MISSIONS_V2) {
      throw new HttpError(404, 'not_found', 'Missions v2 is disabled');
    }

    res.json(createMissionsV2MarketResponse());
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

    const { mission_id, task_id } = parseWithValidation(
      linkDailyBodySchema,
      req.body,
      'Invalid link payload',
    );

    try {
      const result = await linkDailyToHuntMission(user.id, mission_id, task_id);
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
  '/missions/heartbeat',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const parsed = parseWithValidation(heartbeatBodySchema, req.body, 'Invalid heartbeat payload');
    const missionId = parsed.missionId ?? parsed.mission_id;

    if (!missionId) {
      throw new HttpError(400, 'invalid_request', 'Invalid heartbeat payload');
    }

    if (FEATURE_MISSIONS_V2) {
      res.json(createMissionsV2HeartbeatResponse());
      return;
    }

    try {
      const payload = await registerMissionHeartbeat(user.id, missionId);
      res.json(payload);
    } catch (error) {
      normalizeError(error, 'Unable to register mission heartbeat');
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
      if (FEATURE_MISSIONS_V2) {
        res.json({
          board: createMissionsV2BoardResponse(),
          rewards: { xp: 0, currency: 0, items: [] },
        });
        return;
      }

      const board = await getMissionBoard(user.id, { claimAccess: 'blocked' });
      res.json({
        board,
        rewards: { xp: 0, currency: 0, items: [] },
      });
      return;
    }

    if (FEATURE_MISSIONS_V2) {
      res.json(createMissionsV2ClaimResponse());
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
  '/missions/activate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    if (!FEATURE_MISSIONS_V2) {
      throw new HttpError(404, 'not_found', 'Missions v2 is disabled');
    }

    parseWithValidation(activateBodySchema, req.body, 'Invalid activate payload');
    res.json(createMissionsV2BoardResponse());
  }),
);

router.post(
  '/missions/abandon',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    if (!FEATURE_MISSIONS_V2) {
      throw new HttpError(404, 'not_found', 'Missions v2 is disabled');
    }

    parseWithValidation(abandonBodySchema, req.body, 'Invalid abandon payload');
    res.json(createMissionsV2BoardResponse());
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
