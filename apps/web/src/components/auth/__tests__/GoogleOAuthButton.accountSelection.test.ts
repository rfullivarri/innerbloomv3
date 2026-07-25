import { describe, expect, it } from 'vitest';
import { buildGoogleOAuthRedirectOptions } from '../GoogleOAuthButton';

describe('Google OAuth account selection', () => {
  it('starts a fresh Clerk attempt and forces the Google account selector', () => {
    expect(buildGoogleOAuthRedirectOptions('/after-auth', true)).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/after-auth',
      oidcPrompt: 'select_account',
      continueSignIn: false,
      continueSignUp: false,
    });
  });

  it('starts a fresh Clerk attempt without forcing account selection when disabled', () => {
    expect(buildGoogleOAuthRedirectOptions('/after-auth', false)).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/after-auth',
      oidcPrompt: undefined,
      continueSignIn: false,
      continueSignUp: false,
    });
  });
});
