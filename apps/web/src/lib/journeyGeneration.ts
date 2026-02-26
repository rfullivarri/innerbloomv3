const JOURNEY_GENERATION_KEY = 'journey_generation_state_v1';
const JOURNEY_GENERATION_TTL_MS = 1000 * 60 * 15;

type JourneyGenerationRecord = {
  clerkUserId: string;
  gameMode: string;
  createdAt: number;
};

export function setJourneyGenerationPending(input: { clerkUserId: string; gameMode: string }): void {
  if (typeof window === 'undefined') {
    return;
  }

  const record: JourneyGenerationRecord = {
    clerkUserId: input.clerkUserId,
    gameMode: input.gameMode,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(JOURNEY_GENERATION_KEY, JSON.stringify(record));
  window.dispatchEvent(new Event('journey-generation-change'));
}

export function isJourneyGenerationPending(clerkUserId?: string | null): boolean {
  if (!clerkUserId || typeof window === 'undefined') {
    return false;
  }

  const raw = window.localStorage.getItem(JOURNEY_GENERATION_KEY);
  if (!raw) {
    return false;
  }

  try {
    const record = JSON.parse(raw) as JourneyGenerationRecord;
    const isExpired = Date.now() - record.createdAt > JOURNEY_GENERATION_TTL_MS;
    const isSameUser = record.clerkUserId === clerkUserId;

    if (!isSameUser || isExpired) {
      window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
      return false;
    }

    return true;
  } catch {
    window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
    return false;
  }
}

export function clearJourneyGenerationPending(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(JOURNEY_GENERATION_KEY);
  window.dispatchEvent(new Event('journey-generation-change'));
}
