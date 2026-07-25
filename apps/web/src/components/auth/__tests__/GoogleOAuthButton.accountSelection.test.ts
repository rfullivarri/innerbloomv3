import { describe, expect, it } from 'vitest';
import {
  buildGoogleOAuthRedirectOptions,
  forceGoogleAccountChooserUrl,
} from '../GoogleOAuthButton';

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

  it('forces the chooser on the Clerk-generated Google URL and removes the previous account hint', () => {
    const result = forceGoogleAccountChooserUrl(
      'https://accounts.google.com/o/oauth2/auth?client_id=client&state=state&authuser=0&prompt=none',
    );
    const url = new URL(result);

    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.has('authuser')).toBe(false);
    expect(url.searchParams.get('state')).toBe('state');
    expect(url.searchParams.get('client_id')).toBe('client');
  });

  it('rejects any external verification URL that is not hosted by Google Accounts', () => {
    expect(() => forceGoogleAccountChooserUrl('https://example.com/oauth?state=state')).toThrow(
      'Unexpected Google OAuth host',
    );
  });
});
