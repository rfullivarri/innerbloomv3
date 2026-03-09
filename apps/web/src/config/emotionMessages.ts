import type { PostLoginLanguage } from '../i18n/postLoginLanguage';
import emotionMessagesEs from './emotion_messages.es.json';
import emotionMessagesEn from './emotion_messages.en.json';

export type EmotionMessageKey =
  | 'felicidad'
  | 'motivacion'
  | 'calma'
  | 'cansancio'
  | 'ansiedad'
  | 'tristeza'
  | 'frustracion';

type EmotionMessageEntry = {
  label: string;
  tone: string;
  weekly_message: string;
  biweekly_context: string;
};

type EmotionMessagesByLanguage = Record<EmotionMessageKey, EmotionMessageEntry>;

const EMOTION_MESSAGES: Record<PostLoginLanguage, EmotionMessagesByLanguage> = {
  es: emotionMessagesEs as EmotionMessagesByLanguage,
  en: emotionMessagesEn as EmotionMessagesByLanguage,
};

const NEUTRAL_EMOTION_COPY: Record<PostLoginLanguage, EmotionMessageEntry> = {
  es: {
    label: 'Emoción registrada',
    tone: 'neutro',
    weekly_message: 'Todavía no tenemos suficiente contexto para personalizar este insight.',
    biweekly_context: 'Vamos a mostrar una lectura más precisa cuando haya más registros emocionales.',
  },
  en: {
    label: 'Emotion logged',
    tone: 'neutral',
    weekly_message: "We don't have enough context yet to personalize this insight.",
    biweekly_context: 'We will show a more precise trend once more emotional records are available.',
  },
};

export function resolveEmotionCopy(language: PostLoginLanguage, key?: EmotionMessageKey | null): EmotionMessageEntry {
  if (!key) {
    return NEUTRAL_EMOTION_COPY[language];
  }

  const message = EMOTION_MESSAGES[language][key];
  if (!message) {
    return NEUTRAL_EMOTION_COPY[language];
  }

  return message;
}
