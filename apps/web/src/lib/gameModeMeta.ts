import type { GameMode } from './gameMode';

export type LocalizedLanguage = 'es' | 'en';

export interface GameModeMeta {
  title: string;
  frequency: Record<LocalizedLanguage, string>;
  state: Record<LocalizedLanguage, string>;
  objective: Record<LocalizedLanguage, string>;
  accentColor: string;
  avatarSrc: string;
  avatarAlt: Record<LocalizedLanguage, string>;
}

export const GAME_MODE_ORDER: GameMode[] = ['Low', 'Chill', 'Flow', 'Evolve'];

export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  Flow: {
    title: 'FLOW MOOD',
    frequency: { es: '3x/semana', en: '3x/week' },
    state: { es: 'En foco. En movimiento.', en: 'Focused. In motion.' },
    objective: { es: 'Canalizar energía en metas concretas.', en: 'Channel your energy into concrete goals.' },
    accentColor: '#49C2F2',
    avatarSrc: '/flowVertical.jpg',
    avatarAlt: {
      es: 'Avatar del modo Flow en movimiento y enfocado.',
      en: 'Flow mode avatar in motion and focused.',
    },
  },
  Low: {
    title: 'LOW MOOD',
    frequency: { es: '1x/semana', en: '1x/week' },
    state: { es: 'Baja energía. Saturado.', en: 'Low energy. Overwhelmed.' },
    objective: { es: 'Activar lo mínimo vital con pasos pequeños.', en: 'Activate the essentials with small steps.' },
    accentColor: '#FF6B6B',
    avatarSrc: '/lowVertical.jpg',
    avatarAlt: {
      es: 'Avatar del modo Low con expresión de descanso.',
      en: 'Low mode avatar with a resting expression.',
    },
  },
  Chill: {
    title: 'CHILL MOOD',
    frequency: { es: '2x/semana', en: '2x/week' },
    state: { es: 'Estable. Sin presión.', en: 'Stable. No pressure.' },
    objective: { es: 'Sostener hábitos simples con constancia.', en: 'Sustain simple habits consistently.' },
    accentColor: '#6EDC8C',
    avatarSrc: '/chillVertical.jpg',
    avatarAlt: {
      es: 'Avatar del modo Chill con expresión de calma.',
      en: 'Chill mode avatar with a calm expression.',
    },
  },
  Evolve: {
    title: 'EVOLVE MOOD',
    frequency: { es: '4x/semana', en: '4x/week' },
    state: { es: 'Ambicioso. Determinado.', en: 'Ambitious. Determined.' },
    objective: { es: 'Sostener ritmo alto con estructura clara.', en: 'Keep a high pace with clear structure.' },
    accentColor: '#9B6CFF',
    avatarSrc: '/evolveVertical.jpg',
    avatarAlt: {
      es: 'Avatar del modo Evolve con expresión determinada.',
      en: 'Evolve mode avatar with a determined expression.',
    },
  },
};
