export type Pillar = 'Body' | 'Mind' | 'Soul';

export const PILLARS: readonly Pillar[] = ['Body', 'Mind', 'Soul'];

const HALF_LIFE_BY_MODE: Record<string, Record<Pillar, number>> = {
  LOW: { Body: 7, Mind: 9, Soul: 11 },
  CHILL: { Body: 6, Mind: 8, Soul: 10 },
  FLOW: { Body: 5, Mind: 7, Soul: 9 },
  EVOLVE: { Body: 4, Mind: 6, Soul: 8 },
};

const DEFAULT_HALF_LIFE = HALF_LIFE_BY_MODE.CHILL;

export type XpByDate = Map<string, Partial<Record<Pillar, number>>>;

export type HalfLifeByPillar = Record<Pillar, number>;

export type DecayRateByPillar = Record<Pillar, number>;

export type GainFactorByPillar = Record<Pillar, number>;

export type DailyTargetByPillar = Record<Pillar, number>;

export type PropagatedSeriesRow = {
  date: string;
} & Record<Pillar, number>;

export type PropagationResult = {
  lastEnergy: Record<Pillar, number>;
  series: PropagatedSeriesRow[];
};

export function computeHalfLife(modeCode: string): HalfLifeByPillar {
  const key = modeCode.toUpperCase();
  const config = HALF_LIFE_BY_MODE[key] ?? DEFAULT_HALF_LIFE;

  return { ...config };
}

export function computeDecayRates(halfLifeByPillar: HalfLifeByPillar): DecayRateByPillar {
  return PILLARS.reduce<DecayRateByPillar>((acc, pillar) => {
    const halfLife = halfLifeByPillar[pillar];

    acc[pillar] = halfLife > 0 ? 1 - Math.pow(0.5, 1 / halfLife) : 0;

    return acc;
  }, {} as DecayRateByPillar);
}

export function computeDailyTargets(
  xpBaseByPillar: Record<Pillar, number>,
  weeklyTarget: number,
): DailyTargetByPillar {
  return PILLARS.reduce<DailyTargetByPillar>((acc, pillar) => {
    const base = xpBaseByPillar[pillar] ?? 0;
    acc[pillar] = base > 0 && weeklyTarget > 0 ? (base * weeklyTarget) / 7 : 0;
    return acc;
  }, {} as DailyTargetByPillar);
}

export function computeGainFactors(
  decayRates: DecayRateByPillar,
  dailyTargets: DailyTargetByPillar,
): GainFactorByPillar {
  return PILLARS.reduce<GainFactorByPillar>((acc, pillar) => {
    const target = dailyTargets[pillar];
    const decay = decayRates[pillar];

    acc[pillar] = target > 0 ? (100 * decay) / target : 0;

    return acc;
  }, {} as GainFactorByPillar);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  const target = new Date(to);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(target.getTime())) {
    return dates;
  }

  while (cursor <= target) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

export type PropagateOptions = {
  dates: string[];
  xpByDate: XpByDate;
  halfLifeByPillar: HalfLifeByPillar;
  dailyTargets: DailyTargetByPillar;
  forceFullGrace?: boolean;
  graceUntilDate?: string | null;
  initialEnergy?: number;
};

export function propagateEnergy({
  dates,
  xpByDate,
  halfLifeByPillar,
  dailyTargets,
  forceFullGrace = false,
  graceUntilDate,
  initialEnergy = 60,
}: PropagateOptions): PropagationResult {
  const decayRates = computeDecayRates(halfLifeByPillar);
  const gainFactors = computeGainFactors(decayRates, dailyTargets);
  const previousEnergy: Record<Pillar, number> = { Body: initialEnergy, Mind: initialEnergy, Soul: initialEnergy };
  const series: PropagatedSeriesRow[] = [];

  for (const date of dates) {
    const xpForDay = xpByDate.get(date) ?? {};
    const row: PropagatedSeriesRow = { date, Body: 0, Mind: 0, Soul: 0 };

    for (const pillar of PILLARS) {
      let energy: number;

      if (forceFullGrace) {
        energy = 100;
      } else if (dailyTargets[pillar] === 0) {
        energy = 0;
      } else if (graceUntilDate && date <= graceUntilDate) {
        energy = 100;
      } else {
        const decay = decayRates[pillar];
        const gain = gainFactors[pillar];
        const previous = previousEnergy[pillar];
        const xpToday = xpForDay[pillar] ?? 0;

        energy = clamp((1 - decay) * previous + gain * xpToday, 0, 100);
      }

      previousEnergy[pillar] = energy;
      row[pillar] = Number.isFinite(energy) ? Math.round(energy * 100) / 100 : 0;
    }

    series.push(row);
  }

  return {
    lastEnergy: { ...previousEnergy },
    series,
  };
}

export function formatDateInTimezone(date: Date, timezone?: string | null): string {
  let timeZone = timezone ?? 'UTC';

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch (error) {
    if (error instanceof RangeError) {
      timeZone = 'UTC';

      return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    }

    throw error;
  }
}
