import { describe, expect, it } from 'vitest';
import { buildRedirectUrl, shouldIncludeLegacyProfileImage } from '../MobileBrowserAuth';

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
    }));

    expect(callbackUrl.searchParams.get('token')).toBe(token);
    expect(callbackUrl.searchParams.get('auth_mode')).toBe(mode);
    expect(callbackUrl.searchParams.get('user_id')).toBe(user.id);
    expect(callbackUrl.searchParams.get('email')).toBe('test@example.com');
    expect(callbackUrl.searchParams.get('clerk_image_url')).toBe(user.imageUrl);
    expect(callbackUrl.searchParams.has('image_url')).toBe(false);
  });

  it('supports short compatibility dual-write when legacy flag is enabled', () => {
    const callbackUrl = new URL(buildRedirectUrl(baseUrl, user as never, token, mode, {
      includeLegacyImageUrl: true,
    }));

    expect(callbackUrl.searchParams.get('clerk_image_url')).toBe(user.imageUrl);
    expect(callbackUrl.searchParams.get('image_url')).toBe(user.imageUrl);
  });

  it('parses legacy_profile_image query flag safely', () => {
    expect(shouldIncludeLegacyProfileImage('?legacy_profile_image=1')).toBe(true);
    expect(shouldIncludeLegacyProfileImage('?legacy_profile_image=0')).toBe(false);
    expect(shouldIncludeLegacyProfileImage('')).toBe(false);
  });
});
