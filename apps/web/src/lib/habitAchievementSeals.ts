const DIACRITIC_REGEX = /\p{Diacritic}/gu;
const NON_ALNUM_REGEX = /[^A-Z0-9]+/g;

type PillarKey = 'BODY' | 'MIND' | 'SOUL';

type SealResolverInput = {
  pillar?: string | null;
  traitCode?: string | null;
  traitName?: string | null;
};

const PILLAR_ALIASES: Record<string, PillarKey> = {
  BODY: 'BODY',
  CUERPO: 'BODY',
  MIND: 'MIND',
  MENTE: 'MIND',
  SOUL: 'SOUL',
  ALMA: 'SOUL',
};

const PILLAR_FILENAME_PREFIXES: Record<PillarKey, string[]> = {
  BODY: ['Corazón', 'Corazon'],
  MIND: ['Cerebro'],
  SOUL: ['Alma', 'Soul'],
};

const TRAIT_ALIASES: Record<string, string> = {
  ENERGIA: 'ENERGY',
  ENERGY: 'ENERGY',
  FUERZA: 'STRENGTH',
  STRENGTH: 'STRENGTH',
  HIDRATACION: 'HYDRATION',
  HYDRATION: 'HYDRATION',
  MOVILIDAD: 'MOBILITY',
  MOBILITY: 'MOBILITY',
  NUTRICION: 'NUTRITION',
  NUTRITION: 'NUTRITION',
  POSTURA: 'POSTURE',
  POSTURE: 'POSTURE',
  RECUPERACION: 'RECOVERY',
  RECOVERY: 'RECOVERY',
  RESISTENCIA: 'RESISTANCE',
  RESISTANCE: 'RESISTANCE',
  SUENO: 'SLEEP',
  SLEEP: 'SLEEP',
  CURIOSIDAD: 'CURIOSITY',
  CURIOCIDAD: 'CURIOSITY',
  CURIOSITY: 'CURIOSITY',
  DISCIPLINA: 'DISCIPLINE',
  DISCIPLINE: 'DISCIPLINE',
  DICIPLINE: 'DISCIPLINE',
  ENFOQUE: 'FOCUS',
  FOCUS: 'FOCUS',
};

const TRAIT_FILENAME_ALIASES: Record<string, string[]> = {
  ENERGY: ['ENERGIA', 'ENERGY'],
  STRENGTH: ['FUERZA', 'STRENGTH'],
  HYDRATION: ['HIDRATACION', 'HYDRATION'],
  MOBILITY: ['MOVILIDAD', 'MOBILITY'],
  NUTRITION: ['NUTRICION', 'NUTRITION'],
  POSTURE: ['POSTURA', 'POSTURE'],
  RECOVERY: ['RECUPERACION', 'RECOVERY'],
  RESISTANCE: ['RESISTENCIA', 'RESISTANCE'],
  SLEEP: ['SUEÑO', 'SUENO', 'SLEEP'],
  CURIOSITY: ['CURIOSIDAD', 'CURIOCIDAD', 'CURIOSITY'],
  DISCIPLINE: ['DISCIPLINA', 'DISCIPLINE', 'DICIPLINE'],
  FOCUS: ['ENFOQUE', 'FOCUS'],
};

function normalizeToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(DIACRITIC_REGEX, '')
    .replace(NON_ALNUM_REGEX, '');
}

function normalizeFilenameToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function variantsByUnicodeForm(text: string): string[] {
  return Array.from(new Set([text, text.normalize('NFC'), text.normalize('NFD')]));
}

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim().length))));
}

function resolveCanonicalPillar(pillar: string | null | undefined): PillarKey | null {
  const normalized = normalizeToken(pillar);
  return PILLAR_ALIASES[normalized] ?? null;
}

function resolveCanonicalTrait(traitCode: string | null | undefined, traitName: string | null | undefined): string {
  const directTrait = TRAIT_ALIASES[normalizeToken(traitCode)];
  if (directTrait) {
    return directTrait;
  }

  const byName = TRAIT_ALIASES[normalizeToken(traitName)];
  if (byName) {
    return byName;
  }

  return normalizeToken(traitCode) || normalizeToken(traitName);
}

function traitCandidates(canonicalTrait: string, input: SealResolverInput): string[] {
  const mapped = TRAIT_FILENAME_ALIASES[canonicalTrait] ?? [];
  const raw = unique([
    normalizeFilenameToken(input.traitCode),
    normalizeFilenameToken(input.traitName),
    normalizeFilenameToken(canonicalTrait),
  ]);
  return unique([...mapped, ...raw]);
}

export function resolveHabitAchievementSealCandidates(input: SealResolverInput): string[] {
  const pillar = resolveCanonicalPillar(input.pillar);
  if (!pillar) {
    return [];
  }

  const canonicalTrait = resolveCanonicalTrait(input.traitCode, input.traitName);
  const prefixes = PILLAR_FILENAME_PREFIXES[pillar] ?? [];
  const traitTokens = traitCandidates(canonicalTrait, input);

  const candidates: string[] = [];
  prefixes.forEach((prefix) => {
    variantsByUnicodeForm(prefix).forEach((prefixVariant) => {
      traitTokens.forEach((traitToken) => {
        variantsByUnicodeForm(traitToken).forEach((traitVariant) => {
          candidates.push(`/sellos/${prefixVariant} ${traitVariant}.png`);
        });
      });
    });
  });

  return unique(candidates);
}
