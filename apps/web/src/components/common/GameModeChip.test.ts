import { describe, expect, it } from 'vitest';
import { buildGameModeChip } from './GameModeChip';
import { resolveAvatarProfile } from '../../lib/avatarProfile';
import type { CurrentUserProfile } from '../../lib/api';

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

describe('buildGameModeChip', () => {
  it('keeps rhythm label content while using avatar accent styling', () => {
    const avatarProfile = resolveAvatarProfile(
      makeProfile({
        game_mode: 'Flow',
        avatar_id: 99,
        avatar_code: 'RED_CAT',
        avatar_name: 'Red Cat',
        avatar_theme_tokens: { accent: '#F87171', chip: 'ember' },
      }),
    );

    const chip = buildGameModeChip('Flow', { avatarProfile });

    expect(chip.label).toBe('FLOW');
    expect(chip.style).toMatchObject({ '--ib-chip-accent': '#F56767' });
  });

  it('uses safe legacy fallback accent when avatar is missing', () => {
    const chip = buildGameModeChip('Flow');
    expect(chip.style).toMatchObject({ '--ib-chip-accent': '#32AEE4' });
  });
});
