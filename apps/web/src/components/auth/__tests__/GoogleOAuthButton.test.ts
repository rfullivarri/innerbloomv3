import { describe, expect, it } from 'vitest';
import {
  buildGoogleOAuthRedirectOptions,
  describeClerkOAuthError,
} from '../GoogleOAuthButton';

describe('Google OAuth redirect contract', () => {
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
