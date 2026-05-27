import { Injectable, computed, inject } from '@angular/core';
import { SettingsService } from '../services/settings.service';
import { EN_GB } from './en-GB';
import { ES_ES } from './es-ES';
import { FR_FR } from './fr-FR';
import { RU_RU } from './ru-RU';
import { ZH_CN } from './zh-CN';
import type { LocaleCode, LocaleDefinition, TranslationDictionary, TranslationParams } from './i18n.types';

const DICTIONARIES: Record<LocaleCode, TranslationDictionary> = {
  'en-GB': EN_GB,
  'es-ES': ES_ES,
  'zh-CN': ZH_CN,
  'fr-FR': FR_FR,
  'ru-RU': RU_RU,
};

export const AVAILABLE_LOCALES: LocaleDefinition[] = [
  { code: 'en-GB', label: 'English (UK)', nativeLabel: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'zh-CN', label: 'Mandarin Chinese', nativeLabel: '简体中文' },
  { code: 'fr-FR', label: 'French', nativeLabel: 'Français' },
  { code: 'ru-RU', label: 'Russian', nativeLabel: 'Русский' },
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

