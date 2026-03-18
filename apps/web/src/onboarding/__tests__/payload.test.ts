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
  it('serializes quick_start payload details when quick_start path is chosen', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn().mockReturnValue('cid-123'),
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
        mode: 'CHILL',
        email: 'quick@start.com',
        user_id: 'user_2',
        quickStart: {
          selectedTasksByPillar: {
            Body: ['ENERGIA', 'MODERACION'],
            Mind: ['ENFOQUE'],
            Soul: ['CONEXION'],
          },
          editableTaskValues: {
            'Body-ENERGIA': '20',
          },
          selectedModerations: ['sugar'],
        },
      },
      { Body: 6, Mind: 3, Soul: 3, total: 12 },
      'quick_start',
    );

    expect(payload.meta.onboarding_path).toBe('quick_start');
    expect(payload.data.quick_start?.selected_moderations).toEqual(['sugar']);
    expect(payload.data.quick_start?.selected_tasks_by_pillar.body).toContain('MODERACION');
    expect(payload.data.foundations.body).toContain('MODERACION');
    expect(payload.data.quick_start?.manual_task_candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        task: 'Caminar durante',
        pillar_code: 'BODY',
        trait_code: 'ENERGIA',
        input_value: '20',
        metadata: expect.objectContaining({
          task_id: 'ENERGIA',
          task_prefix: 'Caminar durante',
          task_input_after: 'minutos',
        }),
      }),
      expect.objectContaining({
        task: 'Mejorar mi relación con ciertos consumos o excesos',
        pillar_code: 'BODY',
        trait_code: 'MODERACION',
      }),
    ]));

    vi.unstubAllGlobals();
  });
});
