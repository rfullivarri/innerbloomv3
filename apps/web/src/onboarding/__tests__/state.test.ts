import { describe, expect, it } from 'vitest';
import { applyChecklistSelection, computeRouteForMode, distributeXp, initialXP } from '../state';

describe('applyChecklistSelection', () => {
  it('adds when under limit', () => {
    const next = applyChecklistSelection([], 'A', 5);
    expect(next).toEqual(['A']);
  });

  it('removes when value already selected', () => {
    const next = applyChecklistSelection(['A', 'B'], 'A', 5);
    expect(next).toEqual(['B']);
  });

  it('enforces limit of five items', () => {
    const base = ['A', 'B', 'C', 'D', 'E'];
    const next = applyChecklistSelection(base, 'F', 5);
    expect(next).toEqual(base);
  });
});

describe('distributeXp', () => {
  it('adds xp to a specific pillar', () => {
    const next = distributeXp(initialXP, 13, 'Body');
    expect(next.Body).toBeCloseTo(13);
    expect(next.Mind).toBe(0);
    expect(next.Soul).toBe(0);
    expect(next.total).toBeCloseTo(13);
  });

  it('splits xp across all pillars', () => {
    const next = distributeXp(initialXP, 21, 'ALL');
    expect(next.Body).toBeCloseTo(7);
    expect(next.Mind).toBeCloseTo(7);
    expect(next.Soul).toBeCloseTo(7);
    expect(next.total).toBeCloseTo(21);
  });
});

describe('computeRouteForMode', () => {
  it('returns base route when no mode selected', () => {
    expect(computeRouteForMode(null)).toEqual(['clerk-gate', 'mode-select']);
  });

  it('inserts path-select after mode selection when path is not chosen yet', () => {
    expect(computeRouteForMode('FLOW')).toEqual(['clerk-gate', 'mode-select', 'path-select']);
  });

  it('includes mode specific steps', () => {
    const flowRoute = computeRouteForMode('FLOW', 'traditional');
    expect(flowRoute).toContain('flow-goal');
    expect(flowRoute).toContain('summary');
    expect(flowRoute.slice(0, 3)).toEqual(['clerk-gate', 'mode-select', 'path-select']);
  });

  it('builds quick start route without moderation step by default', () => {
    const flowRoute = computeRouteForMode('FLOW', 'quick_start');
    expect(flowRoute).toEqual([
      'clerk-gate',
      'mode-select',
      'path-select',
      'quick-start-body',
      'quick-start-mind',
      'quick-start-soul',
      'quick-start-summary',
    ]);
  });

  it('builds quick start route with moderation step when selected in body', () => {
    const flowRoute = computeRouteForMode('FLOW', 'quick_start', true);
    expect(flowRoute).toEqual([
      'clerk-gate',
      'mode-select',
      'path-select',
      'quick-start-body',
      'quick-start-mind',
      'quick-start-soul',
      'quick-start-moderation',
      'quick-start-summary',
    ]);
  });
});
