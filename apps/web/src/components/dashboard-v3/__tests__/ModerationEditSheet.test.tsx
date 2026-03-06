import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ModerationTrackerConfig, ModerationTrackerType } from '../../../lib/api';
import { ModerationEditSheet } from '../ModerationEditSheet';

function buildConfigs(notLoggedToleranceDays: number): Record<ModerationTrackerType, ModerationTrackerConfig> {
  return {
    alcohol: {
      type: 'alcohol',
      isEnabled: true,
      isPaused: false,
      notLoggedToleranceDays,
    },
    tobacco: {
      type: 'tobacco',
      isEnabled: true,
      isPaused: false,
      notLoggedToleranceDays: 2,
    },
    sugar: {
      type: 'sugar',
      isEnabled: true,
      isPaused: false,
      notLoggedToleranceDays: 2,
    },
  };
}

describe('ModerationEditSheet tolerance slider', () => {
  it.each([
    { value: 0, expectedWidth: '0%' },
    { value: 3, expectedWidth: `${(3 / 7) * 100}%` },
    { value: 7, expectedWidth: '100%' },
  ])('renderiza track/fill alineados para el valor $value', ({ value, expectedWidth }) => {
    render(
      <ModerationEditSheet
        isOpen
        isLoading={false}
        enabledTypes={['alcohol']}
        configs={buildConfigs(value)}
        onClose={vi.fn()}
        onTogglePause={vi.fn(async () => {})}
        onToleranceChange={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText(`Tolerancia sin marcar: ${value}`)).toBeInTheDocument();

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe(String(value));
    expect(slider.className).toContain('z-20');
    expect(slider.className).toContain('[&::-webkit-slider-thumb]:mt-[-4px]');

    const rail = document.querySelector('[data-testid="tolerance-rail"]') as HTMLDivElement;
    const fill = document.querySelector('[data-testid="tolerance-fill"]') as HTMLDivElement;

    expect(rail.className).toContain('z-0');
    expect(rail.className).toContain('h-2');
    expect(rail.className).toContain('rounded-full');

    expect(fill.className).toContain('z-10');
    expect(fill.className).toContain('h-2');
    expect(fill.className).toContain('rounded-full');
    expect(fill.style.width).toBe(expectedWidth);
  });
});
