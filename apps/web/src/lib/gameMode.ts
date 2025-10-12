export type GameMode = 'Low' | 'Chill' | 'Flow' | 'Evolve';

const MODE_BY_ID: Record<string, GameMode> = {
  '1': 'Low',
  '2': 'Chill',
  '3': 'Flow',
  '4': 'Evolve',
};

const MODE_BY_ALIAS: Record<string, GameMode> = {
  low: 'Low',
  lowmood: 'Low',
  lowmode: 'Low',
  chill: 'Chill',
  chillmood: 'Chill',
  chillmode: 'Chill',
  flow: 'Flow',
  flowmood: 'Flow',
  flowmode: 'Flow',
  standard: 'Flow',
  seedling: 'Flow',
  evolve: 'Evolve',
  evol: 'Evolve',
  evolvemood: 'Evolve',
  evolvemode: 'Evolve',
};

function toKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeGameModeValue(raw: unknown): GameMode | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const value = typeof raw === 'number' ? raw.toString() : String(raw);
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const direct = MODE_BY_ID[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  if (MODE_BY_ALIAS[lower]) {
    return MODE_BY_ALIAS[lower];
  }

  const compact = toKey(trimmed);
  return MODE_BY_ALIAS[compact] ?? null;
}

export function coerceGameMode(raw: unknown, fallback: GameMode = 'Flow'): GameMode {
  return normalizeGameModeValue(raw) ?? fallback;
}
