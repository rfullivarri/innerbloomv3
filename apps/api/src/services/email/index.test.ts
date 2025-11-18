import { afterEach, describe, expect, it } from 'vitest';
import { createEmailProvider, resetEmailProviderCache } from './index.js';

const originalEnv = { ...process.env };

afterEach(() => {
  resetEmailProviderCache();
  process.env = { ...originalEnv };
});

function setResendEnv(from: string): void {
  process.env.EMAIL_PROVIDER_NAME = 'resend';
  process.env.EMAIL_PROVIDER_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM = from;
}

describe('createEmailProvider', () => {
  it('rejects gmail senders when using Resend', () => {
    setResendEnv('Innerbloom <dailyquest@gmail.com>');

    expect(() => createEmailProvider()).toThrowError(
      /EMAIL_FROM cannot use addresses from gmail.com when EMAIL_PROVIDER_NAME=resend/,
    );
  });

  it('rejects when the from field does not contain an email address', () => {
    setResendEnv('Innerbloom Reminder Bot');

    expect(() => createEmailProvider()).toThrowError(
      /EMAIL_FROM must include a valid email address when EMAIL_PROVIDER_NAME=resend/,
    );
  });

  it('accepts the Resend sandbox domain', () => {
    setResendEnv('Innerbloom <onboarding@resend.dev>');

    const provider = createEmailProvider();

    expect(provider).toBeDefined();
  });
});
