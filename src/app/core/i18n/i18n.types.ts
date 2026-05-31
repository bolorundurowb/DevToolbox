export type LocaleCode = 'en-GB' | 'es-ES' | 'zh-CN' | 'fr-FR' | 'ru-RU';

export const SUPPORTED_LOCALES: readonly LocaleCode[] = ['en-GB', 'es-ES', 'zh-CN', 'fr-FR', 'ru-RU'];

export interface LocaleDefinition {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
}

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;
export type TranslationDictionary = Record<string, string>;

