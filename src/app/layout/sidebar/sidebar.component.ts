import { Component, signal, computed, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { PinnedService } from '../../core/services/pinned.service';
import { SearchService } from '../../core/services/search.service';
import { CATEGORIES, TOOL_BY_ID } from '../../core/tool-catalog';

@Component({
    selector: 'dt-sidebar',
    imports: [RouterModule, IconComponent],
    styles: [`
    :host {
      display: block;
      height: 100%;
      flex-shrink: 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      text-align: left;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      font-family: var(--font-ui);
      font-size: 13px;
      transition: background 0.1s, color 0.1s;
      background: transparent;
      padding: 6px 8px;
    }

    .nav-item:hover {
      background: var(--surface-hover, rgba(0,0,0,0.05));
    }

    .cat-header {
      display: flex;
      align-items: center;
      gap: 7px;
      width: 100%;
      text-align: left;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      font-family: var(--font-ui);
      font-size: 12px;
      font-weight: 600;
      padding: 5px 8px;
      background: transparent;
      color: var(--text-muted);
      transition: background 0.1s, color 0.1s;
      letter-spacing: 0.01em;
      margin-top: 2px;
    }

    .cat-header:hover {
      background: var(--surface-hover, rgba(0,0,0,0.05));
      color: var(--text);
    }

    .cat-chevron {
      margin-left: auto;
      transition: transform 0.15s ease;
      flex-shrink: 0;
    }

    .cat-chevron.expanded {
      transform: rotate(90deg);
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 7px;
      width: 100%;
      text-align: left;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      font-family: var(--font-ui);
      font-size: 12.5px;
      padding: 5px 8px 5px 26px;
      background: transparent;
      color: var(--text-muted);
      transition: background 0.1s, color 0.1s;
    }

    .tool-item:hover {
      background: var(--surface-hover, rgba(0,0,0,0.05));
      color: var(--text);
    }

    .tool-item.active {
      background: var(--maroon-soft);
      color: var(--maroon-ink);
      font-weight: 600;
    }

    .section-label {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-faint);
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-family: var(--font-ui);
      padding: 0 8px;
      display: block;
      margin-bottom: 3px;
    }

    .scrollable-cats {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      margin-right: -4px;
      padding-right: 4px;
    }

    .scrollable-cats::-webkit-scrollbar {
      width: 4px;
    }

    .scrollable-cats::-webkit-scrollbar-track {
      background: transparent;
    }

    .scrollable-cats::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }

    /* ── Pin / unpin rows ────────────────────────────────────────────────── */
    .pin-row {
      display: flex;
      align-items: center;
      border-radius: 6px;
    }
    .pin-action-btn {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Always visible at low opacity; full opacity on hover/pinned */
      opacity: 0.3;
      color: var(--text-muted);
      transition: opacity 0.12s, color 0.12s, background 0.12s;
      padding: 0;
      margin-right: 2px;
    }
    .pin-action-btn:hover {
      opacity: 1;
      background: var(--surface-hover, rgba(0,0,0,0.07));
    }
    .pin-action-btn.is-unpin {
      opacity: 0.8;
      color: var(--maroon);
    }
    .pin-action-btn.is-unpin:hover {
      opacity: 1;
      background: var(--maroon-soft);
    }
    .pin-action-btn.is-pin:hover {
      color: var(--teal);
    }
  `],
    template: `
    <nav
      style="
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        width: 232px;
        min-width: 232px;
        background: var(--surface-muted);
        border-right: 1px solid var(--border);
        font-family: var(--font-ui);
      "
    >

      <!-- Primary nav -->
      <div style="display: flex; flex-direction: column; gap: 2px; margin: 14px 0 16px; padding: 0 4px 0 4px; flex-shrink: 0;">

        <!-- Home -->
        <button
          class="nav-item"
          (click)="navigate('/home')"
          [style.background]="isActive('/home') ? 'var(--maroon-soft)' : ''"
          [style.color]="isActive('/home') ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="isActive('/home') ? 600 : 400"
        >
          <dt-icon name="home" [size]="14" />
          <span style="flex:1">Home</span>
          <kbd style="font-size:10px; color:var(--text-faint); font-family:var(--font-ui); opacity:0.7;">⌘H</kbd>
        </button>

        <!-- Search -->
        <button
          class="nav-item"
          (click)="openSearch()"
          [style.color]="'var(--text)'"
          [style.font-weight]="400"
        >
          <dt-icon name="search" [size]="14" />
          <span style="flex:1">Search</span>
          <kbd style="font-size:10px; color:var(--text-faint); font-family:var(--font-ui); opacity:0.7;">⌘K</kbd>
        </button>

        <!-- History -->
        <button
          class="nav-item"
          (click)="navigate('/history')"
          [style.background]="isActive('/history') ? 'var(--maroon-soft)' : ''"
          [style.color]="isActive('/history') ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="isActive('/history') ? 600 : 400"
        >
          <dt-icon name="history" [size]="14" />
          <span style="flex:1">History</span>
        </button>

      </div>

      <!-- Divider -->
      <div style="height:1px; background:var(--border); margin:0 8px 12px; flex-shrink:0;"></div>

      <!-- Pinned section -->
      @if (pinnedTools().length > 0) {
        <div style="margin-bottom: 16px; flex-shrink: 0; padding: 0 4px;">
          <span class="section-label">Pinned</span>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            @for (tool of pinnedTools(); track tool.id) {
              <div class="pin-row">
                <button
                  class="tool-item"
                  [class.active]="isActive(tool.route)"
                  (click)="navigate(tool.route)"
                  style="padding-left: 8px; flex:1;"
                >
                  <dt-icon [name]="tool.icon" [size]="13" />
                  <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ tool.name }}</span>
                </button>
                <button
                  class="pin-action-btn is-unpin"
                  (click)="unpinTool(tool.id)"
                  title="Unpin"
                >
                  <dt-icon name="pin-solid" [size]="13" />
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Recent section -->
      @if (recentTools().length > 0) {
        <div style="margin-bottom: 16px; flex-shrink: 0; padding: 0 4px;">
          <span class="section-label">Recent</span>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            @for (tool of recentTools(); track tool.id) {
              <button
                class="tool-item"
                [class.active]="isActive(tool.route)"
                (click)="navigate(tool.route)"
                style="padding-left: 8px;"
              >
                <dt-icon [name]="tool.icon" [size]="13" />
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ tool.name }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Categories section header — fixed, never scrolls -->
      <div style="padding: 0 12px; flex-shrink: 0;">
        <span class="section-label">Categories</span>
      </div>

      <!-- Categories accordion — scrollable -->
      <div class="scrollable-cats" style="padding: 0 4px;">
        <div style="display: flex; flex-direction: column; gap: 1px;">
          @for (cat of categories; track cat.id) {

            <!-- Category header -->
            <button
              class="cat-header"
              (click)="toggleCat(cat.id)"
            >
              <dt-icon [name]="cat.icon" [size]="13" />
              <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ cat.name }}</span>
              <span style="font-size:10px; color:var(--text-faint); font-weight:400; margin-right:4px;">{{ cat.tools.length }}</span>
              <dt-icon
                name="chevron"
                [size]="12"
                class="cat-chevron"
                [class.expanded]="isExpanded(cat.id)"
              />
            </button>

            <!-- Tools list (shown when expanded) -->
            @if (isExpanded(cat.id)) {
              @for (tool of cat.tools; track tool.id) {
                <div class="pin-row">
                  <button
                    class="tool-item"
                    [class.active]="isActive(tool.route)"
                    (click)="navigate(tool.route)"
                    style="flex:1;"
                  >
                    <dt-icon [name]="tool.icon" [size]="12" />
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ tool.name }}</span>
                  </button>
                  <button
                    class="pin-action-btn"
                    [class.is-pin]="!isPinnedTool(tool.id)"
                    [class.is-unpin]="isPinnedTool(tool.id)"
                    (click)="togglePinTool(tool.id)"
                    [title]="isPinnedTool(tool.id) ? 'Unpin' : 'Pin to sidebar'"
                  >
                    <dt-icon
                      [name]="isPinnedTool(tool.id) ? 'pin-solid' : 'pin'"
                      [size]="12"
                    />
                  </button>
                </div>
              }
            }

          }
        </div>
      </div>

      <!-- Bottom actions: Settings -->
      <div style="padding: 0 4px; flex-shrink: 0; margin-top: 6px;">
        <button
          class="nav-item"
          (click)="navigate('/settings')"
          [style.background]="isActive('/settings') ? 'var(--maroon-soft)' : ''"
          [style.color]="isActive('/settings') ? 'var(--maroon-ink)' : 'var(--text)'"
          [style.font-weight]="isActive('/settings') ? 600 : 400"
        >
          <dt-icon name="settings" [size]="14" />
          <span style="flex:1">Settings</span>
          <kbd style="font-size:10px; color:var(--text-faint); font-family:var(--font-ui); opacity:0.7;">⌘,</kbd>
        </button>
      </div>

      <!-- All tools run locally badge -->
      <div
        style="
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 8px 4px 0;
          padding: 6px 8px;
          border-radius: 6px;
          background: var(--teal-soft);
          color: var(--teal-ink);
          flex-shrink: 0;
        "
      >
        <dt-icon name="lock" [size]="12" />
        <span style="font-size:11px; font-weight:500; font-family:var(--font-ui);">All tools run locally</span>
      </div>

      <div style="height: 10px; flex-shrink: 0;"></div>

    </nav>
  `
})
export class SidebarComponent {
  private router = inject(Router);
  private pinnedService = inject(PinnedService);
  private searchService = inject(SearchService);

  readonly categories = CATEGORIES;

  /** Track which category IDs are expanded; default: all expanded */
  expandedCats = signal<Set<string>>(new Set(CATEGORIES.map(c => c.id)));

  readonly pinnedTools = computed(() =>
    this.pinnedService.pinned()
      .map(id => TOOL_BY_ID[id])
      .filter(Boolean)
  );

  isPinnedTool(id: string): boolean {
    return this.pinnedService.pinned().includes(id);
  }

  unpinTool(id: string): void {
    this.pinnedService.unpin(id);
  }

  togglePinTool(id: string): void {
    this.pinnedService.togglePin(id);
  }

  readonly recentTools = computed(() =>
    this.pinnedService.recent()
      .map(id => TOOL_BY_ID[id])
      .filter(Boolean)
  );

  // ── Accordion ─────────────────────────────────────────────────────────────

  toggleCat(id: string): void {
    this.expandedCats.update(s => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedCats().has(id);
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  isActive(route: string): boolean {
    const url = this.router.url.split('?')[0].split('#').pop() ?? '';
    if (route === '/home') {
      return url === '/home' || url === '/' || url === '';
    }
    // /about is a settings sub-page — keep Settings highlighted there too
    if (route === '/settings') {
      return url === '/settings' || url.startsWith('/settings/') || url === '/about';
    }
    return url === route || url.startsWith(route + '/');
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  openSearch(): void {
    this.searchService.open();
  }

}
