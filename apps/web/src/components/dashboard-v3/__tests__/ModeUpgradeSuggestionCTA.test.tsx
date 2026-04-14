import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModeUpgradeSuggestionCTA } from '../ModeUpgradeSuggestionCTA';

const acceptMock = vi.fn();
const dismissMock = vi.fn();

vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual('../../../lib/api');
  return {
    ...actual,
    acceptGameModeUpgradeSuggestion: (...args: unknown[]) => acceptMock(...args),
    dismissGameModeUpgradeSuggestion: (...args: unknown[]) => dismissMock(...args),
  };
});

vi.mock('../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const dict: Record<string, string> = {
        'dashboard.upgradeCta.closeAria': 'Cerrar upgrade',
        'dashboard.menu.upgradeAvailable': 'Upgrade disponible',
        'dashboard.upgradeCta.bannerTitle': 'Estás listo para el siguiente nivel',
        'dashboard.upgradeCta.bannerBody': 'Texto banner',
        'dashboard.upgradeCta.bannerAction': 'Continuar',
        'dashboard.upgradeCta.welcomeToast': `Bienvenido a tu nuevo ritmo ${params?.nextMode ?? ''}`,
      };
      return dict[key] ?? key;
    },
  }),
}));

vi.mock('../UpgradeRecommendationModal', () => ({
  UpgradeRecommendationModal: ({ open, onConfirm, onAcceptedSuccess }: { open: boolean; onConfirm: () => Promise<void>; onAcceptedSuccess?: (nextMode: string | null) => void }) => {
    if (!open) return null;
    return (
      <button
        type="button"
        onClick={() => {
          void onConfirm();
          void onConfirm();
          onAcceptedSuccess?.('EVOLVE');
        }}
      >
        Trigger confirm
      </button>
    );
  },
}));

const baseSuggestion = {
  current_mode: 'flow',
  suggested_mode: 'evolve',
  period_key: '2026-W10',
  eligible_for_upgrade: true,
  tasks_total_evaluated: 5,
  tasks_meeting_goal: 5,
  task_pass_rate: 1,
  accepted_at: null,
  dismissed_at: null,
  cta_enabled: true,
  cta_active_until: null,
  debug_forced_cta: false,
};

describe('ModeUpgradeSuggestionCTA', () => {
  it('prevents duplicate accept submissions and shows welcome toast', async () => {
    acceptMock.mockResolvedValue({ ok: true, suggestion: { ...baseSuggestion, accepted_at: '2026-01-01T00:00:00Z' } });
    const onUpgradeAccepted = vi.fn();
    const onSuggestionChange = vi.fn();

    render(
      <ModeUpgradeSuggestionCTA
        suggestion={baseSuggestion}
        onUpgradeAccepted={onUpgradeAccepted}
        onSuggestionChange={onSuggestionChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger confirm' }));

    await waitFor(() => expect(acceptMock).toHaveBeenCalledTimes(1));
    expect(onUpgradeAccepted).toHaveBeenCalledWith('evolve');
    expect(onSuggestionChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Bienvenido a tu nuevo ritmo EVOLVE')).toBeInTheDocument();
  });
});
