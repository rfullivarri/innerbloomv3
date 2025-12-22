import { ConsoleEmailProvider } from './console-email-provider.js';
import type { EmailProvider } from './email-provider.js';
import { ResendEmailProvider } from './resend-email-provider.js';

let cachedProvider: EmailProvider | null = null;

const DEFAULT_FROM_DISPLAY_NAME = 'Innerbloom Journey';
const DEFAULT_RESEND_FROM = `${DEFAULT_FROM_DISPLAY_NAME} <onboarding@resend.dev>`;

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

  const resolvedFrom = resolveResendFrom(from);

  return new ResendEmailProvider({ apiKey, defaultFrom: resolvedFrom });
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

function resolveResendFrom(from: string | undefined): string {
  if (!from) {
    console.warn(`EMAIL_FROM is not set. Falling back to ${DEFAULT_RESEND_FROM}.`);
    return DEFAULT_RESEND_FROM;
  }

  const email = extractEmailAddress(from);

  if (!email) {
    throw new Error('EMAIL_FROM must include a valid email address when EMAIL_PROVIDER_NAME=resend');
  }

  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    throw new Error('EMAIL_FROM must include a valid domain when EMAIL_PROVIDER_NAME=resend');
  }

  if (DISALLOWED_FROM_DOMAINS.has(domain)) {
    console.warn(
      `EMAIL_FROM uses the consumer domain ${domain}, which Resend rejects. Falling back to ${DEFAULT_RESEND_FROM}. ` +
        'Verify your own domain at https://resend.com/domains to send from a branded address.',
    );
    return DEFAULT_RESEND_FROM;
  }

  return formatFromWithDisplayName(email);
}

function formatFromWithDisplayName(email: string): string {
  return `${DEFAULT_FROM_DISPLAY_NAME} <${email}>`;
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
