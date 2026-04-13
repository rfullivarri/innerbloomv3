import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';
import {
  changeUserGameMode,
  resolveGameModeByCode,
  resolveGameModeImageUrl,
} from '../userGameModeChangeService.js';

describe('userGameModeChangeService', () => {
  it('resolves game mode image URLs with WEB_PUBLIC_BASE_URL', () => {
    process.env.WEB_PUBLIC_BASE_URL = 'https://example.com/app/';
    expect(resolveGameModeImageUrl('flow')).toBe('https://example.com/app/FlowMood.jpg');
    delete process.env.WEB_PUBLIC_BASE_URL;
  });

  it('updates only game mode without mutating avatar/image fields', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'u1', game_mode_id: 12, image_url: '/Chill-Mood.jpg', avatar_url: '/Chill-Mood.jpg' }] });

    const result = await changeUserGameMode({ query }, {
      userId: 'u1',
      nextGameModeId: 12,
      nextModeCode: 'CHILL',
      expectedCurrentGameModeId: 11,
    });

    expect(result).toMatchObject({
      user_id: 'u1',
      game_mode_id: 12,
      image_url: '/Chill-Mood.jpg',
      avatar_url: '/Chill-Mood.jpg',
    });

    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0]?.[0] ?? '');
    const setClause = sql.split('WHERE')[0] ?? '';
    expect(setClause).toContain('SET game_mode_id = $2');
    expect(setClause).not.toContain('image_url =');
    expect(setClause).not.toContain('avatar_url =');
    expect(query.mock.calls[0]?.[1]).toEqual(['u1', 12, 11]);
  });

  it('throws conflict when optimistic condition no longer matches', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'u1', game_mode_id: 13 }] });

    await expect(
      changeUserGameMode({ query }, {
        userId: 'u1',
        nextGameModeId: 12,
        nextModeCode: 'CHILL',
        expectedCurrentGameModeId: 11,
      }),
    ).rejects.toMatchObject<HttpError>({
      status: 409,
      code: 'game_mode_change_conflict',
    });
  });

  it('resolves valid game mode by code', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ game_mode_id: 12, code: 'CHILL' }] });
    const result = await resolveGameModeByCode({ query }, 'chill');
    expect(result).toEqual({ game_mode_id: 12, code: 'CHILL' });
  });
});
