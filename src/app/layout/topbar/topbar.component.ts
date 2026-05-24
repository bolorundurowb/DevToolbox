import { Component, input, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SearchService } from '../../core/services/search.service';
import { PinnedService } from '../../core/services/pinned.service';

@Component({
    selector: 'dt-topbar',
    imports: [IconComponent],
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

      <!-- Pin button + "Pinned" badge (only shown when on a tool page) -->
      @if (toolId()) {
        <button
          (click)="togglePin()"
          [title]="isPinned() ? 'Unpin from sidebar' : 'Pin to sidebar'"
          [style.background]="isPinned() ? 'var(--maroon-soft)' : 'transparent'"
          [style.border-color]="isPinned() ? 'var(--maroon)' : 'var(--border)'"
          style="height:30px;padding:0 10px;border-radius:8px;border-width:1px;border-style:solid;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:var(--font-ui);transition:background 0.15s,border-color 0.15s"
        >
          <dt-icon
            [name]="isPinned() ? 'pin-solid' : 'pin'"
            [size]="14"
            [color]="isPinned() ? 'var(--maroon)' : 'var(--text-muted)'"
          />
          @if (isPinned()) {
            <span style="font-size:12px;font-weight:600;color:var(--maroon);white-space:nowrap">Pinned</span>
          }
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
        >Search tools&hellip;</span>
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

      <!-- Settings button -->
      <button
        (click)="openSettings()"
        class="flex items-center justify-center transition-colors"
        [style.width.px]="32"
        [style.height.px]="32"
        [style.border-radius.px]="8"
        [style.border]="'1px solid var(--border)'"
        [style.background]="'var(--surface-muted)'"
        [style.cursor]="'pointer'"
        [style.color]="'var(--text-muted)'"
        title="Settings"
      >
        <dt-icon name="settings" [size]="14" />
      </button>
    </header>
  `
})
export class TopbarComponent {
  readonly crumbs = input<string[]>([]);
  readonly toolId = input<string>('');

  private searchService = inject(SearchService);
  private pinnedSvc = inject(PinnedService);
  private router = inject(Router);

  readonly isPinned = computed(() =>
    this.toolId() ? this.pinnedSvc.isPinned()(this.toolId()) : false
  );

  openSearch(): void {
    this.searchService.open();
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  togglePin(): void {
    if (this.toolId()) this.pinnedSvc.togglePin(this.toolId());
  }
}