import { Injectable, computed, inject } from '@angular/core';
import { SettingsService } from '../services/settings.service';
import { EN_GB } from './en-GB';
import type { LocaleCode, LocaleDefinition, TranslationDictionary, TranslationParams } from './i18n.types';

const DICTIONARIES: Record<LocaleCode, TranslationDictionary> = {
  'en-GB': EN_GB,
};

export const AVAILABLE_LOCALES: LocaleDefinition[] = [
  { code: 'en-GB', label: 'English (UK)', nativeLabel: 'English (UK)' },
];

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => {
    const next = params[key];
    return next == null ? '' : String(next);
  });
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settingsService = inject(SettingsService);

  readonly locale = computed(() => this.settingsService.settings().locale);
  readonly availableLocales = AVAILABLE_LOCALES;

  t(key: string, params?: TranslationParams): string {
    const locale = this.locale();
    const dictionary = DICTIONARIES[locale] ?? DICTIONARIES['en-GB'];
    const fallback = DICTIONARIES['en-GB'][key];
    return interpolate(dictionary[key] ?? fallback ?? key, params);
  }

  translateText(source: string): string {
    return this.t(source);
  }
}

