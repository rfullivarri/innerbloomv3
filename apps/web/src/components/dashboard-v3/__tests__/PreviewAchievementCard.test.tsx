import { fireEvent, render, screen, within } from '@testing-library/react';
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
      { periodKey: '2026-01', closed: true, completionRate: 0.42, state: 'invalid' },
      { periodKey: '2026-02', closed: true, completionRate: 0.61, state: 'floor_only' },
      { periodKey: '2026-03', closed: true, completionRate: 0.72, state: 'valid' },
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
    expect(screen.getByTestId('score-donut')).toHaveAttribute('class', expect.stringContaining('h-24'));
    expect(screen.getByTestId('score-donut')).toHaveAttribute('class', expect.stringContaining('w-24'));
    expect(screen.getByTestId('score-affordance')).toHaveTextContent('Score');
    expect(screen.getByTestId('score-affordance')).toHaveTextContent('fuerza actual del hábito');
    expect(screen.getByTestId('score-info-dot').className).toContain('bg-white/20');
  });

  test('does not render a separate seal-window chart or timeline guidance copy', () => {
    renderCard();
    expect(screen.queryByText('Ventana al sello')).not.toBeInTheDocument();
    expect(screen.queryByTestId('seal-window-title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('active-window-label')).not.toBeInTheDocument();
    expect(screen.queryByText('Cerrados = logrado mensual · actual = proyectado al ritmo actual')).not.toBeInTheDocument();
  });

  test('renders recent month timeline as circular nodes with visible labels and compact progress text', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.89, state: 'valid' },
        { periodKey: '2026-02', closed: true, completionRate: 0.42, state: 'weak' },
        { periodKey: '2026-03', closed: true, completionRate: 0, state: 'bad' },
        { periodKey: '2026-04', closed: false, completionRate: 0.53, projectedCompletionRate: 0.65, state: 'projected_valid' },
      ],
    });
    const months = screen.getAllByTestId('recent-month-item');
    expect(months).toHaveLength(4);
    const nodes = screen.getAllByTestId('recent-month-node');
    expect(nodes).toHaveLength(4);
    nodes.forEach((node) => {
      expect(node.className).toContain('rounded-full');
      expect(node.className).not.toContain(' border ');
    });
    expect(within(months[0]).getByText('✓')).toBeInTheDocument();
    expect(within(months[1]).getByText('✕')).toBeInTheDocument();
    expect(within(months[2]).getByText('✕')).toBeInTheDocument();
    expect(within(months[3]).getByLabelText('2026-04-projected_valid').querySelector('.animate-spin')).not.toBeNull();
    expect(within(months[0]).getByText('ene')).toBeInTheDocument();
    expect(within(months[3]).getByText('abr')).toBeInTheDocument();
    const progress = screen.getAllByTestId('recent-month-progress').map((node) => node.textContent);
    expect(progress).toEqual(['89%', '42%', '0%', '65%']);
    expect(screen.queryByTestId('recent-month-value-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recent-timeline-projection-note')).not.toBeInTheDocument();
    expect(screen.getByText('proyectado')).toBeInTheDocument();
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recent-month-label')).toHaveLength(4);
  });


  test('formats monthly ratios as percentages above 100 when needed', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.8, state: 'building' },
        { periodKey: '2026-02', closed: true, completionRate: 1, state: 'strong' },
        { periodKey: '2026-03', closed: true, completionRate: 1.25, state: 'strong' },
        { periodKey: '2026-04', closed: true, completionRate: 2.256, state: 'strong' },
        { periodKey: '2026-05', closed: false, projectedCompletionRate: 2, state: 'projected_valid' },
      ],
    });

    expect(screen.getAllByTestId('recent-month-progress').map((node) => node.textContent)).toEqual(['80%', '100%', '125%', '226%', '200%']);
  });


  test('formats tiny, projected and negative ratios consistently for monthly preview values', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.01, state: 'building' },
        { periodKey: '2026-02', closed: true, completionRate: -0.4, state: 'invalid' },
        { periodKey: '2026-03', closed: false, projectedCompletionRate: 2, state: 'projected_valid' },
      ],
    });

    expect(screen.getAllByTestId('recent-month-progress').map((node) => node.textContent)).toEqual(['1%', '0%', '200%']);
  });

  test('highlights the last 3 months in a grouped window that spans the intended 3-month range', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2025-11', closed: true, completionRate: 0.25, state: 'invalid' },
        { periodKey: '2025-12', closed: true, completionRate: 0.59, state: 'building' },
        { periodKey: '2026-01', closed: true, completionRate: 0.89, state: 'strong' },
        { periodKey: '2026-02', closed: true, completionRate: 0.42, state: 'weak' },
        { periodKey: '2026-03', closed: true, completionRate: 0, state: 'bad' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.65, state: 'projected_valid' },
      ],
    });

    const groupedWindow = screen.getByTestId('seal-window-group');
    expect(groupedWindow.className).toContain('rounded-xl');
    expect(groupedWindow.className).not.toContain('pointer-events-none');
    expect(groupedWindow).toHaveAttribute('data-window-start', '3');
    expect(groupedWindow).toHaveAttribute('data-window-end', '5');
    expect(groupedWindow.getAttribute('style')).toBeNull();
    expect(within(groupedWindow).getAllByTestId('recent-month-item')).toHaveLength(3);

    const labels = screen.getAllByTestId('recent-month-label').map((label) => label.textContent);
    expect(labels).toEqual(['nov', 'dic', 'ene', 'feb', 'mar', 'abr']);
    expect(labels.slice(-3)).toEqual(['feb', 'mar', 'abr']);
  });

  test('renders recent history in chronological order so current stays on the right', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.65, state: 'projected_valid' },
        { periodKey: '2026-01', closed: true, completionRate: 0.89, state: 'strong' },
        { periodKey: '2026-03', closed: true, completionRate: 0, state: 'bad' },
        { periodKey: '2026-02', closed: true, completionRate: 0.42, state: 'weak' },
      ],
    });

    expect(screen.getByText('Historial reciente')).toBeInTheDocument();

    const labels = screen.getAllByTestId('recent-month-label').map((label) => label.textContent);
    expect(labels).toEqual(['ene', 'feb', 'mar', 'abr']);
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
  });

  test('keeps month nodes aligned with a grouped wrapper for the last 3 months', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'building' },
        { periodKey: '2026-03', closed: true, completionRate: 0.55, state: 'floor_only' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.63, state: 'projected_valid' },
      ],
    });
    const timeline = screen.getByTestId('recent-timeline');
    const items = within(timeline).getAllByTestId('recent-month-item');
    items.forEach((item) => {
      expect(item.className).toContain('flex-col');
      expect(item.className).toContain('items-center');
    });
    const groupedWindow = screen.getByTestId('seal-window-group');
    expect(groupedWindow.className).toContain('rounded-xl');
    expect(groupedWindow.className).toContain('bg-indigo-400/10');
    expect(groupedWindow.className).not.toContain('pointer-events-none');
    expect(groupedWindow).toHaveAttribute('data-window-start', '1');
    expect(groupedWindow).toHaveAttribute('data-window-end', '3');
    expect(within(groupedWindow).getAllByTestId('recent-month-item')).toHaveLength(3);
    const nodes = screen.getAllByTestId('recent-month-node');
    nodes.forEach((node) => {
      expect(node.className).toContain('text-sm');
      expect(node.className).toContain('leading-none');
    });
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
  });

  test('renders compact legend and explains intermediate yellow/building state', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'building' },
        { periodKey: '2026-03', closed: true, completionRate: 0.55, state: 'floor_only' },
      ],
    });

    const legend = screen.getByTestId('timeline-legend');
    expect(legend).toBeInTheDocument();
    expect(screen.getByTestId('timeline-legend-trigger').className).toContain('bg-white/20');

    fireEvent.click(within(legend).getByText('i'));
    expect(screen.getByText('✓ = mes fuerte')).toBeInTheDocument();
    expect(screen.getByText('• = en construcción')).toBeInTheDocument();
    expect(screen.getByText('✕ = mes débil')).toBeInTheDocument();
    expect(screen.getByText('~ = proyectado al ritmo actual')).toBeInTheDocument();
  });

  test('does not crash when recent month item is missing periodKey/month', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.65, state: 'projected_valid' },
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
        { month: '2026-02', closed: true, completionRate: 0.61, state: 'building' },
        { state: null },
      ],
    });

    const monthLabels = screen.getAllByTestId('recent-month-label').map((node) => node.textContent);
    expect(monthLabels).toEqual(['feb', 'Sin mes']);
    const progress = screen.getAllByTestId('recent-month-progress').map((node) => node.textContent);
    expect(progress).toEqual(['61%', '--']);
    expect(screen.queryByText('Cerrados = logrado mensual · actual = proyectado al ritmo actual')).not.toBeInTheDocument();
  });


  test('centers a single month in the timeline track', () => {
    renderCard({
      recentMonths: [{ periodKey: '2026-04', closed: false, projectedCompletionRate: 0.72, state: 'projected_valid' }],
    });

    expect(screen.getByTestId('recent-timeline-track').className).toContain('justify-center');
    expect(screen.getByTestId('recent-timeline-track').className).toContain('w-full');
    expect(screen.getByTestId('recent-timeline-track').className).not.toContain('min-w-max');
    expect(screen.getAllByTestId('recent-month-item')).toHaveLength(1);
  });

  test('centers two months in the timeline track', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-03', closed: true, completionRate: 0.61, state: 'building' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.72, state: 'projected_valid' },
      ],
    });

    expect(screen.getByTestId('recent-timeline-track').className).toContain('justify-center');
    expect(screen.getByTestId('recent-timeline-track').className).toContain('w-full');
    expect(screen.getByTestId('recent-timeline-track').className).not.toContain('min-w-max');
    expect(screen.queryByTestId('seal-window-group')).not.toBeInTheDocument();
  });

  test('3-4 month lists stay fit-first without overflow-first sizing', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-01', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'building' },
        { periodKey: '2026-03', closed: true, completionRate: 0.55, state: 'floor_only' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.63, state: 'projected_valid' },
      ],
    });

    const track = screen.getByTestId('recent-timeline-track');
    expect(track.className).toContain('justify-center');
    expect(track.className).toContain('w-full');
    expect(track.className).not.toContain('min-w-max');
  });

  test('allows overflow fallback for longer month lists', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2025-10', closed: true, completionRate: 0.3, state: 'invalid' },
        { periodKey: '2025-11', closed: true, completionRate: 0.4, state: 'floor_only' },
        { periodKey: '2025-12', closed: true, completionRate: 0.5, state: 'floor_only' },
        { periodKey: '2026-01', closed: true, completionRate: 0.6, state: 'building' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'valid' },
        { periodKey: '2026-03', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.9, state: 'projected_valid' },
      ],
    });

    expect(screen.getByTestId('recent-timeline').className).toContain('overflow-x-auto');
    expect(screen.getByTestId('recent-timeline-track').className).toContain('min-w-max');
  });

  test('keeps five months fit-first and avoids overflow fallback', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2025-12', closed: true, completionRate: 0.5, state: 'floor_only' },
        { periodKey: '2026-01', closed: true, completionRate: 0.6, state: 'building' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'valid' },
        { periodKey: '2026-03', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.9, state: 'projected_valid' },
      ],
    });

    expect(screen.getByTestId('recent-timeline-track').className).toContain('w-full');
    expect(screen.getByTestId('recent-timeline-track').className).not.toContain('min-w-max');
  });

  test('does not render grouped last-3 wrapper when there are fewer than 3 months', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-03', closed: true, completionRate: 0.6, state: 'building' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.72, state: 'projected_valid' },
      ],
    });

    expect(screen.queryByTestId('seal-window-group')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recent-month-item')).toHaveLength(2);
    expect(screen.getAllByTestId('recent-month-progress').map((node) => node.textContent)).toEqual(['60%', '72%']);
  });


  test('shows early projection hint in compact projection note when current month data is still sparse', () => {
    renderCard({
      currentMonth: {
        expectedTargetSoFar: 1,
        completionsDoneSoFar: 0,
      },
      recentMonths: [
        { periodKey: '2026-02', closed: true, completionRate: 0.61, state: 'building' },
        { periodKey: '2026-03', closed: true, completionRate: 0.72, state: 'valid' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.19, state: 'projected_invalid' },
      ],
    });

    expect(screen.queryByTestId('recent-timeline-projection-note')).not.toBeInTheDocument();
    expect(screen.getByText('proyectado')).toBeInTheDocument();
  });

  test('renders at most 8 recent months and keeps the most recent months', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2025-08', closed: true, completionRate: 0.1, state: 'invalid' },
        { periodKey: '2025-09', closed: true, completionRate: 0.2, state: 'invalid' },
        { periodKey: '2025-10', closed: true, completionRate: 0.3, state: 'invalid' },
        { periodKey: '2025-11', closed: true, completionRate: 0.4, state: 'floor_only' },
        { periodKey: '2025-12', closed: true, completionRate: 0.5, state: 'floor_only' },
        { periodKey: '2026-01', closed: true, completionRate: 0.6, state: 'building' },
        { periodKey: '2026-02', closed: true, completionRate: 0.7, state: 'valid' },
        { periodKey: '2026-03', closed: true, completionRate: 0.8, state: 'strong' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.9, state: 'projected_valid' },
      ],
    });

    const labels = screen.getAllByTestId('recent-month-label').map((label) => label.textContent);
    expect(labels).toHaveLength(8);
    expect(labels).toEqual(['sept', 'oct', 'nov', 'dic', 'ene', 'feb', 'mar', 'abr']);
    expect(screen.getByTestId('recent-timeline').className).toContain('overflow-x-auto');
    expect(screen.getByTestId('recent-timeline-track').className).toContain('min-w-max');
    expect(screen.getByTestId('seal-window-group')).toBeInTheDocument();
  });

  test('renders projection copy only once outside month nodes when projected month exists', () => {
    renderCard({
      recentMonths: [
        { periodKey: '2026-02', closed: true, completionRate: 0.61, state: 'building' },
        { periodKey: '2026-03', closed: true, completionRate: 0.72, state: 'valid' },
        { periodKey: '2026-04', closed: false, projectedCompletionRate: 0.19, state: 'projected_invalid' },
      ],
    });

    expect(screen.queryByTestId('recent-timeline-projection-note')).not.toBeInTheDocument();
    expect(screen.getByText('proyectado')).toBeInTheDocument();
    expect(screen.queryByTestId('recent-month-value-label')).not.toBeInTheDocument();
  });

  test('uses centered desktop layout classes for score balance', () => {
    renderCard();
    expect(screen.getByTestId('score-block').className).toContain('md:col-start-2');
    expect(screen.getByTestId('score-block').className).toContain('md:justify-self-center');
  });
});
