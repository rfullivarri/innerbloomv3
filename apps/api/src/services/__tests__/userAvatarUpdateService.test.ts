import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';
import { resolveAvatarById, updateUserAvatar } from '../userAvatarUpdateService.js';

describe('userAvatarUpdateService', () => {
  it('updates avatar only and preserves rhythm fields', async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rows: [{
        user_id: 'u1',
        avatar_id: 7,
        game_mode_id: 12,
        image_url: '/FlowMood.jpg',
        avatar_url: '/FlowMood.jpg',
      }],
    });

    const updated = await updateUserAvatar({ query }, { userId: 'u1', avatarId: 7 });

    expect(updated).toMatchObject({
      user_id: 'u1',
      avatar_id: 7,
      game_mode_id: 12,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('SET avatar_id = $2');
    expect(query.mock.calls[0]?.[0]).not.toContain('game_mode_id =');
  });

  it('validates active avatar id', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ avatar_id: 7 }] });
    await expect(resolveAvatarById({ query }, 7)).resolves.toEqual({ avatar_id: 7 });
  });

  it('throws invalid_avatar for missing catalog entries', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] });
    await expect(resolveAvatarById({ query }, 999)).rejects.toMatchObject<HttpError>({
      status: 409,
      code: 'invalid_avatar',
    });
  });
});
