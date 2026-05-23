import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';

@Component({
  selector: 'dt-first-run',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      font-family: var(--font-ui);
      padding: 40px 24px;
      box-sizing: border-box;
    ">
      <div style="max-width: 480px; width: 100%; text-align: center;">

        <!-- Logo -->
        <div style="
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--maroon) 0%, var(--teal) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        ">
          <span style="color:#fff; font-size:32px; font-weight:700; line-height:1; font-family:var(--font-ui);">D</span>
        </div>

        <!-- Title -->
        <h1 style="margin:0 0 10px; font-size:26px; font-weight:680; color:var(--text); letter-spacing:-0.03em; font-family:var(--font-ui);">
          Welcome to Dev Core Tools
        </h1>

        <!-- Subtitle -->
        <p style="margin:0 0 32px; font-size:14px; color:var(--text-muted); line-height:1.6; font-family:var(--font-ui);">
          30 developer utilities in one app — JSON, encoding, hashing, images, and more.
          Everything runs locally, no internet required.
        </p>

        <!-- Feature cards -->
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:32px; text-align:left;">

          <div style="
            display:flex; align-items:center; gap:14px;
            padding:14px 16px;
            border-radius:10px;
            background:var(--surface);
            border:1px solid var(--border);
          ">
            <div style="
              width:36px; height:36px; border-radius:8px;
              background:var(--maroon-soft);
              display:flex; align-items:center; justify-content:center;
              flex-shrink:0;
            ">
              <dt-icon name="cmdk" [size]="16" [color]="'var(--maroon-ink)'" />
            </div>
            <div>
              <div style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);">Press ⌘K anywhere</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);">Fuzzy-search all 30 tools instantly</div>
            </div>
          </div>

          <div style="
            display:flex; align-items:center; gap:14px;
            padding:14px 16px;
            border-radius:10px;
            background:var(--surface);
            border:1px solid var(--border);
          ">
            <div style="
              width:36px; height:36px; border-radius:8px;
              background:var(--maroon-soft);
              display:flex; align-items:center; justify-content:center;
              flex-shrink:0;
            ">
              <dt-icon name="star" [size]="16" [color]="'var(--maroon-ink)'" />
            </div>
            <div>
              <div style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);">Pin the ones you use</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);">Your favorites live in the sidebar for one-click access</div>
            </div>
          </div>

          <div style="
            display:flex; align-items:center; gap:14px;
            padding:14px 16px;
            border-radius:10px;
            background:var(--surface);
            border:1px solid var(--border);
          ">
            <div style="
              width:36px; height:36px; border-radius:8px;
              background:var(--teal-soft);
              display:flex; align-items:center; justify-content:center;
              flex-shrink:0;
            ">
              <dt-icon name="plug" [size]="16" [color]="'var(--teal-ink)'" />
            </div>
            <div>
              <div style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);">Extend with plugins</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px; font-family:var(--font-ui);">Add community tools or build your own</div>
            </div>
          </div>

        </div>

        <!-- CTA buttons -->
        <div style="display:flex; flex-direction:column; gap:10px;">
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

          <button
            style="
              display:flex; align-items:center; justify-content:center; gap:8px;
              width:100%; padding:11px 20px;
              border-radius:9px;
              background:transparent;
              color:var(--text-muted);
              font-size:13.5px; font-weight:500;
              border:1px solid var(--border);
              cursor:pointer;
              font-family:var(--font-ui);
              transition:border-color 0.15s, color 0.15s;
            "
          >
            <dt-icon name="download" [size]="14" [color]="'var(--text-faint)'" />
            Import from Postman / VS Code
          </button>
        </div>

        <!-- Version footer -->
        <div style="margin-top:28px; font-size:11.5px; color:var(--text-faint); font-family:var(--font-mono);">
          v1.0.0 &middot; macOS &middot; Apple Silicon
        </div>

      </div>
    </div>
  `,
})
export class FirstRunComponent {
  private router = inject(Router);

  exploreTools(): void {
    try {
      localStorage.setItem('dev-core-tools-welcomed', '1');
    } catch { /* ignore */ }
    this.router.navigate(['/home']);
  }
}
