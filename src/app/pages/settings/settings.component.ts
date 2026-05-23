import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SettingsService, Theme, AccentColor } from '../../core/services/settings.service';
import { PinnedService } from '../../core/services/pinned.service';
import { HistoryService } from '../../core/services/history.service';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

type Section = 'General' | 'Appearance' | 'Shortcuts' | 'History' | 'Advanced';

/* Shared nav — kept in sync with about.component.ts */
const NAV = [
  { label: 'General',    icon: 'cog' },
  { label: 'Appearance', icon: 'palette' },
  { label: 'Shortcuts',  icon: 'key' },
  { label: 'History',    icon: 'history' },
  { label: 'Advanced',   icon: 'code-bracket' },
  { label: 'About',      icon: 'information-circle', isAbout: true },
];

const ACCENT_COLORS: { value: AccentColor; label: string }[] = [
  { value: '#5b3a8a', label: 'Purple'  },
  { value: '#7a2436', label: 'Maroon'  },
  { value: '#1c4a4f', label: 'Teal'    },
  { value: '#8a6515', label: 'Gold'    },
  { value: '#2f6b35', label: 'Forest'  },
];

const SHORTCUTS = [
  { section: 'Navigation', rows: [
    { keys: ['⌘ / Ctrl', 'K'],       desc: 'Open search palette' },
    { keys: ['⌘H / Ctrl+Shift', 'H'], desc: 'Go to Home' },
    { keys: ['⌘ / Ctrl', ','],        desc: 'Open Settings' },
  ]},
  { section: 'Window', rows: [
    { keys: ['⌘ / Ctrl', 'W'], desc: 'Close window' },
    { keys: ['⌘ / Ctrl', 'M'], desc: 'Minimise window' },
  ]},
];

