export type LocaleCode = 'en-GB';

export interface LocaleDefinition {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
}

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;
export type TranslationDictionary = Record<string, string>;

