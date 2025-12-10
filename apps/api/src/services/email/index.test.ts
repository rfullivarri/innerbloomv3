import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmailProvider, resetEmailProviderCache } from './index.js';

const originalEnv = { ...process.env };

afterEach(() => {
  resetEmailProviderCache();
  process.env = { ...originalEnv };
});

function setResendEnv(from?: string): void {
  process.env.EMAIL_PROVIDER_NAME = 'resend';
  process.env.EMAIL_PROVIDER_API_KEY = 'test-api-key';

  if (from === undefined) {
    delete process.env.EMAIL_FROM;
  } else {
    process.env.EMAIL_FROM = from;
  }
}

describe('createEmailProvider', () => {
  it('falls back to the Resend sandbox when the sender is a consumer domain', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setResendEnv('Innerbloom <dailyquest@gmail.com>');

    const provider = createEmailProvider();

    expect(provider).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('EMAIL_FROM uses the consumer domain gmail.com, which Resend rejects.'),
    );
    warnSpy.mockRestore();
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

  it('uses the Resend sandbox when EMAIL_FROM is not provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setResendEnv();

    const provider = createEmailProvider();

    expect(provider).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('EMAIL_FROM is not set. Falling back to Innerbloom <onboarding@resend.dev>.'),
    );
    warnSpy.mockRestore();
  });
});
