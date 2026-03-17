import { describe, expect, it, vi } from 'vitest';
import { buildPayload } from '../payload';
import { initialAnswers, initialXP } from '../state';

describe('buildPayload onboarding_path', () => {
  it('includes onboarding_path when provided', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      },
      navigator: {
        language: 'es-AR',
        userAgent: 'Mozilla/5.0',
      },
      crypto: {
        randomUUID: vi.fn().mockReturnValue('cid-123'),
      },
    });

    const payload = buildPayload(
      {
        ...initialAnswers,
        mode: 'FLOW',
        email: 'TEST@EXAMPLE.COM',
        user_id: 'user_1',
      },
      initialXP,
      'traditional',
    );

    expect(payload.meta.onboarding_path).toBe('traditional');
    expect(payload.email).toBe('test@example.com');

    vi.unstubAllGlobals();
  });
});

