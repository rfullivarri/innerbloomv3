import { normalizeGameModeValue } from './gameMode';
import { GAME_MODE_META, type LocalizedLanguage } from './gameModeMeta';

export type RhythmUpgradeVisual = {
  label: string;
  imageUrl: string | null;
  alt: string;
};

export function resolveRhythmUpgradeVisual(
  mode: string | null,
  language: LocalizedLanguage = 'en',
): RhythmUpgradeVisual {
  const normalized = normalizeGameModeValue(mode);

  if (!normalized) {
    return {
      label: language === 'es' ? 'Ritmo · —' : 'Rhythm · —',
      imageUrl: null,
      alt: language === 'es' ? 'Visual de ritmo pendiente' : 'Pending rhythm visual',
    };
  }

  const frequency = GAME_MODE_META[normalized].frequency[language];
  const rhythmWord = language === 'es' ? 'Ritmo' : 'Rhythm';

  return {
    label: `${normalized} · ${frequency}`,
    imageUrl: null,
    alt: `${rhythmWord} ${normalized}`,
  };
}
