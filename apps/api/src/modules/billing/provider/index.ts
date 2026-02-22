import { HttpError } from '../../../lib/http-error.js';
import type { BillingProvider } from './billing-provider.js';
import { MockBillingProvider } from './mock-billing-provider.js';

export function resolveBillingProviderName(): 'mock' | 'stripe' {
  const raw = (process.env.BILLING_PROVIDER ?? 'mock').toLowerCase();
  return raw === 'stripe' ? 'stripe' : 'mock';
}

export function getBillingProvider(): BillingProvider {
  const provider = resolveBillingProviderName();

  if (provider === 'mock') {
    return new MockBillingProvider();
  }

  throw new HttpError(501, 'billing_provider_not_ready', 'Stripe billing provider is not enabled yet');
}

export type { BillingProvider } from './billing-provider.js';
