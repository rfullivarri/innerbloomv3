import { Buffer } from 'node:buffer';
import { pool } from '../../../db.js';
import { HttpError } from '../../../lib/http-error.js';
import type {
  BillingProvider,
  CreateCheckoutSessionInput,
  CreatePortalSessionInput,
  HandleWebhookEventInput,
  SyncSubscriptionInput,
} from './billing-provider.js';
import type { BillingPlan } from '../billing.schemas.js';
import { verifyStripeSignature } from './stripe-signature.js';

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

type StripePortalSession = {
  id: string;
  url: string;
};

type StripeEvent<T = Record<string, unknown>> = {
  id: string;
  type: string;
  data?: {
    object?: T;
  };
};

type StripeSubscriptionItem = {
  price?: {
    id?: string;
  };
};

type StripeSubscription = {
  id?: string;
  customer?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  current_period_start?: number;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: {
    data?: StripeSubscriptionItem[];
  };
};

type StripeCheckoutCompleted = {
  customer?: string;
  subscription?: string;
  client_reference_id?: string;
  metadata?: Record<string, string>;
};

type StripeInvoice = {
  customer?: string;
  subscription?: string;
};

const EVENT_LOG_SQL = `
INSERT INTO stripe_webhook_events (event_id, event_type, payload)
VALUES ($1, $2, $3)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;
`;

const UPSERT_CUSTOMER_SQL = `
INSERT INTO billing_stripe_customers (user_id, stripe_customer_id, stripe_subscription_id)
VALUES ($1::uuid, $2, $3)
ON CONFLICT (user_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, billing_stripe_customers.stripe_subscription_id),
  updated_at = now();
`;

const SELECT_CUSTOMER_BY_USER_SQL = `
SELECT stripe_customer_id
FROM billing_stripe_customers
WHERE user_id = $1::uuid
LIMIT 1;
`;

const SELECT_USER_BY_CUSTOMER_SQL = `
SELECT user_id
FROM billing_stripe_customers
WHERE stripe_customer_id = $1
LIMIT 1;
`;

const INSERT_USER_SUBSCRIPTION_SQL = `
INSERT INTO user_subscriptions (
  user_id,
  plan_code,
  status,
  current_period_starts_at,
  current_period_ends_at,
  grace_ends_at,
  cancel_at_period_end,
  canceled_at
)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8);
`;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(503, 'billing_misconfigured', `${name} is required for Stripe billing`);
  }
  return value;
}

function toUnixIso(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function stripeStatusToInternal(status: string | undefined): 'active' | 'trialing' | 'past_due' | 'canceled' {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'trialing';
  }
}

function getPlanPriceEnvMap(): Record<Exclude<BillingPlan, 'FREE'>, string> {
  return {
    MONTH: requireEnv('STRIPE_PRICE_ID_MONTH'),
    SIX_MONTHS: requireEnv('STRIPE_PRICE_ID_SIX_MONTHS'),
    YEAR: requireEnv('STRIPE_PRICE_ID_YEAR'),
  };
}

function getPlanByPriceId(priceId: string | undefined): BillingPlan | null {
  if (!priceId) {
    return null;
  }

  const planMap = getPlanPriceEnvMap();
  if (priceId === planMap.MONTH) {
    return 'MONTH';
  }
  if (priceId === planMap.SIX_MONTHS) {
    return 'SIX_MONTHS';
  }
  if (priceId === planMap.YEAR) {
    return 'YEAR';
  }
  return null;
}

function requirePayloadString(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8');
  }

  throw new HttpError(400, 'invalid_payload', 'Webhook payload must be a raw JSON string');
}

async function stripeApiRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const secretKey = requireEnv('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, 'stripe_api_error', 'Stripe API request failed', payload);
  }

  return payload as T;
}

async function stripeApiGet<T>(path: string): Promise<T> {
  const secretKey = requireEnv('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, 'stripe_api_error', 'Stripe API request failed', payload);
  }

  return payload as T;
}

