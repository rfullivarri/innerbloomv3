import { describe, expect, it } from 'vitest';
import { hasModerationSelection } from '../moderationOnboarding';

describe('hasModerationSelection', () => {
  it('detects moderation entries in Spanish and English labels', () => {
    expect(
      hasModerationSelection([
        '🚫 Reduce alcohol, tobacco, or caffeine consumption (Moderation)',
      ]),
    ).toBe(true);

    expect(
      hasModerationSelection([
        '🚫 Reducir consumo de alcohol, tabaco o cafeína (Moderación)',
      ]),
    ).toBe(true);
  });

  it('returns false when moderation was not selected', () => {
    expect(
      hasModerationSelection([
        '😴 Better sleep and recovery (Sleep)',
        '💧 Drink more water / better hydration (Hydration)',
      ]),
    ).toBe(false);
  });
});
