import { describe, expect, it } from 'vitest';
import { buildGoogleOAuthRedirectOptions } from '../GoogleOAuthButton';

describe('Google OAuth account selection', () => {
  it('forces Google to show the account selector for interactive auth', () => {
    expect(buildGoogleOAuthRedirectOptions('/after-auth', true)).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/after-auth',
      oidcPrompt: 'select_account',
    });
  });

  it('does not force account selection for non-interactive flows', () => {
    expect(buildGoogleOAuthRedirectOptions('/after-auth', false)).toEqual({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/after-auth',
      oidcPrompt: undefined,
    });
  });
});
