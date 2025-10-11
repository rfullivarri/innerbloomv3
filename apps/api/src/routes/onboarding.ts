import process from 'node:process';
import { Router } from 'express';
import { parseWithValidation } from '../lib/validation.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { onboardingIntroSchema, type OnboardingIntroPayload } from '../schemas/onboarding.js';
import {
  getLatestOnboardingSession,
  submitOnboardingIntro,
} from '../services/onboardingIntroService.js';

const router = Router();

router.post(
  '/onboarding/intro',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const payload = parseWithValidation(onboardingIntroSchema, req.body, 'Invalid request body');

    validateMetaUserId(payload, user.clerkId);

    const result = await submitOnboardingIntro(user.clerkId, payload);

    res.json({ ok: true, session_id: result.sessionId, awarded: result.awarded });
  }),
);

router.get(
  '/debug/onboarding/last',
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(403, 'forbidden', 'Debug endpoint is disabled in production');
    }

    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const session = await getLatestOnboardingSession(user.clerkId);

    res.json({ ok: true, session });
  }),
);

function validateMetaUserId(payload: OnboardingIntroPayload, clerkUserId: string): void {
  if (payload.meta.user_id !== clerkUserId) {
    throw new HttpError(409, 'user_mismatch', 'Payload user_id does not match authenticated user');
  }
}

export default router;
