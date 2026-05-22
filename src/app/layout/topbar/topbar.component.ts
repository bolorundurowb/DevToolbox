import { Component, input, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SearchService } from '../../core/services/search.service';
import { SettingsService } from '../../core/services/settings.service';
import { PinnedService } from '../../core/services/pinned.service';
import type { Theme } from '../../core/services/settings.service';

@Component({
  selector: 'dt-topbar',
  standalone: true,
  imports: [RouterModule, IconComponent],
  template: `
    <header
      class="flex items-center gap-3 flex-shrink-0"
      [style.height.px]="48"
      [style.padding]="'0 16px'"
      [style.border-bottom]="'1px solid var(--border)'"
      [style.background]="'var(--bg)'"
      [style.font-family]="'var(--font-ui)'"
    >
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1 flex-shrink-0">
        @for (crumb of crumbs(); track crumb; let last = $last; let idx = $index) {
          @if (idx > 0) {
            <dt-icon name="chevron" [size]="12" [color]="'var(--text-faint)'" />
          }
          <span
            [style.font-size.px]="13"
            [style.font-weight]="last ? 500 : 400"
            [style.color]="last ? 'var(--text)' : 'var(--text-muted)'"
            [style.font-family]="'var(--font-ui)'"
          >{{ crumb }}</span>
        }
      </nav>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Pin button (only shown when on a tool page) -->
      @if (toolId()) {
        <button
          (click)="togglePin()"
          [title]="isPinned() ? 'Unpin from sidebar' : 'Pin to sidebar'"
          style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)"
        >
          <dt-icon
            [name]="isPinned() ? 'bookmark-solid' : 'bookmark'"
            [size]="15"
            [color]="isPinned() ? 'var(--maroon)' : 'var(--text-muted)'"
          />
        </button>
      }

      <!-- Search pill -->
      <button
        (click)="openSearch()"
        class="flex items-center gap-2 transition-colors"
        [style.min-width.px]="280"
        [style.height.px]="30"
        [style.padding]="'0 10px'"
        [style.border-radius.px]="8"
        [style.background]="'var(--surface-muted)'"
        [style.border]="'1px solid var(--border)'"
        [style.cursor]="'pointer'"
        [style.font-family]="'var(--font-ui)'"
      >
        <dt-icon name="search" [size]="13" [color]="'var(--text-faint)'" />
        <span
          class="flex-1 text-left"
          [style.font-size.px]="12.5"
          [style.color]="'var(--text-faint)'"
          [style.font-family]="'var(--font-ui)'"
        >Search 30 tools&hellip;</span>
        <kbd
          class="flex items-center gap-0.5"
          [style.font-size.px]="11"
          [style.color]="'var(--text-faint)'"
          [style.font-family]="'var(--font-ui)'"
          [style.background]="'var(--surface)'"
          [style.border]="'1px solid var(--border)'"
          [style.border-radius.px]="4"
          [style.padding]="'1px 4px'"
          [style.line-height]="1.4"
        >⌘K</kbd>
      </button>

      <!-- Theme toggle -->
      <button
        (click)="cycleTheme()"
        class="flex items-center justify-center transition-colors"
        [style.width.px]="32"
        [style.height.px]="32"
        [style.border-radius.px]="8"
        [style.border]="'1px solid var(--border)'"
        [style.background]="'var(--surface-muted)'"
        [style.cursor]="'pointer'"
        [style.color]="'var(--text-muted)'"
        [title]="themeLabel()"
      >
        @if (currentTheme() === 'dark') {
          <dt-icon name="moon" [size]="14" />
        } @else if (currentTheme() === 'light') {
          <dt-icon name="sun" [size]="14" />
        } @else {
          <dt-icon name="sliders" [size]="14" />
        }
      </button>
    </header>
  `,
})
export class TopbarComponent {
  readonly crumbs = input<string[]>([]);
  readonly toolId = input<string>('');

  private searchService = inject(SearchService);
  private settingsService = inject(SettingsService);
  private pinnedSvc = inject(PinnedService);

  readonly currentTheme = computed(() => this.settingsService.theme());
  readonly isPinned = computed(() =>
    this.toolId() ? this.pinnedSvc.isPinned()(this.toolId()) : false
  );

  readonly themeLabel = computed(() => {
    const t = this.settingsService.theme();
    if (t === 'light') return 'Switch to dark mode';
    if (t === 'dark') return 'Switch to system mode';
    return 'Switch to light mode';
  });

  openSearch(): void {
    this.searchService.open();
  }

  cycleTheme(): void {
    const current = this.settingsService.theme();
    const next: Theme =
      current === 'light' ? 'dark' :
      current === 'dark'  ? 'system' :
      'light';
    this.settingsService.update({ theme: next });
  }

  togglePin(): void {
    if (this.toolId()) this.pinnedSvc.togglePin(this.toolId());
  }
}
