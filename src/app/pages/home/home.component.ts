import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { PinnedService } from '../../core/services/pinned.service';
import { CATEGORIES, TOOL_BY_ID } from '../../core/tool-catalog';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

@Component({
  selector: 'dt-home',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, TopbarComponent],
  template: `
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; background:var(--bg); font-family:var(--font-ui); height:100%;">
      <dt-topbar [crumbs]="['Home']" />
      <div style="flex:1; overflow:auto; padding:28px 36px 40px;">
        <div style="max-width:1080px; margin:0 auto;">

          <!-- Greeting -->
          <div style="margin-bottom:32px;">
            <h1 style="margin:0 0 6px; font-size:22px; font-weight:650; color:var(--text); letter-spacing:-0.02em; line-height:1.2; font-family:var(--font-ui);">
              Good {{ greeting() }}, Winner.
            </h1>
            <p style="margin:0; font-size:13.5px; color:var(--text-muted); font-family:var(--font-ui);">
              30 tools across 5 categories &middot; everything runs offline.
            </p>
          </div>

          <!-- Pinned section -->
          @if (pinnedTools().length > 0) {
            <section style="margin-bottom:36px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <dt-icon name="star" [size]="13" [color]="'var(--text-faint)'" />
                <span style="font-size:11px; font-weight:600; color:var(--text-faint); letter-spacing:0.7px; text-transform:uppercase; font-family:var(--font-ui);">Pinned</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                @for (tool of pinnedTools(); track tool.id) {
                  <button
                    (click)="navigateTo(tool.route)"
                    class="dt-pinned-card"
                    style="display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:10px; background:var(--surface); border:1px solid var(--border); cursor:pointer; text-align:left; font-family:var(--font-ui); width:100%; box-sizing:border-box;"
                  >
                    <div style="width:30px; height:30px; border-radius:8px; background:var(--maroon-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <dt-icon [name]="tool.icon" [size]="14" [color]="'var(--maroon-ink)'" />
                    </div>
                    <div style="min-width:0; flex:1;">
                      <div style="font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:var(--font-ui);">{{ tool.name }}</div>
                      <div style="font-size:11.5px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; font-family:var(--font-ui);">{{ tool.desc }}</div>
                    </div>
                  </button>
                }
              </div>
            </section>
          }

          <!-- Categories section -->
          <section>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
              <dt-icon name="layers" [size]="13" [color]="'var(--text-faint)'" />
              <span style="font-size:11px; font-weight:600; color:var(--text-faint); letter-spacing:0.7px; text-transform:uppercase; font-family:var(--font-ui);">Categories</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
              @for (cat of categories; track cat.id) {
                <button
                  (click)="navigateTo(cat.tools[0].route)"
                  class="dt-cat-card"
                  style="display:flex; flex-direction:column; padding:18px 20px; border-radius:12px; background:var(--surface); border:1px solid var(--border); cursor:pointer; text-align:left; font-family:var(--font-ui); width:100%; box-sizing:border-box;"
                >
                  <!-- Category header -->
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:var(--teal-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <dt-icon [name]="cat.icon" [size]="15" [color]="'var(--teal-ink)'" />
                    </div>
                    <div>
                      <div style="font-size:13.5px; font-weight:600; color:var(--text); font-family:var(--font-ui);">{{ cat.name }}</div>
                      <div style="font-size:11.5px; color:var(--text-muted); font-family:var(--font-ui);">{{ cat.tools.length }} tools</div>
                    </div>
                  </div>
                  <!-- Tool list preview (first 5) -->
                  <div style="display:flex; flex-direction:column; gap:5px;">
                    @for (tool of cat.tools.slice(0, 5); track tool.id) {
                      <div style="display:flex; align-items:center; gap:6px;">
                        <dt-icon [name]="tool.icon" [size]="11" [color]="'var(--text-faint)'" />
                        <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-ui);">{{ tool.name }}</span>
                      </div>
                    }
                  </div>
                </button>
              }
            </div>
          </section>

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
    .dt-pinned-card:hover {
      border-color: var(--border-strong) !important;
    }
    .dt-cat-card:hover {
      border-color: var(--border-strong) !important;
    }
  `],
})
export class HomeComponent {
  private router = inject(Router);
  private pinnedService = inject(PinnedService);

  readonly categories = CATEGORIES;

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  });

  readonly pinnedTools = computed(() => {
    return this.pinnedService.pinned()
      .map(id => TOOL_BY_ID[id])
      .filter(Boolean);
  });

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
