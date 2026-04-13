import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpgradeRecommendationModal } from '../UpgradeRecommendationModal';

vi.mock('../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string>) => {
      const dict: Record<string, string> = {
        'dashboard.upgradeCta.modalEyebrow': 'RHYTHM RECOMMENDATION',
        'dashboard.upgradeCta.modalTitle': `Adjust your rhythm from ${params?.currentMode ?? ''} to ${params?.nextMode ?? ''}`,
        'dashboard.upgradeCta.modalBody': 'Body',
        'dashboard.upgradeCta.dragHint': 'Slide to confirm your rhythm change',
        'dashboard.upgradeCta.viewAllModes': 'View all rhythms',
        'dashboard.upgradeCta.close': 'Close',
        'dashboard.upgradeCta.nowTag': 'NOW',
        'dashboard.upgradeCta.nextTag': 'NEXT',
      };
      return dict[key] ?? key;
    },
  }),
}));

describe('UpgradeRecommendationModal', () => {
  it('renders rhythm-first current and next intensity labels', () => {
    render(
      <UpgradeRecommendationModal
        open
        currentMode="flow"
        nextMode="evolve"
        avatarProfile={null}
        isSubmitting={false}
        onConfirm={async () => {}}
        onClose={() => {}}
        onOpenAllModes={() => {}}
      />,
    );

    expect(screen.getByText('NOW')).toBeInTheDocument();
    expect(screen.getByText('NEXT')).toBeInTheDocument();
    expect(screen.getByText('Flow · 3x/week')).toBeInTheDocument();
    expect(screen.getByText('Evolve · 4x/week')).toBeInTheDocument();
  });
});
