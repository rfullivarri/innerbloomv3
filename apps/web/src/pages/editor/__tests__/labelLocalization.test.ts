import { describe, expect, it } from 'vitest';

import {
  localizeDifficultyLabel,
  localizePillarLabel,
  localizeTraitLabel,
} from '../labelLocalization';

const TRAITS_CATALOG = [
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
] as const;

describe('editor label localization', () => {
  it('localizes pillar labels', () => {
    expect(localizePillarLabel('Cuerpo', 'en')).toBe('Body');
    expect(localizePillarLabel('Mind', 'es')).toBe('Mente');
    expect(localizePillarLabel('Alma', 'en')).toBe('Soul');
  });

  it('localizes difficulty labels', () => {
    expect(localizeDifficultyLabel('Fácil', 'en')).toBe('Easy');
    expect(localizeDifficultyLabel('Media', 'en')).toBe('Medium');
    expect(localizeDifficultyLabel('Hard', 'es')).toBe('Difícil');
  });

  it('covers the full trait catalog in both locales', () => {
    expect(TRAITS_CATALOG).toHaveLength(30);

    for (const trait of TRAITS_CATALOG) {
      expect(localizeTraitLabel({ code: trait.code }, 'es')).toBe(trait.es);
      expect(localizeTraitLabel({ code: trait.code }, 'en')).toBe(trait.en);

      expect(localizeTraitLabel({ name: trait.es }, 'en')).toBe(trait.en);
      expect(localizeTraitLabel({ name: trait.en }, 'es')).toBe(trait.es);
    }
  });
});
