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
import { triggerTaskGenerationForUser } from '../services/taskgenTriggerService.js';
import { getJourneyGenerationState } from '../services/journeyGenerationStateService.js';
import { getJourneyReadyModalSeenAt, markJourneyReadyModalSeen } from '../services/journeyReadyModalService.js';

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

    const result = await submitOnboardingIntro(user.clerkId, payload, {
      triggerTaskGenerationForUser,
    });

    res.json({
      ok: true,
      session_id: result.sessionId,
      awarded: result.awarded,
      taskgen_correlation_id: result.taskgenCorrelationId ?? null,
    });
  }),
);


router.get(
  '/onboarding/generation-status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const state = await getJourneyGenerationState(user.id);
    const generationKey = state ? state.correlationId ?? state.updatedAt : null;
    const journeyReadyModalSeenAt = generationKey
      ? await getJourneyReadyModalSeenAt(user.id, generationKey)
      : null;

    res.json({
      ok: true,
      state: state
        ? {
            status: state.status,
            correlation_id: state.correlationId,
            updated_at: state.updatedAt,
            completed_at: state.completedAt,
            failure_reason: state.failureReason,
          }
        : null,
      journey_ready_modal_seen_at: journeyReadyModalSeenAt,
    });
  }),
);

router.post(
  '/onboarding/journey-ready-modal/seen',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const rawGenerationKey = typeof req.body?.generation_key === 'string' ? req.body.generation_key : '';
    const generationKey = rawGenerationKey.trim();

    if (!generationKey) {
      throw new HttpError(400, 'invalid_generation_key', 'generation_key is required');
    }

    const seenAt = await markJourneyReadyModalSeen(user.id, generationKey);

    res.json({ ok: true, seen_at: seenAt });
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
