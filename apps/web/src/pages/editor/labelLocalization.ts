import type { PostLoginLanguage } from '../../i18n/postLoginLanguage';

type Locale = PostLoginLanguage;

type LocalizedLabel = {
  es: string;
  en: string;
};

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const PILLAR_LABELS_BY_KEY: Record<string, LocalizedLabel> = {
  body: { es: 'Cuerpo', en: 'Body' },
  mind: { es: 'Mente', en: 'Mind' },
  soul: { es: 'Alma', en: 'Soul' },
  cuerpo: { es: 'Cuerpo', en: 'Body' },
  mente: { es: 'Mente', en: 'Mind' },
  alma: { es: 'Alma', en: 'Soul' },
};

const DIFFICULTY_LABELS_BY_KEY: Record<string, LocalizedLabel> = {
  easy: { es: 'Fácil', en: 'Easy' },
  facil: { es: 'Fácil', en: 'Easy' },
  low: { es: 'Fácil', en: 'Easy' },
  medium: { es: 'Media', en: 'Medium' },
  media: { es: 'Media', en: 'Medium' },
  medio: { es: 'Media', en: 'Medium' },
  hard: { es: 'Difícil', en: 'Hard' },
  dificil: { es: 'Difícil', en: 'Hard' },
  high: { es: 'Difícil', en: 'Hard' },
};

const TRAIT_TRANSLATIONS: Array<{ code: string; es: string; en: string }> = [
  { code: 'energy', es: 'Energía', en: 'Energy' },
  { code: 'nutrition', es: 'Nutrición', en: 'Nutrition' },
  { code: 'sleep', es: 'Sueño', en: 'Sleep' },
  { code: 'recovery', es: 'Recuperación', en: 'Recovery' },
  { code: 'hydration', es: 'Hidratación', en: 'Hydration' },
  { code: 'hygiene', es: 'Higiene', en: 'Hygiene' },
  { code: 'vitality', es: 'Vitalidad', en: 'Vitality' },
  { code: 'posture', es: 'Postura', en: 'Posture' },
  { code: 'mobility', es: 'Movilidad', en: 'Mobility' },
  { code: 'moderation', es: 'Moderación', en: 'Moderation' },
  { code: 'focus', es: 'Enfoque', en: 'Focus' },
  { code: 'learning', es: 'Aprendizaje', en: 'Learning' },
  { code: 'creativity', es: 'Creatividad', en: 'Creativity' },
  { code: 'management', es: 'Gestión', en: 'Management' },
  { code: 'selfcontrol', es: 'Autocontrol', en: 'Self-control' },
  { code: 'resilience', es: 'Resiliencia', en: 'Resilience' },
  { code: 'order', es: 'Orden', en: 'Order' },
  { code: 'projection', es: 'Proyección', en: 'Projection' },
  { code: 'finances', es: 'Finanzas', en: 'Finances' },
  { code: 'agility', es: 'Agilidad', en: 'Agility' },
  { code: 'connection', es: 'Conexión', en: 'Connection' },
  { code: 'spirituality', es: 'Espiritualidad', en: 'Spirituality' },
  { code: 'purpose', es: 'Propósito', en: 'Purpose' },
  { code: 'values', es: 'Valores', en: 'Values' },
  { code: 'altruism', es: 'Altruismo', en: 'Altruism' },
  { code: 'insight', es: 'Insight', en: 'Insight' },
  { code: 'gratitude', es: 'Gratitud', en: 'Gratitude' },
  { code: 'nature', es: 'Naturaleza', en: 'Nature' },
  { code: 'joy', es: 'Gozo', en: 'Joy' },
  { code: 'selfesteem', es: 'Autoestima', en: 'Self-esteem' },
];

const TRAIT_LABELS_BY_KEY = new Map<string, LocalizedLabel>();

for (const trait of TRAIT_TRANSLATIONS) {
  const label = { es: trait.es, en: trait.en };
  TRAIT_LABELS_BY_KEY.set(normalizeCode(trait.code), label);
  TRAIT_LABELS_BY_KEY.set(normalizeKey(trait.es), label);
  TRAIT_LABELS_BY_KEY.set(normalizeKey(trait.en), label);
}

export function localizePillarLabel(value: string, language: Locale): string {
  const normalizedValue = normalizeKey(value);
  const labels = PILLAR_LABELS_BY_KEY[normalizedValue];
  return labels ? labels[language] : value;
}

export function localizeDifficultyLabel(value: string, language: Locale): string {
  const normalizedValue = normalizeKey(value);
  const labels = DIFFICULTY_LABELS_BY_KEY[normalizedValue];
  return labels ? labels[language] : value;
}

export function localizeTraitLabel(
  input: { name?: string | null; code?: string | null; fallback?: string | null },
  language: Locale,
): string {
  const searchKeys = [input.code ?? '', input.name ?? '', input.fallback ?? '']
    .map((entry) => normalizeKey(entry))
    .filter((entry) => entry.length > 0);

  for (const key of searchKeys) {
    const labels = TRAIT_LABELS_BY_KEY.get(key);
    if (labels) {
      return labels[language];
    }
  }

  return input.name?.trim() || input.fallback?.trim() || '';
}
