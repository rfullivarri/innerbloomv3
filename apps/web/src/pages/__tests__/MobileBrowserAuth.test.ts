import { describe, expect, it } from 'vitest';
import { CLERK_TOKEN_TEMPLATE } from '../../config/auth';
import { buildModeUrl, buildRedirectUrl, shouldIncludeLegacyProfileImage } from '../MobileBrowserAuth';

describe('MobileBrowserAuth callback URL hardening', () => {
  const baseUrl = 'innerbloom://auth-callback';
  const token = 'test-token';
  const mode = 'sign-in' as const;
  const user = {
    id: 'user_123',
    imageUrl: 'https://images.example.com/clerk-user.png',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
  };

  it('omits legacy image_url by default and writes clerk_image_url', () => {
    const callbackUrl = new URL(buildRedirectUrl(baseUrl, user as never, token, mode, {
      includeLegacyImageUrl: false,
      redirectPath: '/innerbloom2/dashboard',
    }));

    expect(callbackUrl.searchParams.get('token')).toBe(token);
    expect(callbackUrl.searchParams.get('auth_mode')).toBe(mode);
    expect(callbackUrl.searchParams.get('redirect_path')).toBe('/innerbloom2/dashboard');
    expect(callbackUrl.searchParams.get('user_id')).toBe(user.id);
    expect(callbackUrl.searchParams.get('email')).toBe('test@example.com');
    expect(callbackUrl.searchParams.get('clerk_image_url')).toBe(user.imageUrl);
    expect(callbackUrl.searchParams.has('image_url')).toBe(false);
  });

  it('supports short compatibility dual-write when legacy flag is enabled', () => {
    const callbackUrl = new URL(buildRedirectUrl(baseUrl, user as never, token, mode, {
      includeLegacyImageUrl: true,
      redirectPath: '/innerbloom2/dashboard',
    }));

    expect(callbackUrl.searchParams.get('clerk_image_url')).toBe(user.imageUrl);
    expect(callbackUrl.searchParams.get('image_url')).toBe(user.imageUrl);
  });

  it('parses legacy_profile_image query flag safely', () => {
    expect(shouldIncludeLegacyProfileImage('?legacy_profile_image=1')).toBe(true);
    expect(shouldIncludeLegacyProfileImage('?legacy_profile_image=0')).toBe(false);
    expect(shouldIncludeLegacyProfileImage('')).toBe(false);
  });

  it('uses the shared Clerk token template configuration', () => {
    expect(CLERK_TOKEN_TEMPLATE).toBeNull();
  });

  it('preserves Innerbloom 2 mobile auth parameters when switching modes', () => {
    const url = buildModeUrl(
      'es',
      'sign-up',
      '?lang=es&return_to=innerbloom%3A%2F%2Fauth-callback&fresh=1&experience=innerbloom2&redirect_path=%2Finnerbloom2%2Fdashboard&hide_google=1',
    );

    const parsed = new URL(url, 'https://innerbloomjourney.org');
    expect(parsed.pathname).toBe('/mobile-auth');
    expect(parsed.searchParams.get('mode')).toBe('sign-up');
    expect(parsed.searchParams.get('experience')).toBe('innerbloom2');
    expect(parsed.searchParams.get('redirect_path')).toBe('/innerbloom2/dashboard');
    expect(parsed.searchParams.get('return_to')).toBe('innerbloom://auth-callback');
    expect(parsed.searchParams.get('fresh')).toBe('1');
  });
});
