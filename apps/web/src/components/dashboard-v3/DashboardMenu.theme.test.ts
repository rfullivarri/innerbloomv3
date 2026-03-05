import { describe, expect, it } from 'vitest';
import { getWidgetsRefreshingOverlayClass } from './DashboardMenu';

describe('DashboardMenu widgets refreshing overlay by theme', () => {
  it('uses stronger washed overlay only in light theme', () => {
    expect(getWidgetsRefreshingOverlayClass('light')).toBe('bg-[color:var(--color-overlay-3)]');
  });

  it('keeps dark-theme overlay contrast unchanged', () => {
    expect(getWidgetsRefreshingOverlayClass('dark')).toBe('bg-[color:var(--color-slate-950-80)]');
  });
});
