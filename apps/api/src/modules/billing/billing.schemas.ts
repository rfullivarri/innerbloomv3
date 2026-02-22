import { z } from 'zod';

export const billingPlanSchema = z.enum(['FREE', 'MONTH', 'SIX_MONTHS', 'YEAR']);
export const billingStatusSchema = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED']);

export const billingPlanCatalogSchema = z.object({
  plan: billingPlanSchema,
  amountCents: z.number().int().nonnegative(),
  currency: z.literal('USD'),
  intervalMonths: z.number().int().positive(),
  displayName: z.string().min(1),
  features: z.array(z.string().min(1)),
});

export const subscribeBodySchema = z.object({
  plan: billingPlanSchema.refine((value) => value !== 'FREE', {
    message: 'FREE cannot be subscribed explicitly',
  }),
});

export const changePlanBodySchema = z.object({
  plan: billingPlanSchema,
  status: billingStatusSchema.optional(),
});

export const cancelBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .default({});

export const reactivateBodySchema = z
  .object({
    plan: billingPlanSchema.optional(),
  })
  .default({});

export type BillingPlan = z.infer<typeof billingPlanSchema>;
export type BillingStatus = z.infer<typeof billingStatusSchema>;
export type BillingPlanCatalog = z.infer<typeof billingPlanCatalogSchema>;
export type SubscribeBody = z.infer<typeof subscribeBodySchema>;
export type ChangePlanBody = z.infer<typeof changePlanBodySchema>;
export type CancelBody = z.infer<typeof cancelBodySchema>;
export type ReactivateBody = z.infer<typeof reactivateBodySchema>;
