import { apiAuthorizedGet } from '../api';

export type Pillar = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type Trait = {
  id: string;
  pillarId: string;
  code: string;
  name: string;
  description?: string | null;
};

export type Stat = {
  id: string;
  traitId: string;
  pillarId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  unit?: string | null;
};

export type Difficulty = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  xpBase?: number | null;
};

type RawPillar = {
  id?: unknown;
  pillar_id?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
};

type RawTrait = {
  id?: unknown;
  trait_id?: unknown;
  pillar_id?: unknown;
  pillarId?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
};

type RawStat = {
  id?: unknown;
  stat_id?: unknown;
  trait_id?: unknown;
  pillar_id?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
  unit?: unknown;
};

type RawDifficulty = {
  id?: unknown;
  difficulty_id?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
  xp_base?: unknown;
  xpBase?: unknown;
};

const ARRAY_KEYS = ['items', 'data', 'results', 'rows'];

function toNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === 'object') {
    for (const key of ARRAY_KEYS) {
      const candidate = (value as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }
  return [];
}

function normalizePillar(raw: RawPillar): Pillar | null {
  const id =
    toNullableString(raw.id) ?? toNullableString(raw.pillar_id) ?? toNullableString(raw.code);
  if (!id) {
    return null;
  }

  const code = toNullableString(raw.code) ?? id;
  const name = toNullableString(raw.name) ?? code;
  const description = toNullableString(raw.description);

  return {
    id,
    code,
    name,
    description,
  };
}

function normalizeTrait(raw: RawTrait): Trait | null {
  const id =
    toNullableString(raw.id) ?? toNullableString(raw.trait_id) ?? toNullableString(raw.code);
  const pillarId =
    toNullableString(raw.pillarId) ?? toNullableString(raw.pillar_id);

  if (!id || !pillarId) {
    return null;
  }

  const code = toNullableString(raw.code) ?? id;
  const name = toNullableString(raw.name) ?? code;
  const description = toNullableString(raw.description);

  return {
    id,
    pillarId,
    code,
    name,
    description,
  };
}

function normalizeStat(raw: RawStat): Stat | null {
  const id =
    toNullableString(raw.id) ?? toNullableString(raw.stat_id) ?? toNullableString(raw.code);
  const traitId = toNullableString(raw.trait_id);
  if (!id || !traitId) {
    return null;
  }

  const code = toNullableString(raw.code) ?? id;
  const name = toNullableString(raw.name) ?? code;
  const description = toNullableString(raw.description);
  const unit = toNullableString(raw.unit);
  const pillarId = toNullableString(raw.pillar_id);

  return {
    id,
    traitId,
    pillarId,
    code,
    name,
    description,
    unit,
  };
}

function normalizeDifficulty(raw: RawDifficulty): Difficulty | null {
  const id =
    toNullableString(raw.id) ??
    toNullableString(raw.difficulty_id) ??
    toNullableString(raw.code);

  if (!id) {
    return null;
  }

  const code = toNullableString(raw.code) ?? id;
  const name = toNullableString(raw.name) ?? code;
  const description = toNullableString(raw.description);
  const xpBase = toNullableNumber(raw.xpBase ?? raw.xp_base);

  return {
    id,
    code,
    name,
    description,
    xpBase,
  };
}

export async function fetchCatalogPillars(): Promise<Pillar[]> {
  const response = await apiAuthorizedGet<unknown>('/catalog/pillars');
  return ensureArray<RawPillar>(response)
    .map((raw) => normalizePillar(raw))
    .filter((pillar): pillar is Pillar => Boolean(pillar));
}

export async function fetchCatalogTraits(pillarId: string): Promise<Trait[]> {
  const response = await apiAuthorizedGet<unknown>('/catalog/traits', { pillar_id: pillarId });
  return ensureArray<RawTrait>(response)
    .map((raw) => normalizeTrait(raw))
    .filter((trait): trait is Trait => Boolean(trait));
}

export async function fetchCatalogStats(traitId: string): Promise<Stat[]> {
  const response = await apiAuthorizedGet<unknown>('/catalog/stats', { trait_id: traitId });
  return ensureArray<RawStat>(response)
    .map((raw) => normalizeStat(raw))
    .filter((stat): stat is Stat => Boolean(stat));
}

export async function fetchCatalogDifficulties(): Promise<Difficulty[]> {
  const response = await apiAuthorizedGet<unknown>('/catalog/difficulty');
  return ensureArray<RawDifficulty>(response)
    .map((raw) => normalizeDifficulty(raw))
    .filter((difficulty): difficulty is Difficulty => Boolean(difficulty));
}
