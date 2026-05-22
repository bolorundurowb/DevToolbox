import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { HistoryService, toolById } from '../../core/services/history.service';

@Component({
  selector: 'dt-history',
  standalone: true,
  imports: [IconComponent, TopbarComponent],
  styles: [`
    :host { display:flex; flex-direction:column; flex:1; min-height:0; }

    .entry-row {
      display: flex;
      align-items: center;
      gap: 0;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      overflow: hidden;
      transition: border-color 0.12s;
    }
    .entry-row:hover { border-color: var(--border-strong); }

    .entry-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      padding: 10px 14px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-ui);
      min-width: 0;
    }

    .entry-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--font-ui);
    }
    .entry-cat {
      font-size: 11.5px;
      color: var(--text-faint);
      white-space: nowrap;
      font-family: var(--font-ui);
    }
    .entry-time {
      font-size: 11.5px;
      color: var(--text-faint);
      font-family: var(--font-mono);
      margin-left: auto;
      flex-shrink: 0;
      padding-right: 10px;
    }

    .del-btn {
      width: 36px;
      flex-shrink: 0;
      align-self: stretch;
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
    .del-btn:hover {
      background: rgba(185,28,28,0.07);
      color: #b91c1c;
    }
  `],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['History']" />

  <div style="flex:1;overflow-y:auto;padding:28px 36px 40px">
    <div style="max-width:720px;margin:0 auto">

      <!-- Header row -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <h1 style="margin:0 0 3px;font-size:18px;font-weight:650;color:var(--text);letter-spacing:-0.02em;font-family:var(--font-ui)">History</h1>
          <p style="margin:0;font-size:12.5px;color:var(--text-muted);font-family:var(--font-ui)">
            {{ historySvc.entries().length }} visit{{ historySvc.entries().length === 1 ? '' : 's' }} recorded
          </p>
        </div>
        @if (historySvc.entries().length > 0) {
          @if (!confirmClear()) {
            <button
              (click)="confirmClear.set(true)"
              style="padding:6px 14px;border-radius:7px;background:transparent;border:1px solid var(--border);font-size:12.5px;font-weight:500;color:var(--text-muted);cursor:pointer;font-family:var(--font-ui);display:flex;align-items:center;gap:6px"
            >
              <dt-icon name="trash" [size]="13" />
              Clear all
            </button>
          } @else {
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-ui)">Clear all history?</span>
              <button (click)="doClear()"
                style="padding:5px 12px;border-radius:6px;background:#b91c1c;color:#fff;font-size:12.5px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-ui)">
                Clear
              </button>
              <button (click)="confirmClear.set(false)"
                style="padding:5px 12px;border-radius:6px;background:var(--surface);color:var(--text-muted);font-size:12.5px;border:1px solid var(--border);cursor:pointer;font-family:var(--font-ui)">
                Cancel
              </button>
            </div>
          }
        }
      </div>

      <!-- Empty state -->
      @if (historySvc.entries().length === 0) {
        <div style="text-align:center;padding:64px 0">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--surface-muted);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <dt-icon name="history" [size]="22" [color]="'var(--text-faint)'" />
          </div>
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:var(--text);font-family:var(--font-ui)">No history yet</p>
          <p style="margin:0;font-size:13px;color:var(--text-muted);font-family:var(--font-ui)">Open any tool and it'll appear here.</p>
        </div>
      }

      <!-- Grouped entries -->
      @for (group of historySvc.grouped(); track group.date) {
        <div style="margin-bottom:24px">

          <!-- Date header -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:11px;font-weight:600;color:var(--text-faint);letter-spacing:0.6px;text-transform:uppercase;font-family:var(--font-ui)">
              {{ group.date }}
            </span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span style="font-size:11px;color:var(--text-faint);font-family:var(--font-ui)">{{ group.items.length }}</span>
          </div>

          <!-- Entries -->
          <div style="display:flex;flex-direction:column;gap:5px">
            @for (entry of group.items; track entry.visitedAt) {
              @let tool = resolve(entry.toolId);
              @if (tool) {
                <div class="entry-row">
                  <button class="entry-nav" (click)="navigateTo(tool.route)">
                    <div style="width:28px;height:28px;border-radius:7px;background:var(--maroon-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      <dt-icon [name]="tool.icon" [size]="13" [color]="'var(--maroon)'" />
                    </div>
                    <div style="min-width:0;flex:1">
                      <div class="entry-name">{{ tool.name }}</div>
                      <div class="entry-cat">{{ tool.catName }}</div>
                    </div>
                    <span class="entry-time">{{ formatTime(entry.visitedAt) }}</span>
                  </button>
                  <button class="del-btn" (click)="deleteEntry(entry.visitedAt)" title="Remove from history">
                    <dt-icon name="x" [size]="12" />
                  </button>
                </div>
              }
            }
          </div>

        </div>
      }

    </div>
  </div>
</div>
  `,
})
export class HistoryComponent {
  private router    = inject(Router);
  readonly historySvc = inject(HistoryService);

  confirmClear = signal(false);

  resolve(toolId: string) {
    return toolById(toolId);
  }

  formatTime(ms: number): string {
    return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  deleteEntry(visitedAt: number): void {
    const idx = this.historySvc.entries().findIndex(e => e.visitedAt === visitedAt);
    if (idx !== -1) this.historySvc.clearEntry(idx);
  }

  doClear(): void {
    this.historySvc.clearAll();
    this.confirmClear.set(false);
  }
}
