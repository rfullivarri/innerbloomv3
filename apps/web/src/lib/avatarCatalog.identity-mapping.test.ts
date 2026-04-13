import { describe, expect, it } from 'vitest';
import { getAvatarOptionById, resolveAvatarOption } from './avatarCatalog';
import { resolveAvatarProfile } from './avatarProfile';
import type { CurrentUserProfile } from './api';

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

describe('avatar identity mapping catalog', () => {
  it('maps avatar ids to the intended identity colors', () => {
    expect(getAvatarOptionById(1)).toMatchObject({ code: 'BLUE_AMPHIBIAN', accent: '#00C2FF' });
    expect(getAvatarOptionById(2)).toMatchObject({ code: 'GREEN_BEAR', accent: '#58CC02' });
    expect(getAvatarOptionById(3)).toMatchObject({ code: 'RED_CAT', accent: '#EF4444' });
    expect(getAvatarOptionById(4)).toMatchObject({ code: 'VIOLET_OWL', accent: '#A855F7' });
  });

  it('keeps avatar resolution independent from rhythm names', () => {
    const profileFromLow = resolveAvatarProfile(makeProfile({ game_mode: 'Low', avatar_id: 1 }));
    const profileFromFlow = resolveAvatarProfile(makeProfile({ game_mode: 'Flow', avatar_id: 1 }));

    expect(resolveAvatarOption(profileFromLow).code).toBe('BLUE_AMPHIBIAN');
    expect(resolveAvatarOption(profileFromFlow).code).toBe('BLUE_AMPHIBIAN');
  });

  it('supports persisted legacy codes via compatibility aliases', () => {
    const resolved = resolveAvatarOption({
      avatarId: null,
      avatarCode: 'LEGACY_FLOW',
      avatarName: 'Legacy Flow',
      theme: { accent: '#A855F7', chip: 'violet' },
      isLegacyFallback: true,
      fallbackReason: 'missing-avatar-payload',
    });

    expect(resolved).toMatchObject({ avatarId: 1, code: 'BLUE_AMPHIBIAN' });
  });
});
