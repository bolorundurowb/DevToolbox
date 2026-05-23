import { Component } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

type Platform = 'mac' | 'win' | 'nix';

function detectPlatform(): Platform {
  const platform = navigator.platform ?? '';
  if (platform.startsWith('Win')) return 'win';
  if (platform.startsWith('Mac')) return 'mac';
  return 'nix';
}

@Component({
  selector: 'dt-window-controls',
  styles: [`
    :host {
      display: block;
      height: 38px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
      background: var(--surface-muted);
      -webkit-app-region: drag;
      user-select: none;
    }

    .titlebar {
      height: 100%;
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: max(var(--sidebar-width, 268px), 268px);
      padding: 0 14px;
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .brand-mark {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: linear-gradient(135deg, var(--maroon) 0%, var(--teal) 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      flex-shrink: 0;
    }

    .drag-space {
      flex: 1;
      height: 100%;
      min-width: 0;
    }

    button {
      -webkit-app-region: no-drag;
    }

    .mac-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 0 8px 0 16px;
      flex-shrink: 0;
    }

    .mac-btn {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: filter 0.1s;
    }

    .mac-btn:hover { filter: brightness(0.85); }
    .mac-btn:active { filter: brightness(0.7); }
    .mac-btn .mac-sym {
      opacity: 0;
      font-size: 7px;
      font-weight: 900;
      line-height: 1;
      color: rgba(0,0,0,0.6);
      pointer-events: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%,-50%);
      transition: opacity 0.1s;
    }
    .mac-controls:hover .mac-btn .mac-sym { opacity: 1; }
    .mac-close { background: #ff5f57; }
    .mac-min { background: #febc2e; }
    .mac-max { background: #28c840; }

    .win-controls {
      display: flex;
      align-items: stretch;
      height: 100%;
      flex-shrink: 0;
    }

    .win-btn {
      width: 46px;
      height: 100%;
      border: none;
      cursor: pointer;
      padding: 0;
      background: transparent;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.1s, color 0.1s;
    }

    .win-btn:hover { background: rgba(128,128,128,0.15); color: var(--text); }
    .win-btn.win-close:hover { background: #c42b1c; color: #fff; }
    .win-btn:active { opacity: 0.7; }

    .nix-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 0 12px;
      flex-shrink: 0;
    }

    .nix-btn {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: filter 0.1s;
    }

    .nix-btn:hover { filter: brightness(0.8); }
    .nix-close { background: #ff5f57; }
    .nix-min { background: #febc2e; }
    .nix-max { background: #28c840; }
  `],
  template: `
    <div class="titlebar" data-tauri-drag-region>
      @if (platform === 'mac') {
        <div class="mac-controls">
          <button class="mac-btn mac-close" (click)="closeApp()" title="Close">
            <span class="mac-sym">&#x2715;</span>
          </button>
          <button class="mac-btn mac-min" (click)="minimizeApp()" title="Minimize">
            <span class="mac-sym">&#x2212;</span>
          </button>
          <button class="mac-btn mac-max" (click)="toggleMaximize()" title="Zoom">
            <span class="mac-sym">&#x2B;</span>
          </button>
        </div>
      }

      <div class="brand">
        <span class="brand-mark">D</span>
        <span>Dev Core Tools</span>
      </div>

      <div class="drag-space"></div>

      @if (platform === 'win') {
        <div class="win-controls">
          <button class="win-btn" (click)="minimizeApp()" title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
          <button class="win-btn" (click)="toggleMaximize()" title="Maximize / Restore">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="win-btn win-close" (click)="closeApp()" title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      }

      @if (platform === 'nix') {
        <div class="nix-controls">
          <button class="nix-btn nix-min" (click)="minimizeApp()" title="Minimize"></button>
          <button class="nix-btn nix-max" (click)="toggleMaximize()" title="Maximize"></button>
          <button class="nix-btn nix-close" (click)="closeApp()" title="Close"></button>
        </div>
      }
    </div>
  `,
})
export class WindowControlsComponent {
  readonly platform = detectPlatform();

  async closeApp(): Promise<void> {
    await getCurrentWindow().close();
  }

  async minimizeApp(): Promise<void> {
    await getCurrentWindow().minimize();
  }

  async toggleMaximize(): Promise<void> {
    await getCurrentWindow().toggleMaximize();
  }
}
