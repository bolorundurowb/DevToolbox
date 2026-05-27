import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { open } from '@tauri-apps/plugin-shell';
import { getVersion } from '@tauri-apps/api/app';
import { IconComponent } from '../../core/icon.component';
import { SettingsService } from '../../core/services/settings.service';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ALL_TOOLS } from '../../core/tool-catalog';
import { SETTINGS_NAV } from '../../shared/nav';

const GITHUB_REPO = 'bolorundurowb/dev-core-tools';

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error';

@Component({
  selector: 'dt-about',
  imports: [IconComponent, TopbarComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['Settings', 'About']" />

  <div style="flex:1;overflow:hidden;display:flex;min-height:0">

    <!-- ── Left nav ─────────────────────────────────────────────────── -->
    <nav style="width:200px;min-width:200px;padding:20px 12px;border-right:1px solid var(--border);background:var(--surface-muted);display:flex;flex-direction:column;gap:2px;overflow-y:auto">
      @for (item of nav; track item.label) {
        <button (click)="handleNav(item.label)"
          style="display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;border-radius:7px;border:none;cursor:pointer;text-align:left;font-size:13px;font-family:var(--font-ui);transition:background 0.1s"
          [style.background]="item.label === 'About' ? 'var(--maroon-soft)' : 'transparent'"
          [style.color]="item.label === 'About' ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="item.label === 'About' ? '600' : '400'">
          <dt-icon [name]="item.icon" [size]="13" [color]="item.label === 'About' ? 'var(--maroon)' : 'var(--text-muted)'" />
          {{ item.label }}
        </button>
      }
    </nav>

    <!-- ── About content ─────────────────────────────────────────────── -->
    <div style="flex:1;overflow-y:auto;padding:28px 36px 40px">
      <div style="max-width:640px">

        <!-- App identity -->
        <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:32px">
          <div style="width:88px;height:88px;border-radius:20px;background:linear-gradient(135deg,var(--maroon) 0%,var(--teal) 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,0.15)">
            <span style="color:#fff;font-size:40px;font-weight:700;line-height:1;font-family:var(--font-ui)">D</span>
          </div>
          <div style="padding-top:8px">
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:var(--text);letter-spacing:-0.02em;font-family:var(--font-ui)">Dev Core Tools</h1>
            <p style="margin:0 0 10px;font-size:13.5px;color:var(--text-muted);font-family:var(--font-ui)">{{ toolCount }} developer utilities, all offline.</p>
            <div style="font-size:12px;color:var(--text-faint);font-family:var(--font-mono);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px 10px;display:inline-block">
              {{ appVersion() }} &middot; {{ platform }} &middot; {{ arch }}
            </div>
          </div>
        </div>

        <!-- ══ UPDATE CARD ══ -->
        @if (updateStatus() === 'update-available') {
          <!-- Update available -->
          <div style="padding:18px 20px;border-radius:12px;background:var(--maroon-soft);border:1px solid rgba(var(--maroon-rgb,139,0,0),0.25);margin-bottom:28px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
                  <dt-icon name="alert-circle" [size]="14" color="var(--maroon)" />
                  <span style="font-size:13.5px;font-weight:650;color:var(--maroon-ink);font-family:var(--font-ui)">
                    {{ latestVersion() }} is available
                  </span>
                </div>
                <p style="margin:0;font-size:12.5px;color:var(--text-muted);font-family:var(--font-ui);line-height:1.5">
                  You are on {{ appVersion() }}.
                  @if (latestReleaseDate()) {
                    Released {{ latestReleaseDate() }}.
                  }
                </p>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;flex-shrink:0">
                <button (click)="openRelease()"
                  style="padding:7px 16px;border-radius:7px;background:var(--maroon);color:#fff;font-size:12.5px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;font-family:var(--font-ui);display:inline-flex;align-items:center;justify-content:center;gap:6px">
                  <dt-icon name="link" [size]="12" color="#fff" />
                  View release
                </button>
                <button (click)="resetUpdate()"
                  style="padding:5px 16px;border-radius:7px;background:transparent;color:var(--text-muted);font-size:11.5px;border:1px solid var(--border);cursor:pointer;font-family:var(--font-ui)">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        } @else {
          <!-- Idle / Checking / Up-to-date / Error -->
          <div style="padding:18px 20px;border-radius:12px;background:var(--teal-soft);border:1px solid rgba(28,74,79,0.3);margin-bottom:28px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
                  @if (updateStatus() === 'up-to-date') {
                    <dt-icon name="check-circle" [size]="14" color="var(--teal)" />
                    <span style="font-size:13.5px;font-weight:650;color:var(--teal);font-family:var(--font-ui)">
                      You're up to date &middot; {{ appVersion() }}
                    </span>
                  } @else {
                    <dt-icon name="arrow-path" [size]="14" color="var(--teal)" />
                    <span style="font-size:13.5px;font-weight:650;color:var(--teal);font-family:var(--font-ui)">
                      Current version &middot; {{ appVersion() }}
                    </span>
                  }
                </div>
                @if (updateStatus() === 'error') {
                  <p style="margin:0;font-size:12.5px;color:#c0392b;font-family:var(--font-ui);line-height:1.5">
                    {{ updateErrorMsg() }}
                  </p>
                } @else if (updateStatus() === 'up-to-date') {
                  <p style="margin:0;font-size:12.5px;color:var(--text-muted);font-family:var(--font-ui)">
                    No newer releases found on GitHub.
                  </p>
                } @else {
                  <p style="margin:0;font-size:12.5px;color:var(--text-muted);font-family:var(--font-ui)">
                    Click "Check for updates" to query GitHub for a newer release.
                  </p>
                }
              </div>
              <button (click)="checkForUpdates()" [disabled]="updateStatus() === 'checking'"
                [style.opacity]="updateStatus() === 'checking' ? '0.55' : '1'"
                style="padding:7px 14px;border-radius:7px;background:var(--surface);color:var(--text);font-size:12.5px;font-weight:600;border:1px solid var(--border);cursor:pointer;font-family:var(--font-ui);white-space:nowrap;flex-shrink:0">
                {{ updateStatus() === 'checking' ? 'Checking…' : 'Check for updates' }}
              </button>
            </div>
          </div>
        }

        <!-- Update preferences -->
        <div style="margin-bottom:28px">
          <h2 style="margin:0 0 14px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Update preferences</h2>
          <div style="display:flex;flex-direction:column;gap:14px">
            @for (pref of updatePrefs; track pref.key) {
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text);font-family:var(--font-ui)">{{ pref.label }}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;font-family:var(--font-ui)">{{ pref.desc }}</div>
                </div>
                <button (click)="togglePref(pref.key)"
                  style="width:38px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s"
                  [style.background]="getPref(pref.key) ? 'var(--teal)' : 'var(--surface-muted)'">
                  <span style="position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"
                    [style.left]="getPref(pref.key) ? '19px' : '3px'"></span>
                </button>
              </div>
            }
          </div>
        </div>

        <div style="height:1px;background:var(--border);margin-bottom:24px"></div>

        <!-- Credits -->
        <div style="margin-bottom:24px">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:650;color:var(--text);font-family:var(--font-ui)">Credits</h2>
          <div style="display:flex;flex-direction:column;gap:8px">
            @for (c of credits; track c.label) {
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:13px;color:var(--text-muted);font-family:var(--font-ui)">{{ c.label }}</span>
                <span style="font-size:12px;color:var(--text-faint);font-family:var(--font-mono)">{{ c.value }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="font-size:11.5px;color:var(--text-faint);font-family:var(--font-mono);padding:14px 16px;border-radius:8px;background:var(--surface);border:1px solid var(--border)">
          Released under the MIT Licence &middot; &copy; 2026 Dev Core Tools contributors
        </div>

      </div>
    </div>
  </div>
</div>
`
})
export class AboutComponent implements OnInit {
  private router = inject(Router);
  private svc    = inject(SettingsService);

  readonly toolCount   = ALL_TOOLS.length;
  readonly appVersion  = signal('…');
  readonly nav         = SETTINGS_NAV;

  readonly updateStatus      = signal<UpdateStatus>('idle');
  readonly latestVersion     = signal('');
  readonly latestReleaseUrl  = signal('');
  readonly latestReleaseDate = signal('');
  readonly updateErrorMsg    = signal('');

  readonly platform = navigator.platform.startsWith('Win') ? 'Windows'
                    : navigator.platform.startsWith('Mac') ? 'macOS'
                    : 'Linux';
  readonly arch     = navigator.platform.includes('arm') || navigator.platform.includes('M1') ? 'Apple Silicon' : 'x64';

  readonly updatePrefs = [
    { key: 'includeBeta' as const, label: 'Include beta releases', desc: 'Opt in to pre-release builds' },
  ];

  readonly credits = [
    { label: 'Framework', value: 'Angular 21.2' },
    { label: 'Desktop',   value: 'Tauri v2'      },
    { label: 'Icons',     value: 'Custom SVG set' },
    { label: 'Build',     value: 'Vite + esbuild' },
  ];

  /** Raw version string without leading 'v', used for comparison. */
  private _rawVersion = '';

  async ngOnInit(): Promise<void> {
    try {
      const v = await getVersion();
      this._rawVersion = v;
      this.appVersion.set(`v${v}`);
    } catch {
      this.appVersion.set('v—');
    }
  }

  handleNav(label: string): void {
    if (label !== 'About') this.router.navigate(['/settings']);
  }

  getPref(key: 'includeBeta'): boolean {
    return this.svc.settings()[key];
  }

  togglePref(key: 'includeBeta'): void {
    this.svc.update({ [key]: !this.svc.settings()[key] } as any);
  }

  async checkForUpdates(): Promise<void> {
    if (this.updateStatus() === 'checking') return;

    this.updateStatus.set('checking');
    this.updateErrorMsg.set('');
    this.latestVersion.set('');
    this.latestReleaseUrl.set('');
    this.latestReleaseDate.set('');

    try {
      const includeBeta = this.svc.settings().includeBeta;
      const apiUrl = includeBeta
        ? `https://api.github.com/repos/${GITHUB_REPO}/releases`
        : `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

      const res = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!res.ok) {
        throw new Error(`GitHub returned ${res.status}. Check your connection and try again.`);
      }

      const data = await res.json();

      // /releases returns an array; /releases/latest returns a single object
      const release = Array.isArray(data) ? data[0] : data;
      if (!release?.tag_name) {
        throw new Error('No releases found on GitHub for this project.');
      }

      const tagVersion = release.tag_name.replace(/^v/i, '');
      const isNewer = this.compareVersions(tagVersion, this._rawVersion) > 0;

      if (isNewer) {
        this.latestVersion.set(`v${tagVersion}`);
        this.latestReleaseUrl.set(release.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`);
        this.latestReleaseDate.set(release.published_at ? this.formatDate(release.published_at) : '');
        this.updateStatus.set('update-available');
      } else {
        this.updateStatus.set('up-to-date');
      }
    } catch (err: any) {
      this.updateErrorMsg.set(err instanceof Error ? err.message : 'Could not reach GitHub. Check your connection.');
      this.updateStatus.set('error');
    }
  }

  async openRelease(): Promise<void> {
    const url = this.latestReleaseUrl();
    if (url) {
      try { await open(url); } catch { /* best effort */ }
    }
  }

  resetUpdate(): void {
    this.updateStatus.set('idle');
    this.latestVersion.set('');
    this.latestReleaseUrl.set('');
    this.latestReleaseDate.set('');
    this.updateErrorMsg.set('');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns >0 if a is newer than b, 0 if equal, <0 if older. */
  private compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
    const [aMaj = 0, aMin = 0, aPat = 0] = parse(a);
    const [bMaj = 0, bMin = 0, bPat = 0] = parse(b);
    if (aMaj !== bMaj) return aMaj - bMaj;
    if (aMin !== bMin) return aMin - bMin;
    return aPat - bPat;
  }

  private formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return '';
    }
  }
}
