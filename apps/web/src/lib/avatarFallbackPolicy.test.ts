import { describe, expect, it } from 'vitest';
import type { CurrentUserProfile } from './api';
import { resolveAvatarProfile } from './avatarProfile';
import { resolveAvatarOption } from './avatarCatalog';

function makeProfile(overrides: Partial<CurrentUserProfile>): CurrentUserProfile {
  return {
    user_id: 'user-1',
    clerk_user_id: 'clerk-1',
    email_primary: 'test@example.com',
    full_name: 'Test User',
    game_mode: 'Flow',
    weekly_target: 3,
    image_url: null,
    avatar_id: null,
    avatar_code: null,
    avatar_name: null,
    avatar_theme_tokens: null,
    timezone: 'UTC',
    locale: 'en',
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('avatar fallback policy', () => {
  it('does not infer avatar identity from game_mode when avatar payload is missing', () => {
    const lowFallback = resolveAvatarProfile(makeProfile({ game_mode: 'Low' }));
    const evolveFallback = resolveAvatarProfile(makeProfile({ game_mode: 'Evolve' }));

    expect(lowFallback?.avatarCode).toBe('LEGACY_CHILL');
    expect(evolveFallback?.avatarCode).toBe('LEGACY_CHILL');
    expect(lowFallback?.fallbackReason).toBe('missing-avatar-payload');
    expect(evolveFallback?.fallbackReason).toBe('missing-avatar-payload');
  });

  it('uses deterministic default avatar option when resolver input is empty', () => {
    const resolved = resolveAvatarOption(null);
    expect(resolved.avatarId).toBe(2);
    expect(resolved.code).toBe('LEGACY_CHILL');
  });
});
