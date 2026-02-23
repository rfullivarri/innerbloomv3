import { apiAuthorizedFetch } from '../api';
import {
  cancelSubscription as cancelMockSubscription,
  getSubscription as getMockSubscription,
  type PlanCode,
  type SubscriptionData,
  type SubscriptionStatus,
} from './subscriptionMock';

type BillingApiStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

type BillingSubscriptionPayload = {
  provider: string;
  subscription: {
    plan: PlanCode;
    status: BillingApiStatus;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    pastDueMarkedAt: string | null;
    gracePeriodEndsAt: string | null;
    updatedAt: string;
  };
};

function mapStatus(status: BillingApiStatus): SubscriptionStatus {
  if (status === 'CANCELED') {
    return 'inactive';
  }

  if (status === 'PAST_DUE') {
    return 'trialing';
  }

  return 'active';
}

function mapBillingToSubscription(payload: BillingSubscriptionPayload): SubscriptionData {
  const status = mapStatus(payload.subscription.status);
  const trialEndsAt = status === 'trialing' ? payload.subscription.gracePeriodEndsAt : null;

  return {
    plan: payload.subscription.plan,
    status,
    trialEndsAt,
    nextRenewalAt: payload.subscription.currentPeriodEnd,
  };
}

export async function getSubscriptionWithFallback() {
  try {
    const response = await apiAuthorizedFetch('/users/me/subscription');
    if (!response.ok) {
      const billingResponse = await apiAuthorizedFetch('/billing/subscription');
      if (!billingResponse.ok) {
        return getMockSubscription();
      }

      const billingPayload = (await billingResponse.json()) as BillingSubscriptionPayload;
      return {
        ok: true as const,
        data: mapBillingToSubscription(billingPayload),
      };
    }

    const payload = (await response.json()) as SubscriptionData;
    return {
      ok: true as const,
      data: payload,
    };
  } catch {
    return getMockSubscription();
  }
}

export async function cancelSubscriptionWithFallback() {
  try {
    const response = await apiAuthorizedFetch('/billing/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return cancelMockSubscription();
    }

    const payload = (await response.json()) as BillingSubscriptionPayload;
    return {
      ok: true as const,
      data: mapBillingToSubscription(payload),
    };
  } catch {
    return cancelMockSubscription();
  }
}
