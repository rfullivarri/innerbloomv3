import type {
  BillingProvider,
  CreateCheckoutSessionInput,
  CreatePortalSessionInput,
  HandleWebhookEventInput,
  SyncSubscriptionInput,
} from './billing-provider.js';

const DEFAULT_CHECKOUT_URL = 'https://mock-billing.local/checkout/session';
const DEFAULT_PORTAL_URL = 'https://mock-billing.local/portal/session';

function mockId(prefix: string, userId: string): string {
  return `${prefix}_${userId}_${Date.now()}`;
}

export class MockBillingProvider implements BillingProvider {
  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    return {
      provider: 'mock' as const,
      checkoutUrl: process.env.BILLING_MOCK_CHECKOUT_URL ?? `${DEFAULT_CHECKOUT_URL}?plan=${input.plan}`,
      sessionId: mockId('mock_checkout', input.userId),
    };
  }

  async createPortalSession(input: CreatePortalSessionInput) {
    return {
      provider: 'mock' as const,
      portalUrl: process.env.BILLING_MOCK_PORTAL_URL ?? DEFAULT_PORTAL_URL,
      sessionId: mockId('mock_portal', input.userId),
    };
  }

  async handleWebhookEvent(_input: HandleWebhookEventInput) {
    void _input;
    return {
      provider: 'mock' as const,
      received: true,
      eventType: 'mock.billing.event',
    };
  }

  async syncSubscription(_input: SyncSubscriptionInput) {
    void _input;
    return {
      provider: 'mock' as const,
      synced: true,
    };
  }
}
