import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PremiumRewardsSection } from './PremiumRewardsSection';

vi.mock('../../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({
    language: 'en' as const,
    t: (key: string, params?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        'mobilePremium.rewards.habitsAchieved': 'Achieved habits',
        'mobilePremium.rewards.achievedCarouselA11y': 'Achievement carousel',
        'mobilePremium.rewards.noHabits': 'No habits',
        'mobilePremium.pillar.body': 'Body',
        'mobilePremium.pillar.mind': 'Mind',
        'mobilePremium.pillar.soul': 'Soul',
      };
      return labels[key] ?? key.replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? ''));
    },
  }),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
});

describe('PremiumRewardsSection all achievements grid', () => {
  it('keeps the Innerbloom 2.0 carousel as default and opens the global grid', () => {
    render(<PremiumRewardsSection backendUserId={null} />);

    expect(screen.getByLabelText('Achievement carousel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open all achievements grid' }));

    expect(screen.queryByLabelText('Achievement carousel')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All Achievements' })).toBeInTheDocument();
    const pillarHeadings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(pillarHeadings.slice(0, 3)).toEqual(['Body', 'Mind', 'Soul']);
  });
});
