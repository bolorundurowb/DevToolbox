import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SettingsService, Theme, AccentColor } from '../../core/services/settings.service';
import { PinnedService } from '../../core/services/pinned.service';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

type Section = 'General' | 'Appearance' | 'Shortcuts' | 'Plugins' | 'History' | 'Advanced';

interface NavItem { label: Section | 'About'; icon: string; isAbout?: boolean }

const NAV: NavItem[] = [
  { label: 'General',    icon: 'cog' },
  { label: 'Appearance', icon: 'palette' },
  { label: 'Shortcuts',  icon: 'key' },
  { label: 'Plugins',    icon: 'cube' },
  { label: 'History',    icon: 'history' },
  { label: 'Advanced',   icon: 'code-bracket' },
  { label: 'About',      icon: 'information-circle', isAbout: true },
];

const ACCENT_COLORS: { value: AccentColor; label: string }[] = [
  { value: '#7a2436', label: 'Maroon'  },
  { value: '#1c4a4f', label: 'Teal'    },
  { value: '#5b3a8a', label: 'Purple'  },
  { value: '#8a6515', label: 'Gold'    },
  { value: '#2f6b35', label: 'Forest'  },
];

const SHORTCUTS = [
  { section: 'Navigation', rows: [
    { keys: ['⌘', 'K'],  win: ['Ctrl', 'K'],  desc: 'Open search palette' },
    { keys: ['⌘', 'H'],  win: ['Ctrl', 'H'],  desc: 'Go to Home' },
    { keys: ['⌘', ','],  win: ['Ctrl', ','],  desc: 'Open Settings' },
  ]},
  { section: 'Tools', rows: [
    { keys: ['⌘', '1–9'], win: ['Ctrl', '1–9'], desc: 'Jump to recent tool' },
  ]},
  { section: 'Window', rows: [
    { keys: ['⌘', 'W'],  win: ['Alt', 'F4'],  desc: 'Close window' },
    { keys: ['⌘', 'M'],  win: ['Win', '↓'],   desc: 'Minimise window' },
  ]},
];

