import { Router } from 'express';
import { z } from 'zod';
import {
  activatePhaseTwo,
  claimMission,
  getBoard,
  linkDaily,
  rerollSlot,
  saveFutureNote,
  selectMission,
  submitEvidence,
  triggerSpecialStrike,
  type ClaimResult,
  type FutureNoteUpdate,
  type MissionSlotKey,
  type SerializedBoard,
} from './board-store.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';

const router = Router({ mergeParams: true });

const slotSchema = z.enum(['main', 'hunt', 'skill']);

const selectBodySchema = z.object({
  slot: slotSchema,
  mission_id: z.string().min(1),
});

const rerollBodySchema = z.object({
  slot: slotSchema,
});

const actionBodySchema = z.object({
  slot: slotSchema,
});

const phaseTwoBodySchema = z.object({
  confirm: z.boolean().optional(),
});

const claimBodySchema = z.object({
  slot: slotSchema,
});

const futureNoteBodySchema = z.object({
  friction_id: z.string().min(1),
  note: z.union([z.string().trim().max(280), z.literal(''), z.null(), z.undefined()]),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const board = getBoard(userId);
    res.json(board);
  }),
);

router.post(
  '/select',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot, mission_id } = selectBodySchema.parse(req.body);
    const board = selectMission(userId, slot as MissionSlotKey, mission_id);
    res.json(board);
  }),
);

router.post(
  '/reroll',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot } = rerollBodySchema.parse(req.body);
    const board = rerollSlot(userId, slot as MissionSlotKey);
    res.json(board);
  }),
);

router.post(
  '/link-daily',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot } = actionBodySchema.parse(req.body);
    const board = linkDaily(userId, slot as MissionSlotKey);
    res.json(board);
  }),
);

router.post(
  '/special-strike',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot } = actionBodySchema.parse(req.body);
    const board = triggerSpecialStrike(userId, slot as MissionSlotKey);
    res.json(board);
  }),
);

router.post(
  '/submit-evidence',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot } = actionBodySchema.parse(req.body);
    const board = submitEvidence(userId, slot as MissionSlotKey);
    res.json(board);
  }),
);

router.post(
  '/phase2',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    phaseTwoBodySchema.parse(req.body ?? {});
    const board = activatePhaseTwo(userId);
    res.json(board);
  }),
);

router.post(
  '/claim',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { slot } = claimBodySchema.parse(req.body);
    const result: ClaimResult = claimMission(userId, slot as MissionSlotKey);
    res.json(result);
  }),
);

router.post(
  '/future-note',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!userId) {
      throw new HttpError(400, 'invalid_user', 'User id is required');
    }

    const { friction_id, note } = futureNoteBodySchema.parse(req.body);
    const payload: FutureNoteUpdate = saveFutureNote(userId, friction_id, note ?? null);
    res.json(payload);
  }),
);

export default router;
export type { SerializedBoard };
