import {
  readOnboardingOverlayFlag,
  type OnboardingOverlayScope,
  writeOnboardingOverlayFlag,
} from './onboardingOverlayStorage';

const LEGACY_MODERATION_INTENT_KEY = 'ib.onboarding.moderationSelected';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function hasModerationSelection(values: string[]): boolean {
  return values.some((entry) => {
    const normalized = normalizeText(entry);
    return (
      normalized.includes('moderation') ||
      normalized.includes('moderacion') ||
      normalized.includes('reduce alcohol') ||
      normalized.includes('reducir alcohol')
    );
  });
}

export function readLegacyModerationOnboardingIntentFlag(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(LEGACY_MODERATION_INTENT_KEY) === '1';
}

export function writeLegacyModerationOnboardingIntentFlag(value: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(LEGACY_MODERATION_INTENT_KEY, '1');
    return;
  }

  window.localStorage.removeItem(LEGACY_MODERATION_INTENT_KEY);
}

export function readModerationOnboardingIntentFlag(scope?: OnboardingOverlayScope | null): boolean {
  if (scope) {
    return readOnboardingOverlayFlag(scope, 'moderationSelected');
  }

  return readLegacyModerationOnboardingIntentFlag();
}

export function writeModerationOnboardingIntentFlag(value: boolean, scope?: OnboardingOverlayScope | null) {
  if (scope) {
    writeOnboardingOverlayFlag(scope, 'moderationSelected', value);
    return;
  }

  writeLegacyModerationOnboardingIntentFlag(value);
}

