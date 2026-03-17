import { describe, expect, it } from 'vitest';
import { resolveFirstQuestionStep } from '../firstQuestionStep';

describe('resolveFirstQuestionStep', () => {
  it('returns null when mode is not selected', () => {
    expect(resolveFirstQuestionStep(null, 'traditional')).toBeNull();
  });

  it('returns null when onboarding path is not selected', () => {
    expect(resolveFirstQuestionStep('FLOW', null)).toBeNull();
  });

  it('maps traditional path by mode', () => {
    expect(resolveFirstQuestionStep('LOW', 'traditional')).toBe('low-body');
    expect(resolveFirstQuestionStep('CHILL', 'traditional')).toBe('chill-open');
    expect(resolveFirstQuestionStep('FLOW', 'traditional')).toBe('flow-goal');
    expect(resolveFirstQuestionStep('EVOLVE', 'traditional')).toBe('evolve-goal');
  });

  it('maps quick start path to quick-start-body', () => {
    expect(resolveFirstQuestionStep('FLOW', 'quick_start')).toBe('quick-start-body');
  });
});