export class StripeBillingProvider implements BillingProvider {
  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    const priceId = getPlanPriceEnvMap()[input.plan];
    const successUrl = input.successUrl ?? process.env.STRIPE_CHECKOUT_SUCCESS_URL;
    const cancelUrl = input.cancelUrl ?? process.env.STRIPE_CHECKOUT_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      throw new HttpError(400, 'invalid_request', 'successUrl and cancelUrl are required for checkout');
    }

    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('success_url', successUrl);
    body.set('cancel_url', cancelUrl);
    body.set('line_items[0][price]', priceId);
    body.set('line_items[0][quantity]', '1');
    body.set('client_reference_id', input.userId);
    body.set('metadata[user_id]', input.userId);
    body.set('subscription_data[metadata][user_id]', input.userId);
    body.set('allow_promotion_codes', 'true');

    const existingCustomer = await pool.query<{ stripe_customer_id: string }>(SELECT_CUSTOMER_BY_USER_SQL, [input.userId]);
    const customerId = existingCustomer.rows[0]?.stripe_customer_id;
    if (customerId) {
      body.set('customer', customerId);
    }

    const session = await stripeApiRequest<StripeCheckoutSession>('/v1/checkout/sessions', body);
    if (!session.url) {
      throw new HttpError(502, 'stripe_api_error', 'Stripe checkout session did not return a URL');
    }

    return {
      provider: 'stripe' as const,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createPortalSession(input: CreatePortalSessionInput) {
    const returnUrl = input.returnUrl ?? process.env.STRIPE_PORTAL_RETURN_URL;
    if (!returnUrl) {
      throw new HttpError(400, 'invalid_request', 'returnUrl is required for portal session');
    }

    const customerResult = await pool.query<{ stripe_customer_id: string }>(SELECT_CUSTOMER_BY_USER_SQL, [input.userId]);
    const customerId = customerResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      throw new HttpError(409, 'billing_customer_missing', 'No Stripe customer found for user');
    }

    const body = new URLSearchParams();
    body.set('customer', customerId);
    body.set('return_url', returnUrl);

    const session = await stripeApiRequest<StripePortalSession>('/v1/billing_portal/sessions', body);

    return {
      provider: 'stripe' as const,
      portalUrl: session.url,
      sessionId: session.id,
    };
  }

  async handleWebhookEvent(input: HandleWebhookEventInput) {
    const payloadString = requirePayloadString(input.payload);
    const signature = input.signature;
    if (!signature) {
      throw new HttpError(400, 'invalid_signature', 'Stripe signature header is required');
    }

    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    verifyStripeSignature(payloadString, signature, webhookSecret);

    const event = JSON.parse(payloadString) as StripeEvent;
    if (!event?.id || !event?.type) {
      throw new HttpError(400, 'invalid_payload', 'Stripe event payload is missing id or type');
    }

    await pool.query('BEGIN');
    try {
      const logResult = await pool.query<{ event_id: string }>(EVENT_LOG_SQL, [event.id, event.type, payloadString]);
      const alreadyProcessed = !logResult.rows[0]?.event_id;
      if (alreadyProcessed) {
        await pool.query('COMMIT');
        return { provider: 'stripe' as const, received: true, eventType: event.type };
      }

      await this.processEvent(event);
      await pool.query('COMMIT');

      return {
        provider: 'stripe' as const,
        received: true,
        eventType: event.type,
      };
    } catch (error) {
      await pool.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  }

  async syncSubscription(input: SyncSubscriptionInput) {
    const subscriptionId = input.externalSubscriptionId;
    if (!subscriptionId) {
      return {
        provider: 'stripe' as const,
        synced: false,
      };
    }

    const subscription = await stripeApiGet<StripeSubscription>(`/v1/subscriptions/${subscriptionId}`);
    const userId = input.userId || await this.resolveUserId(subscription.customer, subscription.metadata?.user_id);

    if (!userId) {
      return {
        provider: 'stripe' as const,
        synced: false,
      };
    }

    await this.syncSubscriptionToDatabase(userId, subscription);
    return {
      provider: 'stripe' as const,
      synced: true,
    };
  }

  private async processEvent(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const payload = event.data?.object as StripeCheckoutCompleted | undefined;
        if (!payload) {
          return;
        }

        const userId = payload.client_reference_id ?? payload.metadata?.user_id;
        if (!userId) {
          return;
        }

        if (payload.customer) {
          await pool.query(UPSERT_CUSTOMER_SQL, [userId, payload.customer, payload.subscription ?? null]);
        }

        if (payload.subscription) {
          const subscription = await stripeApiGet<StripeSubscription>(`/v1/subscriptions/${payload.subscription}`);
          await this.syncSubscriptionToDatabase(userId, subscription);
        }
        return;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const payload = event.data?.object as StripeSubscription | undefined;
        if (!payload?.id) {
          return;
        }

        const userId = await this.resolveUserId(payload.customer, payload.metadata?.user_id);
        if (!userId) {
          return;
        }

        await this.syncSubscriptionToDatabase(userId, payload);
        return;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const payload = event.data?.object as StripeInvoice | undefined;
        if (!payload?.subscription) {
          return;
        }

        const subscription = await stripeApiGet<StripeSubscription>(`/v1/subscriptions/${payload.subscription}`);
        const userId = await this.resolveUserId(subscription.customer, subscription.metadata?.user_id);
        if (!userId) {
          return;
        }

        await this.syncSubscriptionToDatabase(userId, subscription);
        return;
      }
      default:
        return;
    }
  }

  private async resolveUserId(customerId?: string, metadataUserId?: string): Promise<string | null> {
    if (metadataUserId) {
      return metadataUserId;
    }

    if (!customerId) {
      return null;
    }

    const result = await pool.query<{ user_id: string }>(SELECT_USER_BY_CUSTOMER_SQL, [customerId]);
    return result.rows[0]?.user_id ?? null;
  }

  private async syncSubscriptionToDatabase(userId: string, subscription: StripeSubscription): Promise<void> {
    const plan = getPlanByPriceId(subscription.items?.data?.[0]?.price?.id);
    if (!plan) {
      throw new HttpError(400, 'stripe_plan_unmapped', 'Stripe subscription price is not mapped to a plan');
    }

    const status = stripeStatusToInternal(subscription.status);
    const graceEndsAt = status === 'past_due' && subscription.current_period_end
      ? new Date((subscription.current_period_end + 7 * 24 * 60 * 60) * 1000).toISOString()
      : null;

    await pool.query(INSERT_USER_SUBSCRIPTION_SQL, [
      userId,
      plan,
      status,
      toUnixIso(subscription.current_period_start),
      toUnixIso(subscription.current_period_end),
      graceEndsAt,
      Boolean(subscription.cancel_at_period_end),
      toUnixIso(subscription.canceled_at),
    ]);

    if (subscription.customer) {
      await pool.query(UPSERT_CUSTOMER_SQL, [userId, subscription.customer, subscription.id ?? null]);
    }
  }
}