@Component({
  selector: 'dt-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, TopbarComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['Settings']" />

  <div style="flex:1;overflow:hidden;display:flex;min-height:0">

    <!-- ── Left nav ───────────────────────────────────────────────── -->
    <nav style="width:188px;min-width:188px;padding:16px 10px;border-right:1px solid var(--border);background:var(--surface-muted);display:flex;flex-direction:column;gap:2px;overflow-y:auto">
      @for (item of nav; track item.label) {
        <button
          (click)="handleNav(item)"
          style="display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;border-radius:7px;border:none;cursor:pointer;text-align:left;font-size:13px;font-family:var(--font-ui);transition:background 0.1s"
          [style.background]="item.label === active() ? 'var(--maroon-soft)' : 'transparent'"
          [style.color]="item.label === active() ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="item.label === active() ? '600' : '400'"
        >
          <dt-icon [name]="item.icon" [size]="13" [color]="item.label === active() ? 'var(--maroon)' : 'var(--text-muted)'" />
          {{ item.label }}
        </button>
      }
    </nav>

    <!-- ── Main panel ─────────────────────────────────────────────── -->
    <div style="flex:1;overflow-y:auto;padding:28px 36px 48px">
      <div style="max-width:620px">

        <!-- ════════════ GENERAL ════════════ -->
        @if (active() === 'General') {
          <h2 class="sh">General</h2>

          <!-- On-launch toggles -->
          <div style="display:flex;flex-direction:column;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px">
            <div style="padding:10px 16px 6px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px">On launch</div>
            @for (row of launchToggles; track row.key) {
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border-top:1px solid var(--border)">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text)">{{ row.label }}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px">{{ row.desc }}</div>
                </div>
                <button (click)="toggle(row.key)" style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                  [style.background]="getBool(row.key) ? 'var(--teal)' : 'var(--border)'">
                  <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                    [style.left]="getBool(row.key) ? '19px' : '3px'"></span>
                </button>
              </div>
            }
          </div>

          <!-- Update toggles -->
          <div style="display:flex;flex-direction:column;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
            <div style="padding:10px 16px 6px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px">Updates</div>
            @for (row of updateToggles; track row.key) {
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border-top:1px solid var(--border)">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text)">{{ row.label }}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px">{{ row.desc }}</div>
                </div>
                <button (click)="toggle(row.key)" style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                  [style.background]="getBool(row.key) ? 'var(--teal)' : 'var(--border)'">
                  <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                    [style.left]="getBool(row.key) ? '19px' : '3px'"></span>
                </button>
              </div>
            }
          </div>
        }

        <!-- ════════════ APPEARANCE ════════════ -->
        @if (active() === 'Appearance') {
          <h2 style="margin:0 0 20px;font-size:17px;font-weight:650;color:var(--text);letter-spacing:-0.02em">Appearance</h2>

          <!-- Theme -->
          <div style="margin-bottom:24px">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Theme</label>
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

          <!-- Accent color -->
          <div style="margin-bottom:28px">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Accent colour</label>
            <div style="display:flex;gap:12px;align-items:center">
              @for (ac of accentColors; track ac.value) {
                <button (click)="setAccent(ac.value)" [title]="ac.label"
                  style="width:30px;height:30px;border-radius:50%;cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;position:relative;display:flex;align-items:center;justify-content:center"
                  [style.background]="ac.value"
                  [style.border]="settings().accent === ac.value ? '2.5px solid var(--text)' : '2px solid transparent'"
                  [style.box-shadow]="settings().accent === ac.value ? '0 0 0 2px ' + ac.value : 'none'"
                  [style.transform]="settings().accent === ac.value ? 'scale(1.15)' : 'scale(1)'">
                  @if (settings().accent === ac.value) {
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  }
                </button>
              }
              <span style="font-size:12px;color:var(--text-muted);margin-left:4px">{{ accentLabel() }}</span>
            </div>
          </div>

          <!-- Fonts (read-only) -->
          <div style="margin-bottom:24px">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Fonts</label>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden">
              <div style="display:flex;align-items:center;padding:12px 16px;gap:12px">
                <span style="font-size:13px;color:var(--text-muted);min-width:100px">UI font</span>
                <span style="font-size:13px;color:var(--text)">System default</span>
              </div>
              <div style="display:flex;align-items:center;padding:12px 16px;gap:12px;border-top:1px solid var(--border)">
                <span style="font-size:13px;color:var(--text-muted);min-width:100px">Code font</span>
                <span style="font-size:13px;color:var(--text);font-family:var(--font-mono)">JetBrains Mono</span>
              </div>
            </div>
          </div>
        }

        <!-- ════════════ SHORTCUTS ════════════ -->
        @if (active() === 'Shortcuts') {
          <h2 style="margin:0 0 20px;font-size:17px;font-weight:650;color:var(--text);letter-spacing:-0.02em">Keyboard shortcuts</h2>

          <div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:9px;padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:8px">
            <dt-icon name="information-circle" [size]="14" color="var(--text-muted)" />
            <span style="font-size:12.5px;color:var(--text-muted)">
              Shortcuts use <strong style="font-family:var(--font-mono)">⌘</strong> on macOS and <strong style="font-family:var(--font-mono)">Ctrl</strong> on Windows/Linux.
            </span>
          </div>

          @for (group of shortcutGroups; track group.section) {
            <div style="margin-bottom:20px">
              <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;padding:0 2px">{{ group.section }}</div>
              <div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden">
                @for (row of group.rows; track row.desc; let first = $first) {
                  <div style="display:flex;align-items:center;padding:11px 16px;gap:16px"
                    [style.border-top]="first ? 'none' : '1px solid var(--border)'">
                    <div style="flex:1;font-size:13px;color:var(--text)">{{ row.desc }}</div>
                    <div style="display:flex;gap:4px;align-items:center">
                      @for (k of row.keys; track k; let last = $last) {
                        <kbd style="padding:2px 7px;border-radius:5px;background:var(--surface-muted);border:1px solid var(--border);font-size:11.5px;font-family:var(--font-mono);color:var(--text)">{{ k }}</kbd>
                        @if (!last) { <span style="font-size:10px;color:var(--text-faint)">+</span> }
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- ════════════ PLUGINS ════════════ -->
        @if (active() === 'Plugins') {
          <h2 style="margin:0 0 20px;font-size:17px;font-weight:650;color:var(--text);letter-spacing:-0.02em">Plugins</h2>

          <div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:9px;padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:8px">
            <dt-icon name="information-circle" [size]="14" color="var(--text-muted)" />
            <span style="font-size:12.5px;color:var(--text-muted)">Plugin support is planned for a future release. All current tools are built-in.</span>
          </div>

          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Built-in capabilities</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden">
            @for (cap of builtinCaps; track cap.name; let first = $first) {
              <div style="display:flex;align-items:center;gap:12px;padding:11px 16px"
                [style.border-top]="first ? 'none' : '1px solid var(--border)'">
                <div style="width:28px;height:28px;border-radius:7px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
                  <dt-icon [name]="cap.icon" [size]="13" color="var(--maroon)" />
                </div>
                <div>
                  <div style="font-size:13px;font-weight:500;color:var(--text)">{{ cap.name }}</div>
                  <div style="font-size:11.5px;color:var(--text-muted);margin-top:1px">{{ cap.desc }}</div>
                </div>
                <div style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(28,74,79,0.1);color:var(--teal);font-weight:600">Built-in</div>
              </div>
            }
          </div>
        }

        <!-- ════════════ HISTORY ════════════ -->
        @if (active() === 'History') {
          <h2 style="margin:0 0 20px;font-size:17px;font-weight:650;color:var(--text);letter-spacing:-0.02em">History</h2>

          <!-- Track history toggle -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Track tool history</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Show recently used tools in the sidebar</div>
              </div>
              <button (click)="toggle('trackHistory')" style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                [style.background]="settings().trackHistory ? 'var(--teal)' : 'var(--border)'">
                <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                  [style.left]="settings().trackHistory ? '19px' : '3px'"></span>
              </button>
            </div>
          </div>

          <!-- Max items -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px">
            <div style="padding:14px 16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Max recent items</div>
                <span style="font-size:13px;font-weight:600;color:var(--maroon)">{{ settings().maxHistory }}</span>
              </div>
              <input type="range" [(ngModel)]="maxHistoryProxy" (ngModelChange)="setMaxHistory($event)"
                min="5" max="50" step="5"
                style="width:100%;accent-color:var(--maroon)" />
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-faint);margin-top:4px">
                <span>5</span><span>50</span>
              </div>
            </div>
          </div>

          <!-- Danger zone -->
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Danger zone</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Clear recent history</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Remove all recently visited tools from the sidebar</div>
              </div>
              <button (click)="clearHistory()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b;transition:background 0.1s">
                Clear
              </button>
            </div>
          </div>

          @if (historyCleared()) {
            <div style="margin-top:12px;padding:10px 14px;background:rgba(28,74,79,0.1);border:1px solid rgba(28,74,79,0.25);border-radius:8px;font-size:12.5px;color:var(--teal);display:flex;align-items:center;gap:6px">
              <dt-icon name="check-circle" [size]="14" color="var(--teal)" /> History cleared.
            </div>
          }
        }

        <!-- ════════════ ADVANCED ════════════ -->
        @if (active() === 'Advanced') {
          <h2 style="margin:0 0 20px;font-size:17px;font-weight:650;color:var(--text);letter-spacing:-0.02em">Advanced</h2>

          <!-- Export / Import -->
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Settings file</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Export settings</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Download your settings as a JSON file</div>
              </div>
              <button (click)="exportSettings()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid var(--border);background:var(--surface-muted);color:var(--text)">
                Export
              </button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border-top:1px solid var(--border)">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Import settings</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Restore from a previously exported file</div>
              </div>
              <button (click)="importSettings()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid var(--border);background:var(--surface-muted);color:var(--text)">
                Import…
              </button>
            </div>
          </div>

          <!-- Danger zone -->
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Danger zone</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Reset settings</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Restore all settings to their factory defaults</div>
              </div>
              <button (click)="confirmReset()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b">
                {{ resetPending() ? 'Confirm reset?' : 'Reset' }}
              </button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border-top:1px solid var(--border)">
              <div>
                <div style="font-size:13.5px;font-weight:500;color:var(--text)">Clear all data</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Erase settings, pinned tools, and history</div>
              </div>
              <button (click)="confirmClearAll()"
                style="padding:6px 14px;border-radius:7px;font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer;border:1px solid rgba(180,30,30,.35);background:rgba(180,30,30,.07);color:#c0392b">
                {{ clearAllPending() ? 'Confirm clear?' : 'Clear all' }}
              </button>
            </div>
          </div>

          @if (importError()) {
            <div style="padding:10px 14px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:8px;font-size:12.5px;color:#c0392b">
              Import failed: {{ importError() }}
            </div>
          }
          @if (importOk()) {
            <div style="padding:10px 14px;background:rgba(28,74,79,0.1);border:1px solid rgba(28,74,79,0.25);border-radius:8px;font-size:12.5px;color:var(--teal);display:flex;align-items:center;gap:6px">
              <dt-icon name="check-circle" [size]="14" color="var(--teal)" /> Settings imported successfully.
            </div>
          }
        }

      </div>
    </div>
  </div>
</div>
`,
})
export class SettingsComponent {
  private router = inject(Router);
  private svc   = inject(SettingsService);
  private pinned = inject(PinnedService);

  readonly nav          = NAV;
  readonly accentColors = ACCENT_COLORS;
  readonly shortcutGroups = SHORTCUTS;

  readonly themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light',  label: 'Light',  icon: 'eye' },
    { value: 'dark',   label: 'Dark',   icon: 'eye-slash' },
    { value: 'system', label: 'System', icon: 'cog' },
  ];

  readonly launchToggles: { key: any; label: string; desc: string }[] = [
    { key: 'openLastTool',     label: 'Open last used tool',   desc: 'Resume where you left off' },
    { key: 'showReleaseNotes', label: 'Show release notes',    desc: 'Display what\'s new after an update' },
    { key: 'startWithSystem',  label: 'Start with system',     desc: 'Launch DevToolbox at login' },
  ];

  readonly updateToggles: { key: any; label: string; desc: string }[] = [
    { key: 'autoCheckUpdates',  label: 'Auto-check for updates', desc: 'Check in the background periodically' },
    { key: 'bgDownloadUpdates', label: 'Background download',    desc: 'Download updates silently' },
    { key: 'includeBeta',       label: 'Include beta releases',  desc: 'Opt in to pre-release builds' },
  ];

  readonly builtinCaps = [
    { name: '42 Developer Tools',    icon: 'braces',          desc: 'JSON, hashing, encoding, image processing and more' },
    { name: 'Offline-first',         icon: 'lock',            desc: 'Everything runs locally — no network required' },
    { name: 'Tauri v2 Backend',      icon: 'cog',             desc: 'Native Rust commands for crypto and image processing' },
    { name: 'Theme engine',          icon: 'palette',         desc: 'Light / dark / system with custom accent colours' },
    { name: 'Command palette',       icon: 'search',          desc: 'Instant fuzzy search across all tools (⌘K)' },
    { name: 'Pin & history',         icon: 'bookmark',        desc: 'Bookmark your most-used tools for quick access' },
  ];

  readonly active       = signal<Section | 'About'>('General');
  readonly settings     = this.svc.settings;
  readonly historyCleared = signal(false);
  readonly resetPending   = signal(false);
  readonly clearAllPending = signal(false);
  readonly importError  = signal('');
  readonly importOk     = signal(false);

  maxHistoryProxy = this.svc.settings().maxHistory;

  /** Type-safe boolean read for toggle rows */
  getBool(key: string): boolean {
    return !!(this.svc.settings() as unknown as Record<string, unknown>)[key];
  }

  accentLabel(): string {
    return ACCENT_COLORS.find(a => a.value === this.settings().accent)?.label ?? '';
  }

  handleNav(item: NavItem): void {
    if (item.isAbout) { this.router.navigate(['/about']); return; }
    this.active.set(item.label as Section);
  }

  setTheme(theme: Theme): void  { this.svc.update({ theme }); }
  setAccent(accent: AccentColor): void { this.svc.update({ accent }); }

  toggle(key: string): void {
    const cur = (this.svc.settings() as any)[key];
    this.svc.update({ [key]: !cur } as any);
  }

  setMaxHistory(v: number): void { this.svc.update({ maxHistory: Number(v) }); }

  clearHistory(): void {
    this.pinned.clearRecent();
    this.historyCleared.set(true);
    setTimeout(() => this.historyCleared.set(false), 2500);
  }

  confirmReset(): void {
    if (this.resetPending()) {
      this.svc.resetToDefaults();
      this.resetPending.set(false);
    } else {
      this.resetPending.set(true);
      setTimeout(() => this.resetPending.set(false), 3000);
    }
  }

  confirmClearAll(): void {
    if (this.clearAllPending()) {
      this.svc.resetToDefaults();
      this.pinned.clearAll();
      this.clearAllPending.set(false);
    } else {
      this.clearAllPending.set(true);
      setTimeout(() => this.clearAllPending.set(false), 3000);
    }
  }

  exportSettings(): void {
    const blob = new Blob([this.svc.exportJson()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'devtoolbox-settings.json'; a.click();
    URL.revokeObjectURL(url);
  }

  importSettings(): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = this.svc.importJson(reader.result as string);
        this.importOk.set(ok);
        this.importError.set(ok ? '' : 'Invalid settings file.');
        setTimeout(() => { this.importOk.set(false); this.importError.set(''); }, 3000);
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
