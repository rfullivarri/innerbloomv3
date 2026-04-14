import { describe, expect, it } from 'vitest';
import { buildStreakModeChipVisual } from './StreaksPanel';
import { resolveAvatarProfile } from '../../lib/avatarProfile';
import type { CurrentUserProfile } from '../../lib/api';

function makeProfile(overrides: Partial<CurrentUserProfile>): CurrentUserProfile {
  return {
    user_id: 'user-1',
    clerk_user_id: 'clerk-1',
    email_primary: 'test@example.com',
    full_name: 'Test User',
    image_url: null,
    game_mode: 'Flow',
    weekly_target: 3,
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

describe('buildStreakModeChipVisual', () => {
  it('uses avatar theme accent regardless of rhythm content', () => {
    const avatarProfile = resolveAvatarProfile(
      makeProfile({
        game_mode: 'Flow',
        avatar_id: 7,
        avatar_code: 'RED_CAT',
        avatar_name: 'Red Cat',
        avatar_theme_tokens: { accent: '#F87171', chip: 'ember' },
      }),
    );

    const visual = buildStreakModeChipVisual(avatarProfile);

    expect(visual.accent).toBe('#F87171');
    expect(visual.glowPrimary).toContain('248, 113, 113');
    expect(visual.glowSecondary).toContain('248, 113, 113');
  });

  it('falls back safely when avatar profile is unavailable', () => {
    const visual = buildStreakModeChipVisual(null);
    expect(visual.accent).toBe('#38BDF8');
  });
});
