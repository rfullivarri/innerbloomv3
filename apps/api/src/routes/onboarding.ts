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
import {
  getOnboardingProgress,
  markOnboardingProgressStep,
  reconcileOnboardingProgressFromClient,
  type OnboardingProgressStep,
} from '../services/onboardingProgressService.js';

const router = Router();

const validSteps = new Set<OnboardingProgressStep>([
  'onboarding_started',
  'game_mode_selected',
  'moderation_selected',
  'tasks_generated',
  'first_task_edited',
  'returned_to_dashboard_after_first_edit',
  'moderation_modal_shown',
  'moderation_modal_resolved',
  'first_daily_quest_prompted',
  'first_daily_quest_completed',
  'daily_quest_scheduled',
  'onboarding_completed',
]);

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
  '/onboarding/progress',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const progress = await getOnboardingProgress(user.id);
    res.json({ ok: true, progress });
  }),
);

router.post(
  '/onboarding/progress/mark',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const step = typeof req.body?.step === 'string' ? (req.body.step.trim() as OnboardingProgressStep) : null;
    if (!step || !validSteps.has(step)) {
      throw new HttpError(400, 'invalid_step', 'step is required and must be valid');
    }

    const progress = await markOnboardingProgressStep(user.id, step, {
      onboardingSessionId: typeof req.body?.onboarding_session_id === 'string' ? req.body.onboarding_session_id : null,
      source: req.body?.source && typeof req.body.source === 'object' ? req.body.source : undefined,
    });

    res.json({ ok: true, progress });
  }),
);

router.post(
  '/onboarding/progress/reconcile-client',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const flags = req.body?.flags && typeof req.body.flags === 'object' ? req.body.flags : {};
    const sanitized: Partial<Record<OnboardingProgressStep, boolean>> = {};
    for (const [key, value] of Object.entries(flags)) {
      if (validSteps.has(key as OnboardingProgressStep) && typeof value === 'boolean') {
        sanitized[key as OnboardingProgressStep] = value;
      }
    }

    const progress = await reconcileOnboardingProgressFromClient(user.id, sanitized);
    res.json({ ok: true, progress });
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

    console.info('[onboarding-status]', {
      event: 'quick_start generation status result',
      userId: user.id,
      status: state?.status ?? null,
      correlationId: state?.correlationId ?? null,
      failureReason: state?.failureReason ?? null,
    });

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
