import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import {
  cancelBodySchema,
  changePlanBodySchema,
  checkoutSessionBodySchema,
  portalSessionBodySchema,
  reactivateBodySchema,
  subscribeBodySchema,
} from './billing.schemas.js';
import {
  cancelUserSubscription,
  changeUserPlan,
  createBillingCheckoutSession,
  createBillingPortalSession,
  getUserBillingSubscription,
  listBillingPlans,
  reactivateUserSubscription,
  subscribeUser,
} from './billing.service.js';

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  return req.user.id;
}

export const getBillingPlans = asyncHandler(async (_req: Request, res: Response) => {
  res.json(listBillingPlans());
});

export const getBillingSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  res.json(getUserBillingSubscription(userId));
});


export const postBillingCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = checkoutSessionBodySchema.parse(req.body);
  const result = await createBillingCheckoutSession(userId, body);
  res.status(201).json(result);
});

export const postBillingPortalSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = portalSessionBodySchema.parse(req.body ?? {});
  const result = await createBillingPortalSession(userId, body);
  res.status(201).json(result);
});

export const postBillingSubscribe = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = subscribeBodySchema.parse(req.body);
  res.json(subscribeUser(userId, body));
});

export const postBillingChangePlan = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = changePlanBodySchema.parse(req.body);
  res.json(changeUserPlan(userId, body));
});

export const postBillingCancel = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = cancelBodySchema.parse(req.body ?? {});
  res.json(cancelUserSubscription(userId, body));
});

export const postBillingReactivate = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const body = reactivateBodySchema.parse(req.body ?? {});
  res.json(reactivateUserSubscription(userId, body));
});
