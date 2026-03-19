import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildOnboardingOverlayStorageKey,
  clearOnboardingOverlayScopeIfChanged,
  clearOnboardingOverlayScope,
  readOnboardingOverlayFlag,
  resetActiveOnboardingOverlayScope,
  writeOnboardingOverlayFlag,
  type OnboardingOverlayScope,
} from '../onboardingOverlayStorage';

const scope: OnboardingOverlayScope = {
  userId: 'user-123',
  onboardingSessionId: 'session-456',
};

describe('onboardingOverlayStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds scoped keys with user and onboarding session', () => {
    expect(buildOnboardingOverlayStorageKey(scope, 'moderationSelected')).toBe(
      'ib.onboarding.user-123.session-456.moderationSelected',
    );
  });

  it('writes and reads scoped flags without affecting other sessions', () => {
    writeOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone', true);

    expect(readOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone')).toBe(true);
    expect(
      readOnboardingOverlayFlag(
        { userId: 'user-123', onboardingSessionId: 'session-999' },
        'taskEditorFirstEditDone',
      ),
    ).toBe(false);
  });

  it('clears all scoped flags for a session', () => {
    writeOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone', true);
    writeOnboardingOverlayFlag(scope, 'hasReturnedToDashboardAfterEdit', true);
    writeOnboardingOverlayFlag(scope, 'moderationSelected', true);
    writeOnboardingOverlayFlag(scope, 'moderationSuggestionResolved', true);

    clearOnboardingOverlayScope(scope);

    expect(readOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone')).toBe(false);
    expect(readOnboardingOverlayFlag(scope, 'hasReturnedToDashboardAfterEdit')).toBe(false);
    expect(readOnboardingOverlayFlag(scope, 'moderationSelected')).toBe(false);
    expect(readOnboardingOverlayFlag(scope, 'moderationSuggestionResolved')).toBe(false);
  });

  it('clears the previous scoped overlay when the active session changes', () => {
    const previousScope: OnboardingOverlayScope = {
      userId: 'user-123',
      onboardingSessionId: 'session-111',
    };
    const nextScope: OnboardingOverlayScope = {
      userId: 'user-123',
      onboardingSessionId: 'session-222',
    };

    writeOnboardingOverlayFlag(previousScope, 'moderationSelected', true);
    clearOnboardingOverlayScopeIfChanged(previousScope);

    const result = clearOnboardingOverlayScopeIfChanged(nextScope);

    expect(result.didClearPreviousScope).toBe(true);
    expect(readOnboardingOverlayFlag(previousScope, 'moderationSelected')).toBe(false);
    expect(readOnboardingOverlayFlag(nextScope, 'moderationSelected')).toBe(false);
  });

  it('resets the current scoped overlay after scheduler confirmation', () => {
    writeOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone', true);
    writeOnboardingOverlayFlag(scope, 'moderationSelected', true);
    clearOnboardingOverlayScopeIfChanged(scope);

    resetActiveOnboardingOverlayScope(scope);

    expect(readOnboardingOverlayFlag(scope, 'taskEditorFirstEditDone')).toBe(false);
    expect(readOnboardingOverlayFlag(scope, 'moderationSelected')).toBe(false);
  });
});
