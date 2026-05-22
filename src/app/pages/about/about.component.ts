import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SettingsService } from '../../core/services/settings.service';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'General',    icon: 'settings',   route: '/settings' },
  { label: 'Appearance', icon: 'palette',    route: '/settings' },
  { label: 'Shortcuts',  icon: 'cmdk',       route: '/settings' },
  { label: 'Plugins',    icon: 'plug',       route: '/settings' },
  { label: 'History',    icon: 'history',    route: '/settings' },
  { label: 'Advanced',   icon: 'sliders',    route: '/settings' },
  { label: 'About',      icon: 'rocket' },
];

@Component({
  selector: 'dt-about',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, TopbarComponent],
  template: `
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; background:var(--bg); font-family:var(--font-ui); height:100%;">
      <dt-topbar [crumbs]="['Settings', 'About']" />

      <div style="flex:1; overflow:auto; display:flex; min-height:0;">

        <!-- Left nav -->
        <nav style="
          width:200px; min-width:200px;
          padding:20px 12px;
          border-right:1px solid var(--border);
          background:var(--surface-muted);
          display:flex; flex-direction:column; gap:2px;
        ">
          @for (item of navItems; track item.label) {
            <button
              (click)="handleNav(item)"
              style="
                display:flex; align-items:center; gap:9px;
                width:100%; padding:7px 10px;
                border-radius:7px;
                border:none; cursor:pointer;
                text-align:left;
                font-size:13px;
                font-family:var(--font-ui);
                transition:background 0.1s;
              "
              [style.background]="item.label === 'About' ? 'var(--maroon-soft)' : 'transparent'"
              [style.color]="item.label === 'About' ? 'var(--maroon-ink)' : 'var(--text)'"
              [style.font-weight]="item.label === 'About' ? 600 : 400"
            >
              <dt-icon
                [name]="item.icon"
                [size]="13"
                [color]="item.label === 'About' ? 'var(--maroon-ink)' : 'var(--text-muted)'"
              />
              {{ item.label }}
            </button>
          }
        </nav>

        <!-- Main content -->
        <div style="flex:1; overflow:auto; padding:28px 36px 40px;">
          <div style="max-width:640px;">

            <!-- App identity -->
            <div style="display:flex; align-items:flex-start; gap:20px; margin-bottom:32px;">
              <div style="
                width:88px; height:88px; border-radius:20px;
                background:linear-gradient(135deg, var(--maroon) 0%, var(--teal) 100%);
                display:flex; align-items:center; justify-content:center;
                flex-shrink:0;
                box-shadow:0 8px 24px rgba(0,0,0,0.15);
              ">
                <span style="color:#fff; font-size:40px; font-weight:700; line-height:1; font-family:var(--font-ui);">D</span>
              </div>
              <div style="padding-top:8px;">
                <h1 style="margin:0 0 4px; font-size:22px; font-weight:700; color:var(--text); letter-spacing:-0.02em; font-family:var(--font-ui);">DevToolbox</h1>
                <p style="margin:0 0 10px; font-size:13.5px; color:var(--text-muted); font-family:var(--font-ui);">30 developer utilities, all offline.</p>
                <div style="
                  font-size:12px;
                  color:var(--text-faint);
                  font-family:var(--font-mono);
                  background:var(--surface);
                  border:1px solid var(--border);
                  border-radius:6px;
                  padding:4px 10px;
                  display:inline-block;
                ">v1.0.0 &middot; macOS &middot; Apple Silicon</div>
              </div>
            </div>

            <!-- Update card -->
            <div style="
              padding:18px 20px;
              border-radius:12px;
              background:var(--teal-soft);
              border:1px solid var(--teal);
              margin-bottom:28px;
            ">
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:7px; margin-bottom:4px;">
                    <dt-icon name="rocket" [size]="14" [color]="'var(--teal-ink)'" />
                    <span style="font-size:13.5px; font-weight:650; color:var(--teal-ink); font-family:var(--font-ui);">Update available &middot; v1.1.0</span>
                  </div>
                  <p style="margin:0; font-size:12.5px; color:var(--teal-ink); opacity:0.8; font-family:var(--font-ui);">
                    New tools, performance improvements, and bug fixes.
                  </p>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                  <button style="
                    padding:7px 14px;
                    border-radius:7px;
                    background:var(--teal);
                    color:#fff;
                    font-size:12.5px;
                    font-weight:600;
                    border:none;
                    cursor:pointer;
                    font-family:var(--font-ui);
                    white-space:nowrap;
                  ">Install &amp; relaunch</button>
                  <button style="
                    padding:6px 14px;
                    border-radius:7px;
                    background:transparent;
                    color:var(--teal-ink);
                    font-size:12px;
                    font-weight:500;
                    border:1px solid var(--teal);
                    cursor:pointer;
                    font-family:var(--font-ui);
                    white-space:nowrap;
                  ">What's new</button>
                </div>
              </div>
            </div>

            <!-- Update preferences -->
            <div style="margin-bottom:28px;">
              <h2 style="margin:0 0 14px; font-size:14px; font-weight:650; color:var(--text); font-family:var(--font-ui);">Update preferences</h2>

              <div style="display:flex; flex-direction:column; gap:14px;">
                @for (pref of updatePrefs; track pref.key) {
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
                    <div>
                      <div style="font-size:13.5px; font-weight:500; color:var(--text); font-family:var(--font-ui);">{{ pref.label }}</div>
                      <div style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);">{{ pref.desc }}</div>
                    </div>
                    <button
                      (click)="togglePref(pref.key)"
                      style="
                        width:38px; height:22px; border-radius:11px;
                        border:none; cursor:pointer;
                        position:relative; flex-shrink:0;
                        transition:background 0.2s;
                      "
                      [style.background]="getPrefValue(pref.key) ? 'var(--teal)' : 'var(--surface-muted)'"
                    >
                      <span style="
                        position:absolute; top:3px;
                        width:16px; height:16px; border-radius:50%;
                        background:#fff;
                        transition:left 0.2s;
                        box-shadow:0 1px 3px rgba(0,0,0,0.2);
                      "
                      [style.left]="getPrefValue(pref.key) ? '19px' : '3px'"
                      ></span>
                    </button>
                  </div>
                }
              </div>
            </div>

            <div style="height:1px; background:var(--border); margin-bottom:24px;"></div>

            <!-- Credits -->
            <div style="margin-bottom:24px;">
              <h2 style="margin:0 0 12px; font-size:14px; font-weight:650; color:var(--text); font-family:var(--font-ui);">Credits</h2>
              <div style="display:flex; flex-direction:column; gap:8px;">
                @for (credit of credits; track credit.label) {
                  <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-size:13px; color:var(--text-muted); font-family:var(--font-ui);">{{ credit.label }}</span>
                    <span style="font-size:12px; color:var(--text-faint); font-family:var(--font-mono);">{{ credit.value }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- MIT footer -->
            <div style="
              font-size:11.5px;
              color:var(--text-faint);
              font-family:var(--font-mono);
              padding:14px 16px;
              border-radius:8px;
              background:var(--surface);
              border:1px solid var(--border);
            ">
              Released under the MIT License &middot; &copy; 2025 DevToolbox contributors
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
  `],
})
export class AboutComponent {
  private router = inject(Router);
  private settingsService = inject(SettingsService);

  readonly navItems = NAV_ITEMS;

  readonly updatePrefs = [
    { key: 'autoCheckUpdates' as const, label: 'Auto-check for updates', desc: 'Check in the background periodically' },
    { key: 'bgDownloadUpdates' as const, label: 'Background download', desc: 'Download updates silently' },
    { key: 'includeBeta' as const, label: 'Include beta releases', desc: 'Opt in to pre-release builds' },
  ];

  readonly credits = [
    { label: 'Framework', value: 'Angular 18' },
    { label: 'Styling', value: 'Tailwind CSS' },
    { label: 'Icons', value: 'Custom SVG set' },
    { label: 'Build', value: 'Vite + esbuild' },
  ];

  handleNav(item: NavItem): void {
    if (item.label !== 'About') {
      this.router.navigate(['/settings']);
    }
  }

  getPrefValue(key: 'autoCheckUpdates' | 'bgDownloadUpdates' | 'includeBeta'): boolean {
    return this.settingsService.settings()[key];
  }

  togglePref(key: 'autoCheckUpdates' | 'bgDownloadUpdates' | 'includeBeta'): void {
    this.settingsService.update({ [key]: !this.settingsService.settings()[key] });
  }
}
