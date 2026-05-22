import { Component, signal, computed, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { PinnedService } from '../../core/services/pinned.service';
import { CATEGORIES, TOOL_BY_ID } from '../../core/tool-catalog';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

@Component({
  selector: 'dt-home',
  standalone: true,
  imports: [RouterModule, IconComponent, TopbarComponent],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    /* ── Tool row ─────────────────────────────────────────────────────────── */
    .tool-row {
      display: flex;
      align-items: center;
      gap: 0;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      overflow: hidden;
      transition: border-color 0.12s;
    }
    .tool-row:hover {
      border-color: var(--border-strong);
    }

    .tool-row-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      padding: 10px 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-ui);
      min-width: 0;
    }
    .tool-row-btn:hover .tool-row-name {
      color: var(--text);
    }

    .tool-row-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--font-ui);
      transition: color 0.1s;
      flex: 1;
    }

    .tool-row-desc {
      font-size: 11.5px;
      color: var(--text-faint);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--font-ui);
      flex: 2;
    }

    /* Pin toggle button */
    .pin-btn {
      width: 36px;
      height: 100%;
      min-height: 40px;
      flex-shrink: 0;
      border: none;
      border-left: 1px solid var(--border);
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint);
      transition: background 0.1s, color 0.1s, border-color 0.12s;
      padding: 0;
    }
    .pin-btn:hover {
      background: var(--surface-muted);
      color: var(--text-muted);
    }
    .pin-btn.pinned {
      color: var(--maroon);
      background: var(--maroon-soft);
    }
    .pin-btn.pinned:hover {
      background: var(--maroon-soft);
      color: var(--maroon);
    }

    /* Pinned card with unpin */
    .pinned-card {
      display: flex;
      align-items: center;
      gap: 0;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      overflow: hidden;
      transition: border-color 0.12s;
    }
    .pinned-card:hover {
      border-color: var(--border-strong);
    }
    .pinned-card-nav {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      padding: 14px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-ui);
      min-width: 0;
    }
    .unpin-btn {
      width: 34px;
      height: 100%;
      min-height: 56px;
      flex-shrink: 0;
      border: none;
      border-left: 1px solid var(--border);
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint);
      transition: background 0.1s, color 0.1s;
      padding: 0;
    }
    .unpin-btn:hover {
      background: var(--maroon-soft);
      color: var(--maroon);
    }

    /* Category section headers */
    .cat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }
  `],
  template: `
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; background:var(--bg); font-family:var(--font-ui); height:100%;">
      <dt-topbar [crumbs]="['Home']" />
      <div style="flex:1; overflow:auto; padding:28px 36px 40px;">
        <div style="max-width:900px; margin:0 auto;">

          <!-- Greeting -->
          <div style="margin-bottom:28px;">
            <h1 style="margin:0 0 6px; font-size:22px; font-weight:650; color:var(--text); letter-spacing:-0.02em; line-height:1.2; font-family:var(--font-ui);">
              Good {{ greeting() }}, Winner.
            </h1>
            <p style="margin:0; font-size:13.5px; color:var(--text-muted); font-family:var(--font-ui);">
              {{ totalTools }} tools across {{ categories.length }} categories &middot; everything runs offline.
            </p>
          </div>

          <!-- ── Pinned section ─────────────────────────────────────────────── -->
          @if (pinnedTools().length > 0) {
            <section style="margin-bottom:32px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <dt-icon name="pin-solid" [size]="13" [color]="'var(--maroon)'" />
                <span style="font-size:11px; font-weight:600; color:var(--text-faint); letter-spacing:0.7px; text-transform:uppercase; font-family:var(--font-ui);">Pinned</span>
                <span style="font-size:11px; color:var(--text-faint); font-family:var(--font-ui); margin-left:auto;">{{ pinnedTools().length }} / 10</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
                @for (tool of pinnedTools(); track tool.id) {
                  <div class="pinned-card">
                    <button class="pinned-card-nav" (click)="navigateTo(tool.route)">
                      <div style="width:30px; height:30px; border-radius:8px; background:var(--maroon-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <dt-icon [name]="tool.icon" [size]="14" [color]="'var(--maroon)'" />
                      </div>
                      <div style="min-width:0; flex:1;">
                        <div style="font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:var(--font-ui);">{{ tool.name }}</div>
                        <div style="font-size:11.5px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; font-family:var(--font-ui);">{{ tool.desc }}</div>
                      </div>
                    </button>
                    <button class="unpin-btn" (click)="unpinTool(tool.id)" title="Unpin">
                      <dt-icon name="pin-solid" [size]="13" />
                    </button>
                  </div>
                }
              </div>
            </section>
          }

          <!-- ── All Tools ──────────────────────────────────────────────────── -->
          @for (cat of categories; track cat.id) {
            <section style="margin-bottom:28px;">

              <!-- Category header -->
              <div class="cat-header">
                <div style="width:26px; height:26px; border-radius:7px; background:var(--teal-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <dt-icon [name]="cat.icon" [size]="13" [color]="'var(--teal-ink)'" />
                </div>
                <span style="font-size:14px; font-weight:650; color:var(--text); font-family:var(--font-ui);">{{ cat.name }}</span>
                <span style="font-size:12px; color:var(--text-faint); font-family:var(--font-ui);">{{ cat.tools.length }} tools</span>
              </div>

              <!-- Tool rows -->
              <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px;">
                @for (tool of cat.tools; track tool.id) {
                  <div class="tool-row">
                    <button class="tool-row-btn" (click)="navigateTo(tool.route)">
                      <div style="width:28px; height:28px; border-radius:7px; background:var(--surface-muted); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <dt-icon [name]="tool.icon" [size]="13" [color]="'var(--text-muted)'" />
                      </div>
                      <div style="min-width:0; flex:1;">
                        <div class="tool-row-name">{{ tool.name }}</div>
                        <div class="tool-row-desc">{{ tool.desc }}</div>
                      </div>
                    </button>
                    <button
                      class="pin-btn"
                      [class.pinned]="isPinned(tool.id)"
                      (click)="togglePin(tool.id)"
                      [title]="isPinned(tool.id) ? 'Unpin' : 'Pin to sidebar'"
                    >
                      <dt-icon
                        [name]="isPinned(tool.id) ? 'pin-solid' : 'pin'"
                        [size]="13"
                      />
                    </button>
                  </div>
                }
              </div>

            </section>
          }

        </div>
      </div>
    </div>
  `,
})
export class HomeComponent {
  private router = inject(Router);
  private pinnedService = inject(PinnedService);

  readonly categories = CATEGORIES;
  readonly totalTools = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  });

  readonly pinnedTools = computed(() =>
    this.pinnedService.pinned()
      .map(id => TOOL_BY_ID[id])
      .filter(Boolean)
  );

  isPinned(id: string): boolean {
    return this.pinnedService.pinned().includes(id);
  }

  togglePin(id: string): void {
    this.pinnedService.togglePin(id);
  }

  unpinTool(id: string): void {
    this.pinnedService.unpin(id);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
