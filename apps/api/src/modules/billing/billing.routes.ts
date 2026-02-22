import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import {
  getBillingPlans,
  getBillingSubscription,
  postBillingCancel,
  postBillingChangePlan,
  postBillingCheckoutSession,
  postBillingPortalSession,
  postBillingReactivate,
  postBillingSubscribe,
} from './billing.handlers.js';

const router = Router();

router.get('/billing/plans', authMiddleware, getBillingPlans);
router.get('/billing/subscription', authMiddleware, getBillingSubscription);
router.post('/billing/subscribe', authMiddleware, postBillingSubscribe);
router.post('/billing/change-plan', authMiddleware, postBillingChangePlan);
router.post('/billing/cancel', authMiddleware, postBillingCancel);
router.post('/billing/reactivate', authMiddleware, postBillingReactivate);
router.post('/billing/checkout-session', authMiddleware, postBillingCheckoutSession);
router.post('/billing/portal-session', authMiddleware, postBillingPortalSession);

export default router;
