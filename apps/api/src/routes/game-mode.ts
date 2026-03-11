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

    res.json({ ok: true, suggestion });
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
