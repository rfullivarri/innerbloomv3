type GameMode = 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE';
type DifficultyCode = 'EASY' | 'MEDIUM' | 'HARD';
type PillarCode = 'BODY' | 'MIND' | 'SOUL';

export type DifficultyCounts = Record<DifficultyCode, number>;
export type DifficultyPlanByPillar = Record<PillarCode, DifficultyCounts>;

type ModeConfig = {
  targetMix: Record<DifficultyCode, number>;
  minPerPillarWhenThreeOrMore: DifficultyCounts;
  hardCapRatio?: number;
  easyExcessWeight: number;
  hardDeficitWeight: number;
  hardExcessWeight: number;
  mediumDeviationWeight: number;
  hardDistributionWeight: number;
};

const GP_BY_DIFFICULTY: Record<DifficultyCode, number> = {
  EASY: 1,
  MEDIUM: 3,
  HARD: 7,
};

export const DIFFICULTY_BALANCE_V1_CONFIG: Record<GameMode, ModeConfig> = {
  LOW: {
    targetMix: { EASY: 0.3, MEDIUM: 0.6, HARD: 0.1 },
    minPerPillarWhenThreeOrMore: { EASY: 0, MEDIUM: 0, HARD: 0 },
    hardCapRatio: 0.2,
    easyExcessWeight: 2.4,
    hardDeficitWeight: 1.2,
    hardExcessWeight: 2.8,
    mediumDeviationWeight: 1.8,
    hardDistributionWeight: 0.5,
  },
  CHILL: {
    targetMix: { EASY: 0.2, MEDIUM: 0.5, HARD: 0.3 },
    minPerPillarWhenThreeOrMore: { EASY: 0, MEDIUM: 0, HARD: 0 },
    hardCapRatio: 0.45,
    easyExcessWeight: 3,
    hardDeficitWeight: 2,
    hardExcessWeight: 1.3,
    mediumDeviationWeight: 1.4,
    hardDistributionWeight: 0.5,
  },
  FLOW: {
    targetMix: { EASY: 0.3, MEDIUM: 0.4, HARD: 0.3 },
    minPerPillarWhenThreeOrMore: { EASY: 1, MEDIUM: 1, HARD: 1 },
    easyExcessWeight: 1.4,
    hardDeficitWeight: 2.2,
    hardExcessWeight: 1.9,
    mediumDeviationWeight: 1.2,
    hardDistributionWeight: 0.6,
  },
  EVOLVE: {
    targetMix: { EASY: 0.2, MEDIUM: 0.35, HARD: 0.45 },
    minPerPillarWhenThreeOrMore: { EASY: 1, MEDIUM: 1, HARD: 1 },
    easyExcessWeight: 1.5,
    hardDeficitWeight: 3,
    hardExcessWeight: 0.9,
    mediumDeviationWeight: 1.1,
    hardDistributionWeight: 0.6,
  },
};

type Triple = DifficultyCounts;

const PILLARS: readonly PillarCode[] = ['BODY', 'MIND', 'SOUL'];

function enumerateTriples(total: number, min: DifficultyCounts): Triple[] {
  const triples: Triple[] = [];
  for (let easy = min.EASY; easy <= total; easy += 1) {
    for (let medium = min.MEDIUM; medium <= total - easy; medium += 1) {
      const hard = total - easy - medium;
      if (hard < min.HARD) {
        continue;
      }
      triples.push({ EASY: easy, MEDIUM: medium, HARD: hard });
    }
  }
  return triples;
}

function calculatePillarGp(counts: DifficultyCounts): number {
  return counts.EASY * GP_BY_DIFFICULTY.EASY
    + counts.MEDIUM * GP_BY_DIFFICULTY.MEDIUM
    + counts.HARD * GP_BY_DIFFICULTY.HARD;
}

function calculateModePenalty(mode: GameMode, totals: DifficultyCounts, hardSpread: number, totalTasks: number): number {
  const cfg = DIFFICULTY_BALANCE_V1_CONFIG[mode];
  const targetEasy = cfg.targetMix.EASY * totalTasks;
  const targetMedium = cfg.targetMix.MEDIUM * totalTasks;
  const targetHard = cfg.targetMix.HARD * totalTasks;

  const easyDelta = totals.EASY - targetEasy;
  const hardDelta = totals.HARD - targetHard;

  let penalty = 0;
  penalty += Math.abs(totals.MEDIUM - targetMedium) * cfg.mediumDeviationWeight;
  penalty += (easyDelta > 0 ? easyDelta : Math.abs(easyDelta) * 0.7) * cfg.easyExcessWeight;
  penalty += (hardDelta < 0 ? Math.abs(hardDelta) * cfg.hardDeficitWeight : hardDelta * cfg.hardExcessWeight);

  if (cfg.hardCapRatio !== undefined) {
    const hardCap = Math.floor(totalTasks * cfg.hardCapRatio);
    if (totals.HARD > hardCap) {
      penalty += (totals.HARD - hardCap) * 8;
    }
  }

  penalty += hardSpread * cfg.hardDistributionWeight;
  return penalty;
}

function compareLexicographic(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
}

