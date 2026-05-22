import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';
export type AccentColor = '#7a2436' | '#1c4a4f' | '#5b3a8a' | '#8a6515' | '#2f6b35';

/** CSS variables to set for each accent choice */
const ACCENT_VARS: Record<AccentColor, { main: string; soft: string; ink: string }> = {
  '#7a2436': { main: '#7a2436', soft: 'rgba(122,36,54,0.10)',  ink: '#5a1a27' },
  '#1c4a4f': { main: '#1c4a4f', soft: 'rgba(28,74,79,0.10)',   ink: '#0f2e32' },
  '#5b3a8a': { main: '#5b3a8a', soft: 'rgba(91,58,138,0.10)',  ink: '#3d2660' },
  '#8a6515': { main: '#8a6515', soft: 'rgba(138,101,21,0.10)', ink: '#5a420e' },
  '#2f6b35': { main: '#2f6b35', soft: 'rgba(47,107,53,0.10)',  ink: '#1a4020' },
};

export interface AppSettings {
  theme: Theme;
  accent: AccentColor;
  uiFont: string;
  codeFont: string;
  density: Density;
  openLastTool: boolean;
  showReleaseNotes: boolean;
  startWithSystem: boolean;
  autoCheckUpdates: boolean;
  bgDownloadUpdates: boolean;
  includeBeta: boolean;
  sidebarWidth: number;
  showPinnedBar: boolean;
  trackHistory: boolean;
  maxHistory: number;
}

const DEFAULTS: AppSettings = {
  theme: 'system',
  accent: '#7a2436',
  uiFont: 'System default',
  codeFont: 'JetBrains Mono',
  density: 'comfortable',
  openLastTool: true,
  showReleaseNotes: false,
  startWithSystem: false,
  autoCheckUpdates: true,
  bgDownloadUpdates: false,
  includeBeta: false,
  sidebarWidth: 232,
  showPinnedBar: true,
  trackHistory: true,
  maxHistory: 25,
};

const STORAGE_KEY = 'devtoolbox-settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _settings = signal<AppSettings>(this.load());

  readonly settings = this._settings.asReadonly();
  readonly theme = computed(() => this._settings().theme);
  readonly accent = computed(() => this._settings().accent);
  readonly density = computed(() => this._settings().density);
  readonly sidebarWidth = computed(() => this._settings().sidebarWidth);

  readonly effectiveTheme = computed<'light' | 'dark'>(() => {
    const t = this._settings().theme;
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  });

  constructor() {
    // Apply dark/light class
    effect(() => {
      const isDark = this.effectiveTheme() === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
    });

    // Apply accent color CSS variables whenever accent changes
    effect(() => {
      const vars = ACCENT_VARS[this._settings().accent];
      if (!vars) return;
      const root = document.documentElement;
      root.style.setProperty('--maroon',      vars.main);
      root.style.setProperty('--maroon-soft', vars.soft);
      root.style.setProperty('--maroon-ink',  vars.ink);
    });
  }

  update(partial: Partial<AppSettings>): void {
    this._settings.update(s => {
      const next = { ...s, ...partial };
      this.persist(next);
      return next;
    });
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
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULTS };
  }

  private persist(s: AppSettings): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
}
