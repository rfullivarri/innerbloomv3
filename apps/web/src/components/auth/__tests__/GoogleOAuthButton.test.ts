import { beforeEach, describe, expect, it } from 'vitest';
import {
  OAUTH_REDIRECT_INTENT_STORAGE_KEY,
  buildGoogleOAuthRedirectOptions,
  describeClerkOAuthError,
  normalizeOAuthRedirectIntentUrl,
  persistOAuthRedirectIntent,
  readOAuthRedirectIntent,
} from '../GoogleOAuthButton';

describe('Google OAuth redirect contract', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('starts a fresh Clerk OAuth attempt without cross-mode continuation flags', () => {
    const options = buildGoogleOAuthRedirectOptions(
      'https://innerbloomjourney.org/mobile-auth?mode=sign-up&handoff=1',
      true,
    );

    expect(options).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: 'https://innerbloomjourney.org/mobile-auth?mode=sign-up&handoff=1',
      oidcPrompt: 'select_account',
    });
    expect(options).not.toHaveProperty('continueSignIn');
    expect(options).not.toHaveProperty('continueSignUp');
  });

  it('keeps account selection optional for flows that do not request it', () => {
    const options = buildGoogleOAuthRedirectOptions('/innerbloom2/dashboard', false);

    expect(options.oidcPrompt).toBeUndefined();
    expect(options.redirectUrlComplete).toBe('/innerbloom2/dashboard');
  });

  it('normalizes the absolute native handoff into a same-origin callback fallback', () => {
    const handoffUrl =
      'https://innerbloomjourney.org/mobile-auth?lang=en&mode=sign-up&redirect_path=%2Fintro-journey2&return_to=innerbloom%3A%2F%2Flocalhost%2Fcallback&handoff=1';

    expect(normalizeOAuthRedirectIntentUrl(handoffUrl, 'https://innerbloomjourney.org')).toBe(
      '/mobile-auth?lang=en&mode=sign-up&redirect_path=%2Fintro-journey2&return_to=innerbloom%3A%2F%2Flocalhost%2Fcallback&handoff=1',
    );
  });

  it('rejects cross-origin and protocol-relative callback fallbacks', () => {
    expect(normalizeOAuthRedirectIntentUrl(
      'https://attacker.example/mobile-auth?handoff=1',
      'https://innerbloomjourney.org',
    )).toBeNull();
    expect(normalizeOAuthRedirectIntentUrl(
      '//attacker.example/mobile-auth?handoff=1',
      'https://innerbloomjourney.org',
    )).toBeNull();
  });

  it('round-trips the Android handoff through sessionStorage for /sso-callback', () => {
    const createdAt = Date.now();
    const absoluteHandoffUrl =
      `${window.location.origin}/mobile-auth?lang=en&mode=sign-up&redirect_path=%2Fintro-journey2&return_to=innerbloom%3A%2F%2Flocalhost%2Fcallback&handoff=1`;

    persistOAuthRedirectIntent({
      mode: 'sign-up',
      redirectUrlComplete: absoluteHandoffUrl,
      createdAt,
    });

    const persisted = JSON.parse(
      window.sessionStorage.getItem(OAUTH_REDIRECT_INTENT_STORAGE_KEY) ?? 'null',
    ) as { redirectUrlComplete?: string } | null;
    expect(persisted?.redirectUrlComplete).toBe(
      '/mobile-auth?lang=en&mode=sign-up&redirect_path=%2Fintro-journey2&return_to=innerbloom%3A%2F%2Flocalhost%2Fcallback&handoff=1',
    );
    expect(readOAuthRedirectIntent()).toEqual({
      mode: 'sign-up',
      redirectUrlComplete:
        '/mobile-auth?lang=en&mode=sign-up&redirect_path=%2Fintro-journey2&return_to=innerbloom%3A%2F%2Flocalhost%2Fcallback&handoff=1',
      createdAt,
    });
  });

  it('recovers a legacy same-origin absolute intent already stored before the callback', () => {
    const createdAt = Date.now();
    window.sessionStorage.setItem(OAUTH_REDIRECT_INTENT_STORAGE_KEY, JSON.stringify({
      mode: 'sign-in',
      redirectUrlComplete: `${window.location.origin}/mobile-auth?mode=sign-in&handoff=1`,
      createdAt,
    }));

    expect(readOAuthRedirectIntent()).toEqual({
      mode: 'sign-in',
      redirectUrlComplete: '/mobile-auth?mode=sign-in&handoff=1',
      createdAt,
    });
  });

  it('serializes Clerk errors into Logcat-readable fields', () => {
    const details = describeClerkOAuthError({
      code: 'oauth_error',
      message: 'transferable not supported yet',
      errors: [{
        code: 'form_identifier_exists',
        message: 'Account already exists',
        longMessage: 'Use the existing sign-in flow.',
      }],
    });

    expect(details).toEqual({
      name: null,
      message: 'transferable not supported yet',
      code: 'oauth_error',
      errors: [{
        code: 'form_identifier_exists',
        message: 'Account already exists',
        longMessage: 'Use the existing sign-in flow.',
      }],
    });
  });
});