export function buildDifficultyBalancePlan(input: {
  gameMode: GameMode;
  nBody: number;
  nMind: number;
  nSoul: number;
}): DifficultyPlanByPillar {
  const mode = input.gameMode;
  const cfg = DIFFICULTY_BALANCE_V1_CONFIG[mode];
  const sizes: Record<PillarCode, number> = {
    BODY: input.nBody,
    MIND: input.nMind,
    SOUL: input.nSoul,
  };

  const candidatesByPillar: Record<PillarCode, Triple[]> = {
    BODY: enumerateTriples(sizes.BODY, sizes.BODY >= 3 ? cfg.minPerPillarWhenThreeOrMore : { EASY: 0, MEDIUM: 0, HARD: 0 }),
    MIND: enumerateTriples(sizes.MIND, sizes.MIND >= 3 ? cfg.minPerPillarWhenThreeOrMore : { EASY: 0, MEDIUM: 0, HARD: 0 }),
    SOUL: enumerateTriples(sizes.SOUL, sizes.SOUL >= 3 ? cfg.minPerPillarWhenThreeOrMore : { EASY: 0, MEDIUM: 0, HARD: 0 }),
  };

  let best: { score: number[]; plan: DifficultyPlanByPillar } | null = null;

  for (const body of candidatesByPillar.BODY) {
    for (const mind of candidatesByPillar.MIND) {
      for (const soul of candidatesByPillar.SOUL) {
        const plan: DifficultyPlanByPillar = { BODY: body, MIND: mind, SOUL: soul };
        const gpValues = PILLARS.map((pillar) => calculatePillarGp(plan[pillar]));
        const spread = Math.max(...gpValues) - Math.min(...gpValues);
        const totals = PILLARS.reduce<DifficultyCounts>((acc, pillar) => ({
          EASY: acc.EASY + plan[pillar].EASY,
          MEDIUM: acc.MEDIUM + plan[pillar].MEDIUM,
          HARD: acc.HARD + plan[pillar].HARD,
        }), { EASY: 0, MEDIUM: 0, HARD: 0 });
        const hardCounts = PILLARS.map((pillar) => plan[pillar].HARD);
        const hardSpread = Math.max(...hardCounts) - Math.min(...hardCounts);
        const totalTasks = totals.EASY + totals.MEDIUM + totals.HARD;
        const modePenalty = calculateModePenalty(mode, totals, hardSpread, totalTasks);
        const biasPenalty = PILLARS
          .map((pillar) => Math.abs(plan[pillar].EASY - plan[pillar].MEDIUM))
          .reduce((sum, value) => sum + value, 0);
        const diversityPenalty = PILLARS
          .map((pillar) => Number(plan[pillar].HARD === 0 && sizes[pillar] > 0))
          .reduce((sum, value) => sum + value, 0);

        const score = [spread, modePenalty, biasPenalty, diversityPenalty];

        if (!best || compareLexicographic(score, best.score) < 0) {
          best = { score, plan };
        }
      }
    }
  }

  if (!best) {
    return {
      BODY: { EASY: 0, MEDIUM: 0, HARD: 0 },
      MIND: { EASY: 0, MEDIUM: 0, HARD: 0 },
      SOUL: { EASY: 0, MEDIUM: 0, HARD: 0 },
    };
  }

  return best.plan;
}

type RandomFn = () => number;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): RandomFn {
  let state = hashSeed(seed) || 123456789;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom<T>(input: readonly T[], random: RandomFn): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function makeDifficultyPool(counts: DifficultyCounts): DifficultyCode[] {
  return [
    ...Array.from({ length: counts.EASY }, () => 'EASY' as const),
    ...Array.from({ length: counts.MEDIUM }, () => 'MEDIUM' as const),
    ...Array.from({ length: counts.HARD }, () => 'HARD' as const),
  ];
}

export function assignBalancedDifficultiesByPillar<T extends { pillar_code: string }>(input: {
  tasks: readonly T[];
  gameMode: GameMode;
  seed?: string;
}): (T & { difficulty_code: DifficultyCode })[] {
  const grouped: Record<PillarCode, T[]> = { BODY: [], MIND: [], SOUL: [] };
  for (const task of input.tasks) {
    const pillar = task.pillar_code.trim().toUpperCase() as PillarCode;
    if (pillar in grouped) {
      grouped[pillar].push(task);
    }
  }

  const plan = buildDifficultyBalancePlan({
    gameMode: input.gameMode,
    nBody: grouped.BODY.length,
    nMind: grouped.MIND.length,
    nSoul: grouped.SOUL.length,
  });

  const output: (T & { difficulty_code: DifficultyCode })[] = [];

  for (const pillar of PILLARS) {
    const seedKey = input.seed ? `${input.seed}:${pillar}` : `${Date.now()}:${pillar}`;
    const random = seededRandom(seedKey);
    const shuffledTasks = shuffleWithRandom(grouped[pillar], random);
    const shuffledDifficulties = shuffleWithRandom(makeDifficultyPool(plan[pillar]), random);
    for (let i = 0; i < shuffledTasks.length; i += 1) {
      output.push({
        ...shuffledTasks[i],
        difficulty_code: shuffledDifficulties[i] ?? 'EASY',
      });
    }
  }

  return output;
}

export function normalizeGameModeForDifficultyEngine(mode: string | null | undefined): GameMode {
  const normalized = (mode ?? '').trim().toUpperCase();
  if (normalized === 'LOW' || normalized === 'CHILL' || normalized === 'FLOW' || normalized === 'EVOLVE') {
    return normalized;
  }
  return 'FLOW';
}
