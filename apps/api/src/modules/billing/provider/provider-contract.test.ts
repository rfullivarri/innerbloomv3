import { afterEach, describe, expect, it } from 'vitest';
import type { BillingProvider } from './billing-provider.js';
import { MockBillingProvider } from './mock-billing-provider.js';
import { getBillingProvider } from './index.js';
import { HttpError } from '../../../lib/http-error.js';

function assertBillingProviderContract(provider: BillingProvider) {
  expect(provider).toHaveProperty('createCheckoutSession');
  expect(provider).toHaveProperty('createPortalSession');
  expect(provider).toHaveProperty('handleWebhookEvent');
  expect(provider).toHaveProperty('syncSubscription');

  expect(typeof provider.createCheckoutSession).toBe('function');
  expect(typeof provider.createPortalSession).toBe('function');
  expect(typeof provider.handleWebhookEvent).toBe('function');
  expect(typeof provider.syncSubscription).toBe('function');
}

describe('billing provider contract', () => {
  afterEach(() => {
    delete process.env.BILLING_PROVIDER;
  });

  it('ensures MockBillingProvider implements the BillingProvider contract', async () => {
    const provider = new MockBillingProvider();
    assertBillingProviderContract(provider);

    const checkout = await provider.createCheckoutSession({ userId: 'u1', plan: 'MONTH' });
    const portal = await provider.createPortalSession({ userId: 'u1' });
    const webhook = await provider.handleWebhookEvent({ payload: { type: 'test' } });
    const sync = await provider.syncSubscription({ userId: 'u1' });

    expect(checkout.provider).toBe('mock');
    expect(portal.provider).toBe('mock');
    expect(webhook.provider).toBe('mock');
    expect(sync.provider).toBe('mock');
  });

  it('uses mock provider by default', () => {
    const provider = getBillingProvider();
    assertBillingProviderContract(provider);
    expect(provider).toBeInstanceOf(MockBillingProvider);
  });

  it('fails with 501 for stripe provider until implementation is enabled', () => {
    process.env.BILLING_PROVIDER = 'stripe';

    expect(() => getBillingProvider()).toThrowError(HttpError);
    expect(() => getBillingProvider()).toThrowError(/not enabled yet/i);
  });
});
