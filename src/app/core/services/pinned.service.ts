import { Injectable, signal, computed } from '@angular/core';

const DEFAULT_PINNED = ['json', 'base64', 'uuid', 'img-convert'];
const DEFAULT_RECENT = ['hash', 'jwt', 'cron'];
const STORAGE_KEY = 'dev-core-tools-pinned';

@Injectable({ providedIn: 'root' })
export class PinnedService {
  private _pinned = signal<string[]>(this.loadPinned());
  private _recent = signal<string[]>(this.loadRecent());

  readonly pinned = this._pinned.asReadonly();
  readonly recent = this._recent.asReadonly();

  isPinned = computed(() => (id: string) => this._pinned().includes(id));

  pin(id: string): void {
    this._pinned.update(p => {
      if (p.includes(id)) return p;
      const next = [id, ...p].slice(0, 10);
      this.persistPinned(next);
      return next;
    });
  }

  unpin(id: string): void {
    this._pinned.update(p => {
      const next = p.filter(x => x !== id);
      this.persistPinned(next);
      return next;
    });
  }

  togglePin(id: string): void {
    if (this._pinned().includes(id)) this.unpin(id);
    else this.pin(id);
  }

  recordVisit(id: string): void {
    this._recent.update(r => {
      const next = [id, ...r.filter(x => x !== id)].slice(0, 5);
      try { localStorage.setItem('dev-core-tools-recent', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  private loadPinned(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [...DEFAULT_PINNED];
  }

  private loadRecent(): string[] {
    try {
      const raw = localStorage.getItem('dev-core-tools-recent');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [...DEFAULT_RECENT];
  }

  clearRecent(): void {
    this._recent.set([]);
    try { localStorage.removeItem('dev-core-tools-recent'); } catch { /* ignore */ }
  }

  clearAll(): void {
    this._pinned.set([...DEFAULT_PINNED]);
    this._recent.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('dev-core-tools-recent');
    } catch { /* ignore */ }
  }

  private persistPinned(p: string[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }
}
