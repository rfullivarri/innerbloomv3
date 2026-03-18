import { OFFICIAL_LANDING_CONTENT, type Language } from '../content/officialLandingContent';
import { GAME_MODE_META } from '../lib/gameModeMeta';
import type { GameMode } from '../lib/gameMode';

export type LabsGameModeId = 'low' | 'chill' | 'flow' | 'evolve';

export interface LabsGameModeConfig {
  id: LabsGameModeId;
  gameMode: GameMode;
  image: string;
  loop: string;
  accentColor: string;
}

export const LABS_GAME_MODES: Record<LabsGameModeId, LabsGameModeConfig> = {
  low: {
    id: 'low',
    gameMode: 'Low',
    image: '/LowVertical.png',
    loop: '/avatars/low-basic.mp4',
    accentColor: GAME_MODE_META.Low.accentColor,
  },
  chill: {
    id: 'chill',
    gameMode: 'Chill',
    image: '/ChillVertical.png',
    loop: '/avatars/chill-basic.mp4',
    accentColor: GAME_MODE_META.Chill.accentColor,
  },
  flow: {
    id: 'flow',
    gameMode: 'Flow',
    image: '/FlowVertical.png',
    loop: '/avatars/flow-basic.mp4',
    accentColor: GAME_MODE_META.Flow.accentColor,
  },
  evolve: {
    id: 'evolve',
    gameMode: 'Evolve',
    image: '/EvolveVertical.png',
    loop: '/avatars/evolve-basic.mp4',
    accentColor: GAME_MODE_META.Evolve.accentColor,
  },
};

export const LABS_GAME_MODE_ORDER: LabsGameModeId[] = ['low', 'chill', 'flow', 'evolve'];

export const LABS_DEMO_MODE_SELECT_COPY: Record<Language, { badge: string; title: string; subtitle: string }> = {
  es: {
    badge: 'Labs demo',
    title: 'Elige la demo que mejor encaja con tu ritmo actual',
    subtitle: 'Mira cómo se vería Innerbloom según tu energía y tu forma real de avanzar.',
  },
  en: {
    badge: 'Labs demo',
    title: 'Choose the demo that best fits your current rhythm',
    subtitle: 'See how Innerbloom would look based on your energy and the way you actually move forward.',
  },
};

export function isLabsGameModeId(value: string | null | undefined): value is LabsGameModeId {
  return value === 'low' || value === 'chill' || value === 'flow' || value === 'evolve';
}

export function resolveLabsGameModeId(value: string | null | undefined, fallback: LabsGameModeId = 'flow'): LabsGameModeId {
  return isLabsGameModeId(value) ? value : fallback;
}

export function getLabsGameModeLabel(modeId: LabsGameModeId, language: Language): string {
  const item = OFFICIAL_LANDING_CONTENT[language].modes.items.find((mode) => mode.id === modeId);
  return item?.title ?? LABS_GAME_MODES[modeId].gameMode.toUpperCase();
}

export function getLabsGameModeConfig(modeId: string | null | undefined): LabsGameModeConfig {
  const resolvedId = resolveLabsGameModeId(modeId);
  return LABS_GAME_MODES[resolvedId];
}

