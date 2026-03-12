import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { requireActiveSubscription } from '../middlewares/require-active-subscription.js';
import {
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  getGameModeUpgradeSuggestion,
} from '../services/gameModeUpgradeSuggestionService.js';
import { withClient } from '../db.js';
import { changeUserGameMode, resolveGameModeByCode } from '../services/userGameModeChangeService.js';

const router = Router();

router.get(
  '/game-mode/upgrade-suggestion',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const suggestion = await getGameModeUpgradeSuggestion(user.id);

    res.json(suggestion);
  }),
);

router.post(
  '/game-mode/upgrade-suggestion/accept',
  authMiddleware,
  requireActiveSubscription,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const suggestion = await acceptGameModeUpgradeSuggestion(user.id);
    const refreshedSuggestion = await getGameModeUpgradeSuggestion(user.id);

    res.json({ ok: true, suggestion: refreshedSuggestion, accepted_suggestion: suggestion });
  }),
);

router.post(
  '/game-mode/change',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const nextModeCode =
      typeof req.body?.mode === 'string' && req.body.mode.trim().length > 0
        ? req.body.mode.trim().toUpperCase()
        : null;

    if (!nextModeCode) {
      throw new HttpError(400, 'invalid_mode', 'Mode is required');
    }

    const updated = await withClient(async (client) => {
      const nextMode = await resolveGameModeByCode(client, nextModeCode);
      return changeUserGameMode(client, {
        userId: user.id,
        nextGameModeId: nextMode.game_mode_id,
        nextModeCode: nextMode.code,
      });
    });

    res.json({ ok: true, user: updated });
  }),
);

router.post(
  '/game-mode/upgrade-suggestion/dismiss',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const suggestion = await dismissGameModeUpgradeSuggestion(user.id);

    res.json({ ok: true, suggestion });
  }),
);

export default router;
