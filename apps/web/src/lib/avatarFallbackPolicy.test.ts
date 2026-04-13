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

    expect(lowFallback?.avatarCode).toBe('BLUE_AMPHIBIAN');
    expect(evolveFallback?.avatarCode).toBe('BLUE_AMPHIBIAN');
    expect(lowFallback?.fallbackReason).toBe('missing-avatar-payload');
    expect(evolveFallback?.fallbackReason).toBe('missing-avatar-payload');
  });

  it('uses deterministic default avatar option when resolver input is empty', () => {
    const resolved = resolveAvatarOption(null);
    expect(resolved.avatarId).toBe(1);
    expect(resolved.code).toBe('BLUE_AMPHIBIAN');
  });

  it('maps legacy avatar codes to the new identity catalog safely', () => {
    const resolved = resolveAvatarOption({
      avatarId: null,
      avatarCode: 'LEGACY_LOW',
      avatarName: 'Legacy Low',
      theme: { accent: '#58CC02', chip: 'leaf' },
      isLegacyFallback: true,
      fallbackReason: 'missing-avatar-payload',
    });

    expect(resolved.avatarId).toBe(3);
    expect(resolved.code).toBe('RED_CAT');
  });
});
