import {
  clearBillingSubscriptionsForTest,
  getOrCreateBillingSubscription,
  saveBillingSubscription,
  type BillingSubscriptionRecord,
} from './billing.repository.js';
import type {
  BillingPlan,
  BillingPlanCatalog,
  BillingStatus,
  CancelBody,
  ChangePlanBody,
  CheckoutSessionBody,
  PortalSessionBody,
  ReactivateBody,
  SubscribeBody,
} from './billing.schemas.js';
import { getBillingProvider } from './provider/index.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 7;

const PLAN_INTERVAL_MONTHS: Record<BillingPlan, number> = {
  FREE: 0,
  MONTH: 1,
  SIX_MONTHS: 6,
  YEAR: 12,
};

const PLANS: BillingPlanCatalog[] = [
  {
    plan: 'FREE',
    amountCents: 0,
    currency: 'USD',
    intervalMonths: 0,
    displayName: 'Free',
    features: ['Daily quest básica', 'Progreso personal'],
  },
  {
    plan: 'MONTH',
    amountCents: 999,
    currency: 'USD',
    intervalMonths: 1,
    displayName: 'Mensual',
    features: ['Todo en Free', 'Estadísticas avanzadas'],
  },
  {
    plan: 'SIX_MONTHS',
    amountCents: 4999,
    currency: 'USD',
    intervalMonths: 6,
    displayName: 'Semestral',
    features: ['Todo en Monthly', 'Soporte prioritario'],
  },
  {
    plan: 'YEAR',
    amountCents: 8999,
    currency: 'USD',
    intervalMonths: 12,
    displayName: 'Anual',
    features: ['Todo en Six Months', 'Precio preferencial'],
  },
];

function addMonthsIso(now: Date, months: number): string | null {
  if (months <= 0) {
    return null;
  }
  const next = new Date(now);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString();
}

function normalizeGracePeriod(record: BillingSubscriptionRecord): BillingSubscriptionRecord {
  if (record.status !== 'PAST_DUE' || !record.gracePeriodEndsAt) {
    return record;
  }

  const now = Date.now();
  const graceEnds = Date.parse(record.gracePeriodEndsAt);
  if (Number.isNaN(graceEnds) || graceEnds > now) {
    return record;
  }

  return saveBillingSubscription(record.userId, {
    status: 'CANCELED',
    canceledAt: new Date(now).toISOString(),
    cancelAtPeriodEnd: false,
  });
}

function buildSubscriptionResponse(record: BillingSubscriptionRecord) {
  const normalized = normalizeGracePeriod(record);
  return {
    provider: 'internal-temporal',
    subscription: {
      plan: normalized.plan,
      status: normalized.status,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      canceledAt: normalized.canceledAt,
      pastDueMarkedAt: normalized.pastDueMarkedAt,
      gracePeriodEndsAt: normalized.gracePeriodEndsAt,
      updatedAt: normalized.updatedAt,
    },
  };
}

function activatePlan(userId: string, plan: BillingPlan, status: BillingStatus = 'ACTIVE') {
  const now = new Date();
  const currentPeriodStart = plan === 'FREE' ? null : now.toISOString();
  const currentPeriodEnd = addMonthsIso(now, PLAN_INTERVAL_MONTHS[plan]);
  const isPastDue = status === 'PAST_DUE';
  const pastDueMarkedAt = isPastDue ? now.toISOString() : null;
  const gracePeriodEndsAt = isPastDue
    ? new Date(now.getTime() + GRACE_DAYS * ONE_DAY_MS).toISOString()
    : null;

  return saveBillingSubscription(userId, {
    plan,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: status === 'CANCELED' ? now.toISOString() : null,
    pastDueMarkedAt,
    gracePeriodEndsAt,
  });
}

export function listBillingPlans() {
  return {
    provider: 'internal-temporal',
    plans: PLANS,
  };
}

export function getUserBillingSubscription(userId: string) {
  const record = getOrCreateBillingSubscription(userId);
  return buildSubscriptionResponse(record);
}

export function subscribeUser(userId: string, input: SubscribeBody) {
  const record = activatePlan(userId, input.plan, 'ACTIVE');
  return buildSubscriptionResponse(record);
}

export function changeUserPlan(userId: string, input: ChangePlanBody) {
  const status = input.status ?? 'ACTIVE';
  const record = activatePlan(userId, input.plan, status);
  return buildSubscriptionResponse(record);
}

export function cancelUserSubscription(userId: string, input: CancelBody) {
  void input;
  const now = new Date().toISOString();
  const record = saveBillingSubscription(userId, {
    status: 'CANCELED',
    cancelAtPeriodEnd: false,
    canceledAt: now,
    pastDueMarkedAt: null,
    gracePeriodEndsAt: null,
  });

  return buildSubscriptionResponse(record);
}

export function reactivateUserSubscription(userId: string, input: ReactivateBody) {
  const current = getOrCreateBillingSubscription(userId);
  const targetPlan = input.plan ?? (current.plan === 'FREE' ? 'MONTH' : current.plan);
  const record = activatePlan(userId, targetPlan, 'ACTIVE');
  return buildSubscriptionResponse(record);
}

export { clearBillingSubscriptionsForTest };


export async function createBillingCheckoutSession(userId: string, input: CheckoutSessionBody) {
  const provider = getBillingProvider();
  return provider.createCheckoutSession({
    userId,
    plan: input.plan,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });
}

export async function createBillingPortalSession(userId: string, input: PortalSessionBody) {
  const provider = getBillingProvider();
  return provider.createPortalSession({
    userId,
    returnUrl: input.returnUrl,
  });
}

export async function handleBillingWebhookEvent(signature: string | undefined, payload: unknown) {
  const provider = getBillingProvider();
  return provider.handleWebhookEvent({ signature, payload });
}

export async function syncBillingSubscription(
  userId: string,
  externalCustomerId?: string,
  externalSubscriptionId?: string
) {
  const provider = getBillingProvider();
  return provider.syncSubscription({
    userId,
    externalCustomerId,
    externalSubscriptionId,
  });
}
