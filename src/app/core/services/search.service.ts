import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ALL_TOOLS, searchTools, Tool } from '../tool-catalog';
import { I18nService } from '../i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  readonly isOpen = signal(false);
  readonly query = signal('');
  readonly results = signal<Tool[]>([]);
  readonly selectedIndex = signal(0);

  constructor(private router: Router, private i18n: I18nService) {}

  open(): void {
    this.query.set('');
    this.results.set(ALL_TOOLS.slice(0, 8));
    this.selectedIndex.set(0);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
  }

  setQuery(q: string): void {
    this.query.set(q);
    const found = searchTools(q, value => this.i18n.translateText(value));
    this.results.set(found.slice(0, 8));
    this.selectedIndex.set(0);
  }

  moveUp(): void {
    this.selectedIndex.update(i => Math.max(0, i - 1));
  }

  moveDown(): void {
    this.selectedIndex.update(i => Math.min(this.results().length - 1, i + 1));
  }

  confirm(): void {
    const tool = this.results()[this.selectedIndex()];
    if (tool) {
      this.router.navigate([tool.route]);
      this.close();
    }
  }
}
