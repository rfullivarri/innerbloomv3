import { describe, expect, it } from 'vitest';
import {
  AVATAR_ASSET_FOLDERS,
  buildAvatarBaseStillPath,
  buildAvatarRhythmMatrixPath,
  buildRhythmPlaceholderPath,
  normalizeAvatarAssetCode,
  resolveAssetPathByTier,
  resolveSurfaceAssetTier,
} from '../avatarAssetContract';

describe('avatar asset contract', () => {
  it('builds deterministic naming for avatar/rhythm folders', () => {
    expect(AVATAR_ASSET_FOLDERS.root).toBe('/avatars/v1');
    expect(buildAvatarBaseStillPath('Amphibian Blue')).toBe('/avatars/v1/identity-base/avatar-amphibian-blue-base.png');
    expect(buildRhythmPlaceholderPath('FLOW')).toBe('/avatars/v1/rhythm-placeholder/rhythm-flow-placeholder.png');
    expect(buildAvatarRhythmMatrixPath('Cat', 'LOW')).toBe('/avatars/v1/matrix-image/avatar-cat-low.png');
  });

  it('maps surfaces to the intended asset tiers', () => {
    expect(resolveSurfaceAssetTier('avatar-picker')).toBe('avatar-base');
    expect(resolveSurfaceAssetTier('rhythm-picker')).toBe('rhythm-placeholder');
    expect(resolveSurfaceAssetTier('onboarding-rhythm')).toBe('rhythm-placeholder');
    expect(resolveSurfaceAssetTier('dashboard-profile-rich')).toBe('avatar-rhythm-matrix');
    expect(resolveSurfaceAssetTier('profile-fallback')).toBe('avatar-base');
  });

  it('falls back to deterministic contract paths when payload urls are missing', () => {
    expect(
      resolveAssetPathByTier({
        avatarCode: 'Bear',
        rhythm: 'EVOLVE',
        tier: 'avatar-rhythm-matrix',
        apiAssets: null,
      }),
    ).toBe('/avatars/v1/matrix-image/avatar-bear-evolve.png');
  });

  it('uses api payload url if provided', () => {
    expect(
      resolveAssetPathByTier({
        avatarCode: 'Bear',
        rhythm: 'EVOLVE',
        tier: 'avatar-rhythm-matrix',
        apiAssets: {
          matrix_images: {
            EVOLVE: 'https://cdn.example.com/avatar-bear-evolve.png',
          },
        },
      }),
    ).toBe('https://cdn.example.com/avatar-bear-evolve.png');
  });

  it('normalizes empty avatar code to deterministic default without mode-derived inference', () => {
    expect(normalizeAvatarAssetCode('')).toBe('legacy-chill');
    expect(normalizeAvatarAssetCode('   ')).toBe('legacy-chill');
  });
});
