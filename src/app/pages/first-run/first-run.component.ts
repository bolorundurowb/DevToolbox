import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { IconComponent } from '../../core/icon.component';
import { SettingsService } from '../../core/services/settings.service';
import { ALL_TOOLS } from '../../core/tool-catalog';

interface SystemInfo {
  os: string;
  arch: string;
}

function formatOs(os: string): string {
  const normalised = os.toLowerCase();
  if (normalised === 'windows') return 'Windows';
  if (normalised === 'macos' || normalised === 'darwin') return 'macOS';
  if (normalised === 'linux') return 'Linux';
  if (normalised === 'ios') return 'iOS';
  if (normalised === 'android') return 'Android';
  return os || 'Unknown OS';
}

function formatArch(arch: string): string {
  const normalised = arch.toLowerCase();
  if (['x86_64', 'amd64'].includes(normalised)) return 'x64';
  if (['aarch64', 'arm64'].includes(normalised)) return 'ARM64';
  if (normalised === 'x86') return 'x86';
  return arch || 'Unknown CPU';
}

@Component({
  selector: 'dt-first-run',
  imports: [FormsModule, IconComponent],
  template: `
    <div
      style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      font-family: var(--font-ui);
      padding: 40px 24px;
      box-sizing: border-box;
    "
    >
      <div style="max-width: 480px; width: 100%; text-align: center;">
        <!-- Logo -->
        <div
          style="
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--maroon) 0%, var(--teal) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        "
        >
          <span
            style="color:#fff; font-size:32px; font-weight:700; line-height:1; font-family:var(--font-ui);"
            >D</span
          >
        </div>

        <!-- Title -->
        <h1
          style="margin:0 0 10px; font-size:26px; font-weight:680; color:var(--text); letter-spacing:-0.03em; font-family:var(--font-ui);"
        >
          Welcome to Dev Core Tools
        </h1>

        <!-- Subtitle -->
        <p
          style="margin:0 0 22px; font-size:14px; color:var(--text-muted); line-height:1.6; font-family:var(--font-ui);"
        >
          {{ ALL_TOOLS.length }}+ developer utilities in one app — JSON, encoding, hashing, images,
          and more. Everything runs locally, no internet required.
        </p>

        <div style="text-align:left; margin:0 0 28px;">
          <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px; font-family:var(--font-ui);">
            What should we call you?
          </label>
          <input
            [(ngModel)]="displayName"
            [placeholder]="placeholderName"
            maxlength="60"
            style="
              width:100%;
              box-sizing:border-box;
              border:1px solid var(--border);
              border-radius:9px;
              background:var(--surface);
              color:var(--text);
              font-size:14px;
              padding:10px 12px;
              outline:none;
              font-family:var(--font-ui);
            "
          />
          <div style="font-size:11.5px; color:var(--text-faint); margin-top:6px; font-family:var(--font-ui);">
            Leave it blank and we will use a friendly fallback.
          </div>
        </div>

        <!-- Feature cards -->
        <div
          style="display:flex; flex-direction:column; gap:10px; margin-bottom:32px; text-align:left;"
        >
          <div
            style="
            display:flex; align-items:center; gap:14px;
            padding:14px 16px;
            border-radius:10px;
            background:var(--surface);
            border:1px solid var(--border);
          "
          >
            <div
              style="
              width:36px; height:36px; border-radius:8px;
              background:var(--maroon-soft);
              display:flex; align-items:center; justify-content:center;
              flex-shrink:0;
            "
            >
              <dt-icon name="cmdk" [size]="16" [color]="'var(--maroon-ink)'" />
            </div>
            <div>
              <div
                style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);"
              >
                Press ⌘K anywhere
              </div>
              <div
                style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);"
              >
                Fuzzy-search all tools instantly
              </div>
            </div>
          </div>

          <div
            style="
            display:flex; align-items:center; gap:14px;
            padding:14px 16px;
            border-radius:10px;
            background:var(--surface);
            border:1px solid var(--border);
          "
          >
            <div
              style="
              width:36px; height:36px; border-radius:8px;
              background:var(--maroon-soft);
              display:flex; align-items:center; justify-content:center;
              flex-shrink:0;
            "
            >
              <dt-icon name="star" [size]="16" [color]="'var(--maroon-ink)'" />
            </div>
            <div>
              <div
                style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);"
              >
                Pin the ones you use
              </div>
              <div
                style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);"
              >
                Your favourites live in the sidebar for one-click access
              </div>
            </div>
          </div>

        </div>

        <button
          (click)="exploreTools()"
          style="
            display:flex; align-items:center; justify-content:center; gap:8px;
            width:100%; padding:12px 20px;
            border-radius:9px;
            background:var(--teal);
            color:#fff;
            font-size:14px; font-weight:600;
            border:none; cursor:pointer;
            font-family:var(--font-ui);
            transition:opacity 0.15s;
          "
        >
          <dt-icon name="rocket" [size]="15" [color]="'#fff'" />
          Explore tools
        </button>

        <!-- Version footer -->
        <div
          style="margin-top:28px; font-size:11.5px; color:var(--text-faint); font-family:var(--font-mono);"
        >
          v{{ appVersion() }} &middot; {{ platformLabel }}
        </div>
      </div>
    </div>
  `,
})
export class FirstRunComponent implements OnInit {
  private router = inject(Router);
  private settings = inject(SettingsService);

  readonly ALL_TOOLS = ALL_TOOLS;
  displayName = '';
  platformLabel = this.browserPlatformLabel();
  readonly placeholderName = 'Chief';
  readonly appVersion = signal('…');

  async ngOnInit(): Promise<void> {
    this.displayName = this.settings.settings().displayName;
    await Promise.all([
      this.settings.hydrateDisplayNameFromSystem(),
      this.hydrateSystemInfo(),
      this.hydrateVersion(),
    ]);
    if (!this.displayName) this.displayName = this.settings.settings().displayName;
  }

  private async hydrateVersion(): Promise<void> {
    try {
      this.appVersion.set(await getVersion());
    } catch {
      this.appVersion.set('—');
    }
  }

  private async hydrateSystemInfo(): Promise<void> {
    try {
      const info = await invoke<SystemInfo>('get_system_info');
      this.platformLabel = `${formatOs(info.os)} · ${formatArch(info.arch)}`;
    } catch {
      this.platformLabel = this.browserPlatformLabel();
    }
  }

  private browserPlatformLabel(): string {
    const platform = navigator.platform || 'Unknown platform';
    if (platform.startsWith('Win')) return 'Windows';
    if (platform.startsWith('Mac')) return 'macOS';
    if (platform.startsWith('Linux')) return 'Linux';
    return platform;
  }

  exploreTools(): void {
    this.settings.update({ displayName: this.displayName });
    try {
      localStorage.setItem('dev-core-tools-welcomed', '1');
    } catch {
      /* ignore */
    }
    this.router.navigate(['/home']);
  }
}
