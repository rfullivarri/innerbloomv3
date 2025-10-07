import type { LevelThreshold } from './types.js';

export type LevelSummaryComputation = {
  currentLevel: number;
  xpRequiredCurrent: number;
  xpRequiredNext: number | null;
  xpToNext: number | null;
  progressPercent: number;
};

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildLevelSummary(
  xpTotal: number,
  thresholds: LevelThreshold[],
): LevelSummaryComputation {
  const normalizedThresholds = [...thresholds]
    .map((threshold) => {
      const level = Number(threshold.level);
      const xpRequired = Number(threshold.xpRequired);
      return {
        level: Number.isFinite(level) ? level : 0,
        xpRequired: Number.isFinite(xpRequired) ? Math.max(0, xpRequired) : 0,
      };
    })
    .filter((threshold, index, array) =>
      array.findIndex((candidate) => candidate.level === threshold.level) === index,
    )
    .sort((a, b) => a.level - b.level);

  if (!normalizedThresholds.some((threshold) => threshold.level === 0)) {
    normalizedThresholds.unshift({ level: 0, xpRequired: 0 });
  }

  const safeXpTotal = Math.max(0, Number.isFinite(xpTotal) ? xpTotal : 0);

  let current = normalizedThresholds[0]!;

  for (const threshold of normalizedThresholds) {
    if (safeXpTotal >= threshold.xpRequired) {
      current = threshold;
    } else {
      break;
    }
  }

  const next = normalizedThresholds.find((threshold) => threshold.level > current.level) ?? null;
  const xpRequiredCurrent = Math.max(0, Math.round(current.xpRequired));
  const xpRequiredNext = next ? Math.max(0, Math.round(next.xpRequired)) : null;
  const xpToNext = xpRequiredNext === null ? null : Math.max(0, Math.round(xpRequiredNext - safeXpTotal));

  let progressPercent = 100;

  if (xpRequiredNext !== null) {
    const span = Math.max(xpRequiredNext - xpRequiredCurrent, 1);
    const rawProgress = ((safeXpTotal - xpRequiredCurrent) / span) * 100;
    progressPercent = roundToSingleDecimal(
      Math.min(100, Math.max(0, rawProgress)),
    );
  }

  if (xpRequiredNext === null) {
    progressPercent = 100;
  }

  return {
    currentLevel: Math.round(current.level),
    xpRequiredCurrent,
    xpRequiredNext,
    xpToNext,
    progressPercent,
  };
}
