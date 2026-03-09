import type { PostLoginLanguage } from '../postLoginLanguage';

export type TranslationEntry = Record<PostLoginLanguage, string>;
export type PostLoginTranslations = Record<string, TranslationEntry>;
