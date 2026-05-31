import {
  Component,
  signal,
  computed,
  inject,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewInit,
  effect,
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { SearchService } from '../../core/services/search.service';
import { SettingsService } from '../../core/services/settings.service';
import type { Tool } from '../../core/tool-catalog';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'dt-command-palette',
  imports: [RouterModule, IconComponent],
  template: `
    @if (searchService.isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0"
        [style.z-index]="9998"
        [style.background]="'rgba(0,0,0,0.35)'"
        [style.backdrop-filter]="'blur(2px)'"
        (click)="close()"
        (keydown.escape)="close()"
        role="presentation"
      ></div>

      <!-- Palette card -->
      <div
        class="fixed"
        [style.z-index]="9999"
        [style.top]="'56px'"
        [style.left]="'50%'"
        [style.transform]="'translateX(-50%)'"
        [style.width.px]="560"
        [style.border-radius.px]="10"
        [style.background]="'var(--surface)'"
        [style.border]="'1px solid var(--border-strong)'"
        [style.box-shadow]="'0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)'"
        [style.overflow]="'hidden'"
        [style.font-family]="'var(--font-ui)'"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <!-- Search input -->
        <div
          class="flex items-center gap-3"
          [style.padding]="'12px 14px'"
          [style.border-bottom]="'1px solid var(--border)'"
        >
          <dt-icon name="search" [size]="16" [color]="'var(--text-faint)'" />
          <input
            #searchInput
            type="text"
            [value]="searchService.query()"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)"
            placeholder="Search tools…"
            class="flex-1 bg-transparent outline-none border-none"
            [style.font-size.px]="14"
            [style.color]="'var(--text)'"
            [style.font-family]="'var(--font-ui)'"
            autocomplete="off"
            spellcheck="false"
          />
          @if (searchService.query()) {
            <button
              (click)="clearQuery()"
              class="flex items-center justify-center"
              [style.width.px]="18"
              [style.height.px]="18"
              [style.border-radius.px]="4"
              [style.background]="'var(--surface-muted)'"
              [style.border]="'none'"
              [style.cursor]="'pointer'"
              [style.color]="'var(--text-faint)'"
            >
              <dt-icon name="x" [size]="10" />
            </button>
          }
          <kbd
            [style.font-size.px]="11"
            [style.color]="'var(--text-faint)'"
            [style.background]="'var(--surface-muted)'"
            [style.border]="'1px solid var(--border)'"
            [style.border-radius.px]="4"
            [style.padding]="'2px 5px'"
            [style.font-family]="'var(--font-ui)'"
            >Esc</kbd
          >
        </div>

        <!-- Results list -->
        <div class="overflow-y-auto" [style.max-height.px]="360">
          @if (searchService.results().length > 0) {
            <!-- Section label -->
            <div
              [style.padding]="'8px 14px 4px'"
              [style.font-size.px]="10.5"
              [style.font-weight]="600"
              [style.color]="'var(--text-faint)'"
              [style.letter-spacing]="'0.8px'"
              [style.text-transform]="'uppercase'"
              [style.font-family]="'var(--font-ui)'"
            >
              Tools
            </div>

            @for (
              tool of searchService.results();
              track tool.id;
              let idx = $index
            ) {
              <button
                (click)="selectTool(idx)"
                (mouseenter)="setSelected(idx)"
                class="flex items-center gap-3 w-full text-left transition-colors"
                [style.padding]="'8px 14px'"
                [style.border]="'none'"
                [style.cursor]="'pointer'"
                [style.background]="
                  idx === searchService.selectedIndex()
                    ? 'var(--maroon-soft)'
                    : 'transparent'
                "
                [style.color]="
                  idx === searchService.selectedIndex()
                    ? 'var(--maroon-ink)'
                    : 'var(--text)'
                "
              >
                <!-- Icon -->
                <div
                  class="flex items-center justify-center flex-shrink-0"
                  [style.width.px]="28"
                  [style.height.px]="28"
                  [style.border-radius.px]="6"
                  [style.background]="
                    idx === searchService.selectedIndex()
                      ? 'var(--maroon)'
                      : 'var(--surface-muted)'
                  "
                  [style.color]="
                    idx === searchService.selectedIndex()
                      ? '#fff'
                      : 'var(--text-muted)'
                  "
                >
                  <dt-icon [name]="tool.icon" [size]="14" />
                </div>

                <!-- Text -->
                <div class="flex flex-col flex-1 min-w-0">
                  <span
                    [style.font-size.px]="13"
                    [style.font-weight]="500"
                    [style.font-family]="'var(--font-ui)'"
                    [innerHTML]="highlightMatch(translate(tool.name))"
                  ></span>
                  <span
                    [style.font-size.px]="11.5"
                    [style.color]="
                      idx === searchService.selectedIndex()
                        ? 'var(--maroon-ink)'
                        : 'var(--text-faint)'
                    "
                    [style.font-family]="'var(--font-ui)'"
                    class="truncate"
                  >
                    <span [style.opacity]="0.7">{{ translate(tool.catName) }}</span>
                    <span [style.opacity]="0.5"> · </span>
                    {{ translate(tool.desc) }}
                  </span>
                </div>

                <!-- Enter badge on selected -->
                @if (idx === searchService.selectedIndex()) {
                  <kbd
                    [style.font-size.px]="11"
                    [style.color]="'var(--maroon-ink)'"
                    [style.background]="'var(--maroon-soft)'"
                    [style.border]="'1px solid var(--maroon)'"
                    [style.border-radius.px]="4"
                    [style.padding]="'2px 5px'"
                    [style.font-family]="'var(--font-ui)'"
                    [style.flex-shrink]="0"
                    >↵</kbd
                  >
                }
              </button>
            }
          } @else {
            <!-- Empty state -->
            <div
              class="flex flex-col items-center justify-center"
              [style.padding]="'36px 24px'"
              [style.color]="'var(--text-faint)'"
              [style.font-family]="'var(--font-ui)'"
            >
              <dt-icon name="search" [size]="24" />
              <p [style.font-size.px]="13" [style.margin-top.px]="10">
                No tools found for "{{ searchService.query() }}"
              </p>
            </div>
          }
        </div>

        <!-- Footer -->
        <div
          class="flex items-center gap-4"
          [style.padding]="'8px 14px'"
          [style.border-top]="'1px solid var(--border)'"
          [style.background]="'var(--surface-muted)'"
        >
          <span
            [style.font-size.px]="11.5"
            [style.color]="'var(--text-faint)'"
            [style.font-family]="'var(--font-ui)'"
            >{{ searchService.results().length }} result{{
              searchService.results().length === 1 ? '' : 's'
            }}</span
          >

          <div class="flex items-center gap-3 flex-1 justify-end">
            <span
              class="flex items-center gap-1"
              [style.font-size.px]="11"
              [style.color]="'var(--text-faint)'"
              [style.font-family]="'var(--font-ui)'"
            >
              <kbd
                [style.background]="'var(--surface)'"
                [style.border]="'1px solid var(--border)'"
                [style.border-radius.px]="3"
                [style.padding]="'1px 4px'"
                [style.font-size.px]="10"
                >↑↓</kbd
              >
              <span>navigate</span>
            </span>
            <span
              class="flex items-center gap-1"
              [style.font-size.px]="11"
              [style.color]="'var(--text-faint)'"
              [style.font-family]="'var(--font-ui)'"
            >
              <kbd
                [style.background]="'var(--surface)'"
                [style.border]="'1px solid var(--border)'"
                [style.border-radius.px]="3"
                [style.padding]="'1px 4px'"
                [style.font-size.px]="10"
                >↵</kbd
              >
              <span>open</span>
            </span>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  readonly searchService = inject(SearchService);
  private readonly i18n = inject(I18nService);

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  constructor() {
    // Auto-focus input when palette opens
    effect(() => {
      if (this.searchService.isOpen()) {
        // Use a microtask to ensure the DOM has rendered
        Promise.resolve().then(() => {
          this.searchInputRef?.nativeElement?.focus();
        });
      }
    });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchService.setQuery(value);
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.searchService.moveUp();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.searchService.moveDown();
        break;
      case 'Enter':
        event.preventDefault();
        this.searchService.confirm();
        break;
    }
  }

  close(): void {
    this.searchService.close();
  }

  clearQuery(): void {
    this.searchService.setQuery('');
    this.searchInputRef?.nativeElement?.focus();
  }

  selectTool(idx: number): void {
    this.searchService['selectedIndex'].set(idx);
    this.searchService.confirm();
  }

  setSelected(idx: number): void {
    this.searchService['selectedIndex'].set(idx);
  }

  translate(value: string): string {
    return this.i18n.translateText(value);
  }

  highlightMatch(text: string): string {
    const query = this.searchService.query();
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(
      regex,
      '<mark style="background:var(--maroon-soft);color:var(--maroon-ink);border-radius:2px;padding:0 1px;">$1</mark>',
    );
  }
}
