import {
  readOnboardingOverlayFlag,
  type OnboardingOverlayScope,
  writeOnboardingOverlayFlag,
} from './onboardingOverlayStorage';

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

export function readModerationOnboardingIntentFlag(scope: OnboardingOverlayScope | null | undefined): boolean {
  return readOnboardingOverlayFlag(scope, 'moderationSelected');
}

export function writeModerationOnboardingIntentFlag(value: boolean, scope: OnboardingOverlayScope | null | undefined) {
  writeOnboardingOverlayFlag(scope, 'moderationSelected', value);
}

