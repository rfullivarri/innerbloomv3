import type { BillingProvider } from './billing-provider.js';
import { MockBillingProvider } from './mock-billing-provider.js';
import { StripeBillingProvider } from './stripe-billing-provider.js';

export function resolveBillingProviderName(): 'mock' | 'stripe' {
  const raw = (process.env.BILLING_PROVIDER ?? 'mock').toLowerCase();
  return raw === 'stripe' ? 'stripe' : 'mock';
}

export function getBillingProvider(): BillingProvider {
  const provider = resolveBillingProviderName();

  if (provider === 'mock') {
    return new MockBillingProvider();
  }

  return new StripeBillingProvider();
}

export type { BillingProvider } from './billing-provider.js';
