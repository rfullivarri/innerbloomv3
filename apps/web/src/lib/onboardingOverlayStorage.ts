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
const ACTIVE_SCOPE_KEY = `${STORAGE_PREFIX}.activeOverlayScope`;
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


function parseOverlayScope(rawValue: string | null): OnboardingOverlayScope | null {
  if (!rawValue) {
    return null;
  }

  try {
    const payload = JSON.parse(rawValue) as Partial<OnboardingOverlayScope>;
    if (isValidOnboardingOverlayScope(payload)) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}

export function readActiveOnboardingOverlayScope(): OnboardingOverlayScope | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseOverlayScope(window.localStorage.getItem(ACTIVE_SCOPE_KEY));
}

export function writeActiveOnboardingOverlayScope(scope: OnboardingOverlayScope | null | undefined): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isValidOnboardingOverlayScope(scope)) {
    window.localStorage.removeItem(ACTIVE_SCOPE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_SCOPE_KEY, JSON.stringify(scope));
}

export function clearOnboardingOverlayScopeIfChanged(
  nextScope: OnboardingOverlayScope | null | undefined,
): { previousScope: OnboardingOverlayScope | null; didClearPreviousScope: boolean } {
  if (typeof window === 'undefined') {
    return { previousScope: null, didClearPreviousScope: false };
  }

  const previousScope = readActiveOnboardingOverlayScope();
  const hasNextScope = isValidOnboardingOverlayScope(nextScope);
  const scopeChanged = Boolean(
    previousScope &&
      (!hasNextScope ||
        previousScope.userId !== nextScope.userId ||
        previousScope.onboardingSessionId !== nextScope.onboardingSessionId),
  );

  if (scopeChanged) {
    clearOnboardingOverlayScope(previousScope);
  }

  if (hasNextScope) {
    writeActiveOnboardingOverlayScope(nextScope);
  } else {
    writeActiveOnboardingOverlayScope(null);
  }

  return { previousScope, didClearPreviousScope: scopeChanged };
}

export function resetActiveOnboardingOverlayScope(
  scope: OnboardingOverlayScope | null | undefined,
): void {
  if (!isValidOnboardingOverlayScope(scope)) {
    return;
  }

  clearOnboardingOverlayScope(scope);

  const activeScope = readActiveOnboardingOverlayScope();
  if (
    activeScope &&
    activeScope.userId === scope.userId &&
    activeScope.onboardingSessionId === scope.onboardingSessionId
  ) {
    writeActiveOnboardingOverlayScope(null);
  }
}
