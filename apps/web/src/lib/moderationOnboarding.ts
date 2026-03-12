const MODERATION_INTENT_KEY = 'ib.onboarding.moderationSelected';

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

export function readModerationOnboardingIntentFlag(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(MODERATION_INTENT_KEY) === '1';
}

export function writeModerationOnboardingIntentFlag(value: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(MODERATION_INTENT_KEY, '1');
    return;
  }

  window.localStorage.removeItem(MODERATION_INTENT_KEY);
}

