import { Component, computed, inject, HostListener } from '@angular/core';

import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';
import { SearchService } from '../../core/services/search.service';
import { SettingsService } from '../../core/services/settings.service';
import { PinnedService } from '../../core/services/pinned.service';
import { HistoryService } from '../../core/services/history.service';
import { ALL_TOOLS } from '../../core/tool-catalog';

@Component({
  selector: 'dt-shell',
  imports: [RouterModule, SidebarComponent, CommandPaletteComponent],
  template: `
    <div
      class="flex h-screen overflow-hidden"
      [style.background]="'var(--bg)'"
      [style.font-family]="'var(--font-ui)'"
      [style.--sidebar-width]="sidebarWidth() + 'px'"
    >
      <!-- Sidebar -->
      <dt-sidebar />

      <!-- Main content area -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <!-- Router outlet fills the main area -->
        <div class="flex-1 overflow-auto">
          <router-outlet />
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

  readonly sidebarWidth = computed(() => this.settingsService.sidebarWidth());

  constructor() {
    const router = inject(Router);
    const pinnedService = inject(PinnedService);
    const historySvc = inject(HistoryService);

    router.events
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
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.metaKey || event.ctrlKey;

    // ⌘K / Ctrl+K — open search palette
    if (mod && event.key === 'k') {
      event.preventDefault();
      if (this.searchService.isOpen()) {
        this.searchService.close();
      } else {
        this.searchService.open();
      }
    }

    // ⌘, / Ctrl+, — open settings
    if (mod && event.key === ',') {
      event.preventDefault();
      inject(Router).navigate(['/settings']);
    }

    // ⌘H / Ctrl+H — go home
    if (mod && event.key === 'h') {
      event.preventDefault();
      inject(Router).navigate(['/home']);
    }
  }
}
