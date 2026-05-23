import { Component, computed, inject, HostListener } from '@angular/core';

import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';
import { WindowControlsComponent } from '../window-controls/window-controls.component';
import { SearchService } from '../../core/services/search.service';
import { SettingsService } from '../../core/services/settings.service';
import { PinnedService } from '../../core/services/pinned.service';
import { HistoryService } from '../../core/services/history.service';
import { ALL_TOOLS } from '../../core/tool-catalog';

@Component({
  selector: 'dt-shell',
  imports: [RouterModule, SidebarComponent, CommandPaletteComponent, WindowControlsComponent],
  template: `
    <div
      class="flex flex-col h-screen overflow-hidden"
      [style.background]="'var(--bg)'"
      [style.font-family]="'var(--font-ui)'"
      [style.--sidebar-width]="sidebarWidth() + 'px'"
    >
      <dt-window-controls />

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <!-- Sidebar -->
        <dt-sidebar />

        <!-- Main content area -->
        <div class="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          <!-- Router outlet fills the main area -->
          <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
            <router-outlet />
          </div>
        </div>
      </div>

      <!-- Command palette overlay (portal-like, z-indexed above everything) -->
      <dt-command-palette />
    </div>
  `,
})
export class ShellComponent {
  private searchService = inject(SearchService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  readonly sidebarWidth = computed(() => this.settingsService.sidebarWidth());

  constructor() {
    const pinnedService = inject(PinnedService);
    const historySvc = inject(HistoryService);

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        const m = url.match(/\/tools\/([^?#]+)/);
        if (m) {
          const routePath = '/tools/' + m[1];
          const tool = ALL_TOOLS.find((t) => t.route === routePath);
          if (tool) {
            pinnedService.recordVisit(tool.id); // keeps Recent (last 5)
            historySvc.record(tool.id); // full history with timestamps
          }
        }
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    // ⌘K / Ctrl+K — open search palette
    if (mod && key === 'k') {
      event.preventDefault();
      event.stopPropagation();
      if (this.searchService.isOpen()) {
        this.searchService.close();
      } else {
        this.searchService.open();
      }
      return;
    }

    // ⌘, / Ctrl+, — open settings
    if (mod && event.key === ',') {
      event.preventDefault();
      event.stopPropagation();
      this.router.navigate(['/settings']);
      return;
    }

    // ⌘H / Ctrl+H — go home. Ctrl+Shift+H is also accepted on Windows.
    const isHomeKey = key === 'h' || event.code === 'KeyH';
    const isHome = event.metaKey
      ? isHomeKey
      : event.ctrlKey && isHomeKey;
    if (isHome) {
      event.preventDefault();
      event.stopPropagation();
      this.router.navigate(['/home']);
    }
  }
}