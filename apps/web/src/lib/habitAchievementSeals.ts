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
  RESISTENCIA: 'ENDURANCE',
  RESISTANCE: 'ENDURANCE',
  ENDURANCE: 'ENDURANCE',
  MOVIMIENTO: 'MOVEMENT',
  MOVEMENT: 'MOVEMENT',
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
  APRENDIZAJE: 'LEARNING',
  LEARNING: 'LEARNING',
  CREATIVIDAD: 'CREATIVITY',
  CREATIVITY: 'CREATIVITY',
  GESTION: 'MANAGEMENT',
  MANAGEMENT: 'MANAGEMENT',
  AUTOCONTROL: 'SELF_CONTROL',
  SELFCONTROL: 'SELF_CONTROL',
  SELF_CONTROL: 'SELF_CONTROL',
  RESILIENCIA: 'RESILIENCE',
  RESILIENCE: 'RESILIENCE',
  ORDEN: 'ORDER',
  ORDER: 'ORDER',
  PROYECCION: 'PROJECTION',
  PROJECTION: 'PROJECTION',
  FINANZAS: 'FINANCES',
  FINANCES: 'FINANCES',
  AGILIDAD: 'AGILITY',
  AGILITY: 'AGILITY',
  CONEXION: 'CONNECTION',
  CONNECTION: 'CONNECTION',
  ESPIRITUALIDAD: 'SPIRITUALITY',
  SPIRITUALITY: 'SPIRITUALITY',
  PROPOSITO: 'PURPOSE',
  PURPOSE: 'PURPOSE',
  VALORES: 'VALUES',
  VALUES: 'VALUES',
  ALTRUISMO: 'ALTRUISM',
  ALTRUISM: 'ALTRUISM',
  INSIGHT: 'INSIGHT',
  GRATITUD: 'GRATITUDE',
  GRATITUDE: 'GRATITUDE',
  NATURALEZA: 'NATURE',
  NATURE: 'NATURE',
  GOZO: 'JOY',
  JOY: 'JOY',
  AUTOESTIMA: 'SELF_ESTEEM',
  SELFESTEEM: 'SELF_ESTEEM',
  SELF_ESTEEM: 'SELF_ESTEEM',
  CALM: 'CALM',
  EMPATHY: 'EMPATHY',
  EXPRESSION: 'EXPRESSION',
  FRIENDSHIP: 'FRIENDSHIP',
  LOVE: 'LOVE',
  PRESENCE: 'PRESENCE',
  INTROSPECTION: 'INTROSPECTION',
};

