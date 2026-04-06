import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PreviewAchievementCard } from '../PreviewAchievementCard';
import type { TaskInsightsResponse } from '../../../lib/api';

type PreviewAchievement = NonNullable<TaskInsightsResponse['previewAchievement']>;

function renderCard(overrides: Partial<PreviewAchievement> = {}) {
  const previewAchievement: PreviewAchievement = {
    score: 72,
    status: 'building',
    consolidationStrength: 66,
    windowProximity: {
      slots: [
        { id: 'm1', label: 'M1', state: 'valid' },
        { id: 'm2', label: 'M2', state: 'pending' },
        { id: 'm3', label: 'M3', state: 'locked' },
      ],
    },
    recentMonths: [
      { month: '2026-01', value: 42, state: 'weak' },
      { month: '2026-02', value: 61, state: 'building' },
      { month: '2026-03', value: 72, state: 'strong' },
    ],
    ...overrides,
  };

  return render(<PreviewAchievementCard previewAchievement={previewAchievement} language="es" />);
}

describe('PreviewAchievementCard', () => {
  test('renders fragile chip from backend status', () => {
    renderCard({ status: 'fragile' });
    expect(screen.getByText('Hábito frágil')).toBeInTheDocument();
  });

  test('renders building chip from backend status', () => {
    renderCard({ status: 'building' });
    expect(screen.getByText('Hábito en construcción')).toBeInTheDocument();
  });

  test('renders strong chip from backend status', () => {
    renderCard({ status: 'strong' });
    expect(screen.getByText('Hábito fuerte')).toBeInTheDocument();
  });

  test('shows score in donut', () => {
    renderCard({ score: 88 });
    expect(screen.getByLabelText('preview achievement score 88')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByTestId('score-affordance')).toHaveTextContent('fuerza actual');
  });

  test('renders 3-slot window indicator with semantic symbols', () => {
    renderCard({
      windowProximity: {
        slots: [
          { id: 'm1', label: 'M1', state: 'valid' },
          { id: 'm2', label: 'M2', state: 'projected_floor_only' },
          { id: 'm3', label: 'M3', state: 'empty' },
        ],
      },
    });
    const slots = screen.getAllByTestId('window-slot');
    expect(slots).toHaveLength(3);
    expect(slots[0]).toHaveAttribute('data-slot-symbol', '✓');
    expect(slots[1]).toHaveAttribute('data-slot-symbol', '~');
    expect(slots[2]).toHaveAttribute('data-slot-symbol', '○');
  });

  test('renders recent month timeline as state chips', () => {
    renderCard({
      recentMonths: [
        { month: '2026-01', value: 89, state: 'strong' },
        { month: '2026-02', value: 42, state: 'weak' },
        { month: '2026-03', value: 0, state: 'bad' },
        { month: '2026-04', value: 65, state: 'projected_valid' },
      ],
    });
    const months = screen.getAllByTestId('recent-month-item');
    expect(months).toHaveLength(4);
    expect(within(months[0]).getByText('✓')).toBeInTheDocument();
    expect(within(months[1]).getByText('•')).toBeInTheDocument();
    expect(within(months[2]).getByText('✕')).toBeInTheDocument();
    expect(within(months[3]).getByText('~')).toBeInTheDocument();
    expect(within(months[0]).getByText('ene')).toBeInTheDocument();
    expect(within(months[3]).getByText('abr')).toBeInTheDocument();
  });
});
