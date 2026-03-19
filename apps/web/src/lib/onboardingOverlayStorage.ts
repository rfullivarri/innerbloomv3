export type OnboardingOverlayScope = {
  userId: string;
  onboardingSessionId: string;
};

export type OnboardingOverlayFlag =
  | 'taskEditorFirstEditDone'
  | 'hasReturnedToDashboardAfterEdit'
  | 'moderationSelected'
  | 'moderationSuggestionResolved';

const STORAGE_PREFIX = 'ib.onboarding';
const SUPPORTED_FLAGS: readonly OnboardingOverlayFlag[] = [
  'taskEditorFirstEditDone',
  'hasReturnedToDashboardAfterEdit',
  'moderationSelected',
  'moderationSuggestionResolved',
] as const;

function normalizeSegment(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidOnboardingOverlayScope(scope: Partial<OnboardingOverlayScope> | null | undefined): scope is OnboardingOverlayScope {
  return Boolean(normalizeSegment(scope?.userId ?? '') && normalizeSegment(scope?.onboardingSessionId ?? ''));
}

export function buildOnboardingOverlayStorageKey(
  scope: OnboardingOverlayScope,
  flag: OnboardingOverlayFlag,
): string {
  return `${STORAGE_PREFIX}.${scope.userId}.${scope.onboardingSessionId}.${flag}`;
}

export function readOnboardingOverlayFlag(
  scope: OnboardingOverlayScope | null | undefined,
  flag: OnboardingOverlayFlag,
): boolean {
  if (typeof window === 'undefined' || !isValidOnboardingOverlayScope(scope)) {
    return false;
  }

  return window.localStorage.getItem(buildOnboardingOverlayStorageKey(scope, flag)) === '1';
}

export function writeOnboardingOverlayFlag(
  scope: OnboardingOverlayScope | null | undefined,
  flag: OnboardingOverlayFlag,
  value: boolean,
): void {
  if (typeof window === 'undefined' || !isValidOnboardingOverlayScope(scope)) {
    return;
  }

  const key = buildOnboardingOverlayStorageKey(scope, flag);
  if (value) {
    window.localStorage.setItem(key, '1');
    return;
  }

  window.localStorage.removeItem(key);
}

export function clearOnboardingOverlayScope(scope: OnboardingOverlayScope | null | undefined): void {
  if (typeof window === 'undefined' || !isValidOnboardingOverlayScope(scope)) {
    return;
  }

  for (const flag of SUPPORTED_FLAGS) {
    window.localStorage.removeItem(buildOnboardingOverlayStorageKey(scope, flag));
  }
}
