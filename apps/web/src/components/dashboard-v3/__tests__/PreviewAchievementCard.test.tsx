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
      slots: ['valid', 'projected_floor_only', 'empty'],
    },
    recentMonths: [
      { periodKey: '2026-01', value: 42, state: 'weak' },
      { periodKey: '2026-02', value: 61, state: 'building' },
      { periodKey: '2026-03', value: 72, state: 'strong' },
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
    expect(screen.getByTestId('score-affordance')).toHaveTextContent('Score');
    expect(screen.getByTestId('score-affordance')).toHaveTextContent('fuerza actual del hábito');
  });

  test('does not render a separate seal-window chart and uses unified timeline guidance copy', () => {
    renderCard();
    expect(screen.queryByText('Ventana al sello')).not.toBeInTheDocument();
    expect(screen.queryByTestId('seal-window-title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('active-window-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('timeline-window-subtitle')).toHaveTextContent('Los últimos 3 meses cuentan para el sello');
  });

  test('renders recent month timeline as circular nodes with visible labels and no current text marker', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', value: 89, state: 'strong' },
        { periodKey: '2026-02', value: 42, state: 'weak' },
        { periodKey: '2026-03', value: 0, state: 'bad' },
        { periodKey: '2026-04', value: 65, state: 'projected_valid' },
      ],
    });
    const months = screen.getAllByTestId('recent-month-item');
    expect(months).toHaveLength(4);
    const nodes = screen.getAllByTestId('recent-month-node');
    expect(nodes).toHaveLength(4);
    nodes.forEach((node) => {
      expect(node.className).toContain('rounded-full');
    });
    expect(within(months[0]).getByText('✓')).toBeInTheDocument();
    expect(within(months[1]).getByText('•')).toBeInTheDocument();
    expect(within(months[2]).getByText('✕')).toBeInTheDocument();
    expect(within(months[3]).getByText('~')).toBeInTheDocument();
    expect(within(months[0]).getByText('ene')).toBeInTheDocument();
    expect(within(months[3]).getByText('abr')).toBeInTheDocument();
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recent-month-label')).toHaveLength(4);
  });

  test('highlights the last 3 months in a single grouped window within the same timeline', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2025-11', value: 25, state: 'invalid' },
        { periodKey: '2025-12', value: 59, state: 'building' },
        { periodKey: '2026-01', value: 89, state: 'strong' },
        { periodKey: '2026-02', value: 42, state: 'weak' },
        { periodKey: '2026-03', value: 0, state: 'bad' },
        { periodKey: '2026-04', value: 65, state: 'projected_valid' },
      ],
    });

    const groupedWindow = screen.getByTestId('seal-window-group');
    const groupedItems = within(groupedWindow).getAllByTestId('recent-month-item');
    const groupedLabels = within(groupedWindow).getAllByTestId('recent-month-label').map((label) => label.textContent);

    expect(groupedItems).toHaveLength(3);
    expect(groupedLabels).toEqual(['feb', 'mar', 'abr']);
  });

  test('renders recent history in chronological order so current stays on the right', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-04', value: 65, state: 'projected_valid' },
        { periodKey: '2026-01', value: 89, state: 'strong' },
        { periodKey: '2026-03', value: 0, state: 'bad' },
        { periodKey: '2026-02', value: 42, state: 'weak' },
      ],
    });

    expect(screen.getByText('Historial reciente')).toBeInTheDocument();

    const labels = screen.getAllByTestId('recent-month-label').map((label) => label.textContent);
    expect(labels).toEqual(['ene', 'feb', 'mar', 'abr']);
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
  });

  test('keeps month nodes aligned with a background grouped window for the last 3 months', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', value: 80, state: 'strong' },
        { periodKey: '2026-02', value: 70, state: 'building' },
        { periodKey: '2026-03', value: 55, state: 'floor_only' },
        { periodKey: '2026-04', value: 63, state: 'projected_valid' },
      ],
    });
    const timeline = screen.getByTestId('recent-timeline');
    const items = within(timeline).getAllByTestId('recent-month-item');
    items.forEach((item) => {
      expect(item.className).toContain('flex-col');
      expect(item.className).toContain('items-center');
    });
    const groupedWindow = screen.getByTestId('seal-window-group');
    expect(groupedWindow.className).toContain('rounded-2xl');
    expect(groupedWindow.className).toContain('bg-white/5');
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
  });

  test('does not crash when recent month item is missing periodKey/month', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-04', value: 65, state: 'projected_valid' },
        { value: 22, state: 'building' },
      ],
    });

    expect(screen.getAllByTestId('recent-month-item')).toHaveLength(2);
    expect(screen.getByText('Sin mes')).toBeInTheDocument();
  });

  test('renders fallback labels with partial preview payload', () => {
    renderCard({
      windowProximity: {
        slots: ['valid', { id: 'slot-b', state: null }, 'projected_invalid'],
      },
      recentMonths: [
        { month: '2026-02', state: 'building' },
        { state: null },
      ],
    });

    const monthLabels = screen.getAllByTestId('recent-month-label').map((node) => node.textContent);
    expect(monthLabels).toEqual(['feb', 'Sin mes']);
    expect(screen.getByTestId('timeline-window-subtitle')).toBeInTheDocument();
  });
});
