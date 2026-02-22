import type { BillingPlan } from '../billing.schemas.js';

export type CreateCheckoutSessionInput = {
  userId: string;
  plan: Exclude<BillingPlan, 'FREE'>;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateCheckoutSessionResult = {
  provider: 'mock' | 'stripe';
  checkoutUrl: string;
  sessionId: string;
};

export type CreatePortalSessionInput = {
  userId: string;
  returnUrl?: string;
};

export type CreatePortalSessionResult = {
  provider: 'mock' | 'stripe';
  portalUrl: string;
  sessionId: string;
};

export type HandleWebhookEventInput = {
  signature?: string;
  payload: unknown;
};

export type HandleWebhookEventResult = {
  provider: 'mock' | 'stripe';
  received: boolean;
  eventType: string;
};

export type SyncSubscriptionInput = {
  userId: string;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
};

export type SyncSubscriptionResult = {
  provider: 'mock' | 'stripe';
  synced: boolean;
};

export interface BillingProvider {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;
  createPortalSession(input: CreatePortalSessionInput): Promise<CreatePortalSessionResult>;
  handleWebhookEvent(input: HandleWebhookEventInput): Promise<HandleWebhookEventResult>;
  syncSubscription(input: SyncSubscriptionInput): Promise<SyncSubscriptionResult>;
}
