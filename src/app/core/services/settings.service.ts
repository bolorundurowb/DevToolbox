import { Injectable, signal, computed, effect } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { SUPPORTED_LOCALES, type LocaleCode } from '../i18n/i18n.types';

export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = '#7a2436' | '#1c4a4f' | '#5b3a8a' | '#8a6515' | '#2f6b35' | '#1a3a5c' | '#a0430f' | '#9d2d72';

/** UI font choices — key is the label stored in settings, value is the CSS font-family stack. */
export const UI_FONTS: Record<string, string> = {
  'System default': '',   // empty → remove override, fall back to styles.css
  'Inter':          '"Inter", ui-sans-serif, system-ui, sans-serif',
  'DM Sans':        '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  'Geist':          '"Geist", ui-sans-serif, system-ui, sans-serif',
};

/** Code / mono font choices. */
export const CODE_FONTS: Record<string, string> = {
  'JetBrains Mono': '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
  'Fira Code':      '"Fira Code", ui-monospace, Menlo, Consolas, monospace',
  'Cascadia Code':  '"Cascadia Code", ui-monospace, Menlo, Consolas, monospace',
  'Source Code Pro': '"Source Code Pro", ui-monospace, Menlo, Consolas, monospace',
  'System mono':    'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
};

/** CSS variables to set for each accent choice — separate light and dark variants */
const ACCENT_VARS: Record<AccentColor, {
  main: string; mainDark: string;
  soft: string; softDark: string;
  ink: string;  inkDark: string;
}> = {
  '#7a2436': {
    main: '#7a2436', mainDark: '#c14a64',
    soft: 'rgba(122,36,54,0.10)',  softDark: 'rgba(193,74,100,0.14)',
    ink:  '#5a1a27', inkDark:  '#f0aabb',
  },
  '#1c4a4f': {
    main: '#1c4a4f', mainDark: '#5dc2c8',
    soft: 'rgba(28,74,79,0.10)',   softDark: 'rgba(93,194,200,0.12)',
    ink:  '#0f2e32', inkDark:  '#a8e1e5',
  },
  '#5b3a8a': {
    main: '#5b3a8a', mainDark: '#9b72d4',
    soft: 'rgba(91,58,138,0.10)',  softDark: 'rgba(155,114,212,0.14)',
    ink:  '#3d2660', inkDark:  '#caaff5',
  },
  '#8a6515': {
    main: '#8a6515', mainDark: '#d4a94a',
    soft: 'rgba(138,101,21,0.10)', softDark: 'rgba(212,169,74,0.14)',
    ink:  '#5a420e', inkDark:  '#f0d08a',
  },
  '#2f6b35': {
    main: '#2f6b35', mainDark: '#5dc26a',
    soft: 'rgba(47,107,53,0.10)',  softDark: 'rgba(93,194,106,0.12)',
    ink:  '#1a4020', inkDark:  '#a8e5b0',
  },
  '#1a3a5c': {
    main: '#1a3a5c', mainDark: '#5a9fd4',
    soft: 'rgba(26,58,92,0.10)',   softDark: 'rgba(90,159,212,0.14)',
    ink:  '#0e2440', inkDark:  '#a0ccee',
  },
  '#a0430f': {
    main: '#a0430f', mainDark: '#e07840',
    soft: 'rgba(160,67,15,0.10)',  softDark: 'rgba(224,120,64,0.14)',
    ink:  '#6e2d08', inkDark:  '#f5b990',
  },
  '#9d2d72': {
    main: '#9d2d72', mainDark: '#d966a8',
    soft: 'rgba(157,45,114,0.10)', softDark: 'rgba(217,102,168,0.14)',
    ink:  '#6e1f50', inkDark:  '#f0b0d8',
  },
};

export interface AppSettings {
  theme: Theme;
  accent: AccentColor;
  uiFont: string;
  codeFont: string;
  startWithSystem: boolean;
  includeBeta: boolean;
  sidebarWidth: number;
  trackHistory: boolean;
  maxHistory: number;
  displayName: string;
  locale: LocaleCode;
}

const DEFAULTS: AppSettings = {
  theme: 'system',
  accent: '#5b3a8a',
  uiFont: 'System default',
  codeFont: 'JetBrains Mono',
  startWithSystem: false,
  includeBeta: false,
  sidebarWidth: 268,
  trackHistory: true,
  maxHistory: 25,
  displayName: '',
  locale: 'en-GB',
};

const STORAGE_KEY = 'dev-core-tools-settings';
const DEFAULT_DISPLAY_NAME = 'Chief';
const MIN_SIDEBAR_WIDTH = 268;

function cleanDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 60);
}

function cleanLocale(value: unknown): LocaleCode {
  return SUPPORTED_LOCALES.includes(value as LocaleCode) ? value as LocaleCode : DEFAULTS.locale;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _settings = signal<AppSettings>(this.load());
  private _systemPrefersDark = signal<boolean>(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  readonly settings = this._settings.asReadonly();
  readonly theme = computed(() => this._settings().theme);
  readonly accent = computed(() => this._settings().accent);
  readonly sidebarWidth = computed(() => this._settings().sidebarWidth);
  readonly displayName = computed(() => cleanDisplayName(this._settings().displayName) || DEFAULT_DISPLAY_NAME);

  readonly effectiveTheme = computed<'light' | 'dark'>(() => {
    const t = this._settings().theme;
    if (t === 'system') {
      return this._systemPrefersDark() ? 'dark' : 'light';
    }
    return t;
  });

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', e => this._systemPrefersDark.set(e.matches));
    }

    // Apply dark/light class
    effect(() => {
      const isDark = this.effectiveTheme() === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
    });

    // Keep the document language aligned with the selected UI locale.
    effect(() => {
      document.documentElement.lang = this._settings().locale;
    });

    // Apply accent color CSS variables whenever accent or theme changes.
    // We use separate light/dark values so text is always legible.
    effect(() => {
      const vars = ACCENT_VARS[this._settings().accent];
      if (!vars) return;
      const isDark = this.effectiveTheme() === 'dark';
      const root = document.documentElement;
      root.style.setProperty('--maroon',      isDark ? vars.mainDark : vars.main);
      root.style.setProperty('--maroon-soft', isDark ? vars.softDark : vars.soft);
      root.style.setProperty('--maroon-ink',  isDark ? vars.inkDark  : vars.ink);
    });

    // Apply font family overrides from settings.
    effect(() => {
      const root = document.documentElement;
      const uiStack = UI_FONTS[this._settings().uiFont] ?? '';
      const codeStack = CODE_FONTS[this._settings().codeFont] ?? CODE_FONTS['JetBrains Mono'];
      if (uiStack) {
        root.style.setProperty('--font-ui', uiStack);
      } else {
        root.style.removeProperty('--font-ui');
      }
      root.style.setProperty('--font-mono', codeStack);
    });
  }

  update(partial: Partial<AppSettings>): void {
    this._settings.update(s => {
      const next = { ...s, ...partial };
      if ('displayName' in partial) {
        next.displayName = cleanDisplayName(partial.displayName);
      }
      if ('locale' in partial) {
        next.locale = cleanLocale(partial.locale);
      }
      this.persist(next);
      return next;
    });
  }

  async hydrateDisplayNameFromSystem(force = false): Promise<void> {
    if (!force && cleanDisplayName(this._settings().displayName)) return;

    try {
      const name = cleanDisplayName(await invoke<string | null>('get_display_name'));
      if (name) this.update({ displayName: name });
    } catch {
      // Browser/dev-server mode cannot access the OS username. The greeting fallback covers this.
    }
  }

  /** Toggle the OS login-item entry and persist the setting. */
  async setStartWithSystem(enabled: boolean): Promise<void> {
    try {
      // Dynamic import so the app still compiles/runs before the package is installed.
      const autostart = await import('@tauri-apps/plugin-autostart');
      if (enabled) {
        await autostart.enable();
      } else {
        await autostart.disable();
      }
    } catch {
      // In browser / dev-server mode, or before the package is installed, silently ignore.
    }
    this.update({ startWithSystem: enabled });
  }

  resetToDefaults(): void {
    this._settings.set({ ...DEFAULTS });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  exportJson(): string {
    return JSON.stringify(this._settings(), null, 2);
  }

  importJson(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw);
      this._settings.update(s => {
        const next = { ...DEFAULTS, ...s, ...parsed };
        next.sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Number(next.sidebarWidth) || MIN_SIDEBAR_WIDTH);
        next.displayName = cleanDisplayName(next.displayName);
        next.locale = cleanLocale(next.locale);
        this.persist(next);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = { ...DEFAULTS, ...JSON.parse(raw) };
        loaded.sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Number(loaded.sidebarWidth) || MIN_SIDEBAR_WIDTH);
        loaded.displayName = cleanDisplayName(loaded.displayName);
        loaded.locale = cleanLocale(loaded.locale);
        return loaded;
      }
    } catch { /* ignore */ }
    return { ...DEFAULTS };
  }

  private persist(s: AppSettings): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
}
