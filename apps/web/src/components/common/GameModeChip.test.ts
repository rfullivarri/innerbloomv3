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
  it('keeps rhythm label content and uses onboarding rhythm color mapping even when avatar differs', () => {
    const avatarProfile = resolveAvatarProfile(
      makeProfile({
        game_mode: 'Flow',
        avatar_id: 99,
        avatar_code: 'RED_CAT',
        avatar_name: 'Red Cat',
        avatar_theme_tokens: { accent: '#ef4444', chip: 'ember' },
      }),
    );

    const chip = buildGameModeChip('Flow', { avatarProfile });

    expect(chip.label).toBe('FLOW');
    expect(chip.style).toMatchObject({ '--ib-chip-accent': 'rgb(56, 189, 248)' });
  });

  it('falls back safely to FLOW rhythm accent when mode is missing', () => {
    const chip = buildGameModeChip('');
    expect(chip.style).toMatchObject({ '--ib-chip-accent': 'rgb(56, 189, 248)' });
  });

  it('maps every rhythm to the onboarding source-of-truth palette', () => {
    expect(buildGameModeChip('Low').style).toMatchObject({ '--ib-chip-accent': 'rgb(248, 113, 113)' });
    expect(buildGameModeChip('Chill').style).toMatchObject({ '--ib-chip-accent': 'rgb(74, 222, 128)' });
    expect(buildGameModeChip('Flow').style).toMatchObject({ '--ib-chip-accent': 'rgb(56, 189, 248)' });
    expect(buildGameModeChip('Evolve').style).toMatchObject({ '--ib-chip-accent': 'rgb(167, 139, 250)' });
  });
});
