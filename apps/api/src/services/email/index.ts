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

  assertValidResendFromAddress(from);

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

const DISALLOWED_FROM_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'icloud.com',
]);

function assertValidResendFromAddress(from: string): void {
  const email = extractEmailAddress(from);

  if (!email) {
    throw new Error('EMAIL_FROM must include a valid email address when EMAIL_PROVIDER_NAME=resend');
  }

  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    throw new Error('EMAIL_FROM must include a valid domain when EMAIL_PROVIDER_NAME=resend');
  }

  if (DISALLOWED_FROM_DOMAINS.has(domain)) {
    throw new Error(
      `EMAIL_FROM cannot use addresses from ${domain} when EMAIL_PROVIDER_NAME=resend. ` +
        'Resend only delivers from verified domains that you own. Use onboarding@resend.dev or verify your domain at https://resend.com/domains.',
    );
  }
}

function extractEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const bracketMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (bracketMatch ? bracketMatch[1] : trimmed).trim();

  if (!candidate.includes('@')) {
    return null;
  }

  return candidate.toLowerCase();
}
