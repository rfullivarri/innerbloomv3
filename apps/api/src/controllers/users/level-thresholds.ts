import type { LevelThreshold } from './types.js';

const MAX_LEVEL = 50;

function toSafeNumber(value: unknown): number {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, numeric);
}

export function computeThresholdsFromBaseXp(xpBaseSum: unknown): LevelThreshold[] {
  const base = toSafeNumber(xpBaseSum);

  if (base <= 0) {
    return [];
  }

  const thresholds: LevelThreshold[] = [];

  for (let level = 0; level <= MAX_LEVEL; level += 1) {
    const requirement =
      level === 0
        ? Math.round(base * 0.4 * 7)
        : Math.round(base * Math.pow(level, 1.3));

    thresholds.push({
      level,
      xpRequired: Math.max(0, requirement),
    });
  }

  return thresholds;
}

export type ThresholdRow = { xp_base_sum: string | number | null };

export function extractThresholdsFromRows(
  rows: ThresholdRow[],
): LevelThreshold[] {
  const [first] = rows;

  if (!first) {
    return [];
  }

  return computeThresholdsFromBaseXp(first.xp_base_sum);
}
