import { createDebugTaskgenRunner, type Mode } from './debugTaskgenService.js';

const runner = createDebugTaskgenRunner();

type TriggerInput = {
  userId: string;
  mode?: string | null;
};

function normalizeMode(mode: string | null | undefined): Mode | undefined {
  if (!mode) {
    return undefined;
  }

  const normalized = mode.toLowerCase();

  switch (normalized) {
    case 'low':
    case 'chill':
    case 'flow':
    case 'evolve':
      return normalized as Mode;
    default:
      return undefined;
  }
}

function logTriggerError(error: unknown): void {
  console.error('[taskgen-trigger] failed', error);
}

export function triggerTaskGenerationForUser({ userId, mode }: TriggerInput): void {
  const normalizedMode = normalizeMode(mode);

  void runner({
    userId,
    mode: normalizedMode,
    dryRun: false,
    store: true,
  }).catch(logTriggerError);
}
