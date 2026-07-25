import { describe, expect, it } from 'vitest';
import { buildGoogleOAuthRedirectOptions } from '../GoogleOAuthButton';

describe('Google OAuth fresh account selection', () => {
  it('forces Google account selection and starts a new Clerk attempt', () => {
    expect(buildGoogleOAuthRedirectOptions('/after-auth', true)).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/after-auth',
      oidcPrompt: 'select_account',
      continueSignIn: false,
      continueSignUp: false,
    });
  });
});