const TRAIT_FILENAME_ALIASES: Record<string, string[]> = {
  ENERGY: ['ENERGIA', 'ENERGY'],
  STRENGTH: ['FUERZA', 'STRENGTH'],
  HYDRATION: ['HIDRATACION', 'HYDRATION'],
  MOBILITY: ['MOVILIDAD', 'MOBILITY'],
  NUTRITION: ['NUTRICION', 'NUTRITION'],
  POSTURE: ['POSTURA', 'POSTURE'],
  RECOVERY: ['RECUPERACION', 'RECOVERY'],
  ENDURANCE: ['RESISTENCIA', 'RESISTANCE', 'ENDURANCE'],
  MOVEMENT: ['MOVIMIENTO', 'MOVEMENT'],
  SLEEP: ['SUEÑO', 'SUENO', 'SLEEP'],
  CURIOSITY: ['CURIOSIDAD', 'CURIOCIDAD', 'CURIOSITY'],
  DISCIPLINE: ['DISCIPLINA', 'DISCIPLINE', 'DICIPLINE'],
  FOCUS: ['ENFOQUE', 'FOCUS'],
  LEARNING: ['APRENDIZAJE', 'LEARNING'],
  CREATIVITY: ['CREATIVIDAD', 'CREATIVITY'],
  MANAGEMENT: ['GESTION', 'GESTIÓN', 'MANAGEMENT'],
  SELF_CONTROL: ['AUTOCONTROL', 'SELF_CONTROL', 'SELF-CONTROL', 'SELFCONTROL'],
  RESILIENCE: ['RESILIENCIA', 'RESILIENCE'],
  ORDER: ['ORDEN', 'ORDER'],
  PROJECTION: ['PROYECCION', 'PROYECCIÓN', 'PROJECTION'],
  FINANCES: ['FINANZAS', 'FINANCES'],
  AGILITY: ['AGILIDAD', 'AGILITY'],
  CONNECTION: ['CONEXION', 'CONNECTION'],
  SPIRITUALITY: ['ESPIRITUALIDAD', 'SPIRITUALITY'],
  PURPOSE: ['PROPOSITO', 'PURPOSE'],
  VALUES: ['VALORES', 'VALUES'],
  ALTRUISM: ['ALTRUISMO', 'ALTRUISM'],
  INSIGHT: ['INSIGHT'],
  GRATITUDE: ['GRATITUD', 'GRATITUDE'],
  NATURE: ['NATURALEZA', 'NATURE'],
  JOY: ['GOZO', 'JOY'],
  SELF_ESTEEM: ['AUTOESTIMA', 'SELF_ESTEEM', 'SELFESTEEM'],
  CALM: ['CALM'],
  EMPATHY: ['EMPATHY'],
  EXPRESSION: ['EXPRESSION'],
  FRIENDSHIP: ['FRIENDSHIP'],
  LOVE: ['LOVE'],
  PRESENCE: ['PRESENCE'],
  INTROSPECTION: ['INTROSPECTION'],
};

const BODY_SEAL_ASSETS: Record<string, string> = {
  ENERGY: 'energy',
  STRENGTH: 'strength',
  HYDRATION: 'hydration',
  MOBILITY: 'mobility',
  NUTRITION: 'nutrition',
  POSTURE: 'posture',
  RECOVERY: 'recovery',
  ENDURANCE: 'endurance',
  MOVEMENT: 'movement',
  SLEEP: 'sleep',
};

const MIND_SEAL_ASSETS: Record<string, string> = {
  FOCUS: 'focus',
  LEARNING: 'learning',
  CREATIVITY: 'creativity',
  MANAGEMENT: 'management',
  SELF_CONTROL: 'self_control',
  RESILIENCE: 'resilience',
  ORDER: 'order',
  PROJECTION: 'projection',
  FINANCES: 'finances',
  AGILITY: 'agility',
};

const SOUL_SEAL_ASSETS: Record<string, string> = {
  // Traits actuales de Quick Start / producto
  CONNECTION: 'connection',
  SPIRITUALITY: 'presence',
  PURPOSE: 'expression',
  VALUES: 'calm',
  ALTRUISM: 'empathy',
  INSIGHT: 'introspection',
  GRATITUDE: 'gratitude',
  NATURE: 'presence',
  JOY: 'joy',
  SELF_ESTEEM: 'love',

  // Nombres reales disponibles en /public/sellos/soul
  CALM: 'calm',
  EMPATHY: 'empathy',
  EXPRESSION: 'expression',
  FRIENDSHIP: 'friendship',
  LOVE: 'love',
  PRESENCE: 'presence',
  INTROSPECTION: 'introspection',
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
  const directAssetByPillar: Partial<Record<PillarKey, Record<string, string>>> = {
    BODY: BODY_SEAL_ASSETS,
    MIND: MIND_SEAL_ASSETS,
    SOUL: SOUL_SEAL_ASSETS,
  };

  const directAsset = directAssetByPillar[pillar]?.[canonicalTrait] ?? null;
  if (directAsset) {
    if (pillar === 'SOUL') {
      candidates.push(`/sellos/soul/soul_${directAsset}_transparent.png`);
    } else {
      candidates.push(`/sellos/${pillar.toLowerCase()}/sello_${pillar.toLowerCase()}_${directAsset}.png`);
    }
  }

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