@Component({
    selector: 'dt-settings',
    imports: [FormsModule, IconComponent, TopbarComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0;height:100%}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['Settings', active()]" />

  <div style="flex:1;overflow:hidden;display:flex;min-height:0">

    <!-- ── Left nav ─────────────────────────────────────────────────── -->
    <nav style="width:200px;min-width:200px;padding:20px 12px;border-right:1px solid var(--border);background:var(--surface-muted);display:flex;flex-direction:column;gap:2px;overflow-y:auto">
      @for (item of nav; track item.label) {
        <button (click)="handleNav(item)"
          style="display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;border-radius:7px;border:none;cursor:pointer;text-align:left;font-size:13px;font-family:var(--font-ui);transition:background 0.1s"
          [style.background]="item.label === active() ? 'var(--maroon-soft)' : 'transparent'"
          [style.color]="item.label === active() ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="item.label === active() ? '600' : '400'">
          <dt-icon [name]="item.icon" [size]="13" [color]="item.label === active() ? 'var(--maroon)' : 'var(--text-muted)'" />
          {{ item.label }}
        </button>
      }
    </nav>

    <!-- ── Main panel ────────────────────────────────────────────────── -->
    <div style="flex:1;overflow-y:auto;padding:28px 36px 40px">
      <div style="max-width:640px">

        <!-- ══ GENERAL ══════════════════════════════════════════════════ -->
        @if (active() === 'General') {
          <div style="margin-bottom:28px">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">On launch</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              @for (row of launchToggles; track row.key) {
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                  <div>
                    <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">{{ row.label }}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">{{ row.desc }}</div>
                  </div>
                  <button (click)="toggle(row.key)"
                    style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                    [style.background]="getBool(row.key) ? 'var(--teal)' : 'var(--surface-muted)'">
                    <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                      [style.left]="getBool(row.key) ? '19px' : '3px'"></span>
                  </button>
                </div>
              }
            </div>
          </div>

          <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

          <div>
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Updates</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              @for (row of updateToggles; track row.key) {
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                  <div>
                    <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">{{ row.label }}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">{{ row.desc }}</div>
                  </div>
                  <button (click)="toggle(row.key)"
                    style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                    [style.background]="getBool(row.key) ? 'var(--teal)' : 'var(--surface-muted)'">
                    <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                      [style.left]="getBool(row.key) ? '19px' : '3px'"></span>
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- ══ APPEARANCE ════════════════════════════════════════════════ -->
        @if (active() === 'Appearance') {

          <!-- Theme -->
          <div style="margin-bottom:28px">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Theme</h2>
            <div style="display:flex;gap:8px">
              @for (t of themes; track t.value) {
                <button (click)="setTheme(t.value)"
                  style="flex:1;padding:10px 0;border-radius:9px;font-size:13px;font-family:var(--font-ui);cursor:pointer;transition:all 0.15s;display:flex;flex-direction:column;align-items:center;gap:6px"
                  [style.background]="settings().theme === t.value ? 'var(--maroon-soft)' : 'var(--surface)'"
                  [style.color]="settings().theme === t.value ? 'var(--maroon-ink)' : 'var(--text)'"
                  [style.border]="settings().theme === t.value ? '1.5px solid var(--maroon)' : '1px solid var(--border)'"
                  [style.font-weight]="settings().theme === t.value ? '600' : '400'">
                  <dt-icon [name]="t.icon" [size]="18" [color]="settings().theme === t.value ? 'var(--maroon)' : 'var(--text-muted)'" />
                  {{ t.label }}
                </button>
              }
            </div>
          </div>

          <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

          <!-- Accent colour -->
          <div style="margin-bottom:28px">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Accent colour</h2>
            <div style="display:flex;gap:12px;align-items:center">
              @for (ac of accentColors; track ac.value) {
                <button (click)="setAccent(ac.value)" [title]="ac.label"
                  style="width:28px;height:28px;border-radius:50%;cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;display:flex;align-items:center;justify-content:center"
                  [style.background]="ac.value"
                  [style.border]="settings().accent === ac.value ? '2.5px solid var(--text)' : '2px solid transparent'"
                  [style.box-shadow]="settings().accent === ac.value ? '0 0 0 2px ' + ac.value : 'none'"
                  [style.transform]="settings().accent === ac.value ? 'scale(1.15)' : 'scale(1)'">
                  @if (settings().accent === ac.value) {
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  }
                </button>
              }
              <span style="font-size:12.5px;color:var(--text-muted);margin-left:4px">{{ accentLabel() }}</span>
            </div>
          </div>

          <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

          <!-- Fonts (read-only) -->
          <div>
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Fonts</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">UI font</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Used for all interface text</div>
                </div>
                <span style="font-size:12.5px;color:var(--text-faint);font-family:var(--font-ui)">System default</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Code font</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Used in all editor and mono panels</div>
                </div>
                <span style="font-size:12.5px;color:var(--text-faint);font-family:var(--font-mono)">JetBrains Mono</span>
              </div>
            </div>
          </div>
        }

        <!-- ══ SHORTCUTS ══════════════════════════════════════════════════ -->
        @if (active() === 'Shortcuts') {
          <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Keyboard shortcuts</h2>

          <div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:8px">
            <dt-icon name="information-circle" [size]="14" color="var(--text-muted)" />
            <span style="font-size:12.5px;color:var(--text-muted)">
              <strong style="font-family:var(--font-mono)">⌘</strong> on macOS &nbsp;·&nbsp;
              <strong style="font-family:var(--font-mono)">Ctrl</strong> on Windows / Linux
            </span>
          </div>

          @for (group of shortcutGroups; track group.section) {
            <div style="margin-bottom:20px">
              <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">{{ group.section }}</div>
              <div style="display:flex;flex-direction:column;gap:12px">
                @for (row of group.rows; track row.desc) {
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                    <span style="font-size:13.5px;color:var(--text);font-weight:500">{{ row.desc }}</span>
                    <div style="display:flex;gap:4px;align-items:center">
                      @for (k of row.keys; track k; let last = $last) {
                        <kbd style="padding:2px 8px;border-radius:5px;background:var(--surface-muted);border:1px solid var(--border);font-size:11.5px;font-family:var(--font-mono);color:var(--text)">{{ k }}</kbd>
                        @if (!last) { <span style="font-size:10px;color:var(--text-faint)">+</span> }
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- ══ HISTORY ════════════════════════════════════════════════════ -->
        @if (active() === 'History') {
          <div style="margin-bottom:28px">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">History settings</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Track tool history</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Show recently used tools in the sidebar</div>
                </div>
                <button (click)="toggle('trackHistory')"
                  style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                  [style.background]="settings().trackHistory ? 'var(--teal)' : 'var(--surface-muted)'">
                  <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                    [style.left]="settings().trackHistory ? '19px' : '3px'"></span>
                </button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Max recent items</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Currently set to {{ settings().maxHistory }} items</div>
                </div>
                <input type="range" [(ngModel)]="maxHistoryProxy" (ngModelChange)="setMaxHistory($event)"
                  min="5" max="50" step="5"
                  style="width:120px;accent-color:var(--maroon)" />
              </div>
            </div>
          </div>

          <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

          <div>
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Danger zone</h2>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Clear recent history</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Remove all recently visited tools from the sidebar</div>
              </div>
              <button (click)="clearHistory()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b;white-space:nowrap">
                Clear
              </button>
            </div>
            @if (historyCleared()) {
              <div style="margin-top:12px;padding:10px 14px;background:rgba(28,74,79,0.1);border:1px solid rgba(28,74,79,0.25);border-radius:8px;font-size:12.5px;color:var(--teal);display:flex;align-items:center;gap:6px">
                <dt-icon name="check-circle" [size]="14" color="var(--teal)" /> History cleared.
              </div>
            }
          </div>
        }

        <!-- ══ ADVANCED ════════════════════════════════════════════════════ -->
        @if (active() === 'Advanced') {
          <div style="margin-bottom:28px">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Settings file</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Export settings</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Download your settings as a JSON file</div>
                </div>
                <button (click)="exportSettings()"
                  style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);white-space:nowrap">
                  Export
                </button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Import settings</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Restore from a previously exported file</div>
                </div>
                <button (click)="importSettings()"
                  style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);white-space:nowrap">
                  Import…
                </button>
              </div>
            </div>
          </div>

          <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

          <div>
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Danger zone</h2>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Reset settings</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Restore all settings to their factory defaults</div>
                </div>
                <button (click)="confirmReset()"
                  style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b;white-space:nowrap">
                  {{ resetPending() ? 'Confirm reset?' : 'Reset' }}
                </button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">Clear all data</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">Erase settings, pinned tools, and history</div>
                </div>
                <button (click)="confirmClearAll()"
                  style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b;white-space:nowrap">
                  {{ clearAllPending() ? 'Confirm clear?' : 'Clear all' }}
                </button>
              </div>
            </div>
          </div>

          @if (importError()) {
            <div style="margin-top:16px;padding:10px 14px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:8px;font-size:12.5px;color:#c0392b">
              Import failed: {{ importError() }}
            </div>
          }
          @if (importOk()) {
            <div style="margin-top:16px;padding:10px 14px;background:rgba(28,74,79,0.1);border:1px solid rgba(28,74,79,0.25);border-radius:8px;font-size:12.5px;color:var(--teal);display:flex;align-items:center;gap:6px">
              <dt-icon name="check-circle" [size]="14" color="var(--teal)" /> Settings imported successfully.
            </div>
          }
        }

      </div>
    </div>
  </div>
</div>
`
})
export class SettingsComponent {
  private router      = inject(Router);
  private svc         = inject(SettingsService);
  private pinned      = inject(PinnedService);
  private historySvc  = inject(HistoryService);

  readonly nav          = NAV;
  readonly accentColors = ACCENT_COLORS;
  readonly shortcutGroups = SHORTCUTS;

  readonly themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light',  label: 'Light',  icon: 'eye' },
    { value: 'dark',   label: 'Dark',   icon: 'eye-slash' },
    { value: 'system', label: 'System', icon: 'cog' },
  ];

  readonly launchToggles: { key: string; label: string; desc: string }[] = [
    { key: 'openLastTool',     label: 'Open last used tool',   desc: 'Resume where you left off' },
    { key: 'showReleaseNotes', label: 'Show release notes',    desc: 'Display what\'s new after an update' },
    { key: 'startWithSystem',  label: 'Start with system',     desc: 'Launch Dev Core Tools at login' },
  ];

  readonly updateToggles: { key: string; label: string; desc: string }[] = [
    { key: 'autoCheckUpdates',  label: 'Auto-check for updates', desc: 'Check in the background periodically' },
    { key: 'bgDownloadUpdates', label: 'Background download',    desc: 'Download updates silently' },
    { key: 'includeBeta',       label: 'Include beta releases',  desc: 'Opt in to pre-release builds' },
  ];

  readonly active          = signal<string>('General');
  readonly settings        = this.svc.settings;
  readonly historyCleared  = signal(false);
  readonly resetPending    = signal(false);
  readonly clearAllPending = signal(false);
  readonly importError     = signal('');
  readonly importOk        = signal(false);

  maxHistoryProxy = this.svc.settings().maxHistory;

  getBool(key: string): boolean {
    return !!(this.svc.settings() as unknown as Record<string, unknown>)[key];
  }

  accentLabel(): string {
    return ACCENT_COLORS.find(a => a.value === this.settings().accent)?.label ?? '';
  }

  handleNav(item: { label: string; isAbout?: boolean }): void {
    if (item.isAbout) { this.router.navigate(['/about']); return; }
    this.active.set(item.label);
  }

  setTheme(theme: Theme): void { this.svc.update({ theme }); }
  setAccent(accent: AccentColor): void { this.svc.update({ accent }); }

  toggle(key: string): void {
    const cur = (this.svc.settings() as unknown as Record<string, unknown>)[key];
    this.svc.update({ [key]: !cur } as any);
  }

  setMaxHistory(v: number): void { this.svc.update({ maxHistory: Number(v) }); }

  clearHistory(): void {
    this.pinned.clearRecent();
    this.historySvc.clearAll();
    this.historyCleared.set(true);
    setTimeout(() => this.historyCleared.set(false), 2500);
  }

  confirmReset(): void {
    if (this.resetPending()) { this.svc.resetToDefaults(); this.resetPending.set(false); }
    else { this.resetPending.set(true); setTimeout(() => this.resetPending.set(false), 3000); }
  }

  confirmClearAll(): void {
    if (this.clearAllPending()) {
      this.svc.resetToDefaults(); this.pinned.clearAll(); this.clearAllPending.set(false);
    } else {
      this.clearAllPending.set(true); setTimeout(() => this.clearAllPending.set(false), 3000);
    }
  }

  exportSettings(): void {
    const blob = new Blob([this.svc.exportJson()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'dev-core-tools-settings.json'; a.click();
    URL.revokeObjectURL(url);
  }

  importSettings(): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          this.svc.importJson(ev.target?.result as string);
          this.importOk.set(true);
          this.importError.set('');
          setTimeout(() => this.importOk.set(false), 2500);
        } catch (err: any) {
          this.importError.set(err?.message ?? 'Unknown error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
