import { describe, expect, it } from 'vitest';
import { resolveAvatarChipColor } from './avatarChipPalette';
import { buildAvatarPreviewProfile } from './avatarCatalog';

describe('resolveAvatarChipColor', () => {
  it('maps each avatar code to the softened dashboard chip palette', () => {
    expect(resolveAvatarChipColor(buildAvatarPreviewProfile({ avatarId: 3, code: 'RED_CAT', name: 'Red Cat', accent: '#EF4444', chip: 'ember' }))).toBe('#F87171');
    expect(resolveAvatarChipColor(buildAvatarPreviewProfile({ avatarId: 2, code: 'GREEN_BEAR', name: 'Green Bear', accent: '#58CC02', chip: 'leaf' }))).toBe('#4ADE80');
    expect(resolveAvatarChipColor(buildAvatarPreviewProfile({ avatarId: 1, code: 'BLUE_AMPHIBIAN', name: 'Blue Amphibian', accent: '#00C2FF', chip: 'aqua' }))).toBe('#38BDF8');
    expect(resolveAvatarChipColor(buildAvatarPreviewProfile({ avatarId: 4, code: 'VIOLET_OWL', name: 'Violet Owl', accent: '#A855F7', chip: 'violet' }))).toBe('#A78BFA');
  });

  it('falls back to blue amphibian color when avatar profile is missing', () => {
    expect(resolveAvatarChipColor(null)).toBe('#38BDF8');
  });
});
