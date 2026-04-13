import { describe, expect, it } from 'vitest';
import { AVATAR_OPTIONS, resolveTemporaryLegacyAvatarPreviewImage } from './avatarCatalog';

describe('resolveTemporaryLegacyAvatarPreviewImage', () => {
  it('maps each avatar option to the temporary legacy GMO preview image', () => {
    const byCode = Object.fromEntries(
      AVATAR_OPTIONS.map((option) => [option.code, resolveTemporaryLegacyAvatarPreviewImage(option)]),
    );

    expect(byCode).toEqual({
      BLUE_AMPHIBIAN: '/flowGMO.png',
      GREEN_BEAR: '/chillGMO.png',
      RED_CAT: '/lowGMO.png',
      VIOLET_OWL: '/evolveGMO.png',
    });
  });

  it('returns distinct preview images across all 4 avatar cards', () => {
    const previewImages = AVATAR_OPTIONS.map((option) => resolveTemporaryLegacyAvatarPreviewImage(option));
    expect(new Set(previewImages).size).toBe(4);
  });
});
