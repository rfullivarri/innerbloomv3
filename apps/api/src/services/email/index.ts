import { ConsoleEmailProvider } from './console-email-provider.js';
import type { EmailProvider } from './email-provider.js';
import { ResendEmailProvider } from './resend-email-provider.js';

let cachedProvider: EmailProvider | null = null;

function resolveProviderName(): string {
  const raw = process.env.EMAIL_PROVIDER_NAME?.trim();

  if (!raw) {
    return 'console';
  }

  return raw.toLowerCase();
}

function createResendProvider(): EmailProvider {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    throw new Error('EMAIL_PROVIDER_API_KEY is required when EMAIL_PROVIDER_NAME=resend');
  }

  if (!from) {
    throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER_NAME=resend');
  }

  return new ResendEmailProvider({ apiKey, defaultFrom: from });
}

export function createEmailProvider(): EmailProvider {
  const name = resolveProviderName();

  if (name === 'resend') {
    return createResendProvider();
  }

  if (name === 'console' || name === 'log' || name === 'noop') {
    return new ConsoleEmailProvider();
  }

  throw new Error(`Unsupported EMAIL_PROVIDER_NAME: ${name}`);
}

export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = createEmailProvider();
  }

  return cachedProvider;
}

export function resetEmailProviderCache(): void {
  cachedProvider = null;
}

export type { EmailMessage, EmailProvider } from './email-provider.js';
