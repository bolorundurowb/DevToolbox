import { Injectable, signal, computed, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { TOOL_BY_ID } from '../tool-catalog';

export interface HistoryEntry {
  toolId:    string;
  visitedAt: number;   // epoch ms
}

const STORAGE_KEY = 'dev-core-tools-history';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private svc = inject(SettingsService);

  private _entries = signal<HistoryEntry[]>(this.load());

  /** All history entries, newest-first */
  readonly entries = this._entries.asReadonly();

  /** Entries grouped by calendar date, newest day first */
  readonly grouped = computed(() => {
    const byDate = new Map<string, HistoryEntry[]>();
    for (const e of this._entries()) {
      const key = new Date(e.visitedAt).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(e);
    }
    return [...byDate.entries()].map(([date, items]) => ({ date, items }));
  });

  /** Record a tool visit. Deduplicates back-to-back visits to the same tool. */
  record(toolId: string): void {
    const trackHistory = this.svc.settings().trackHistory;
    if (!trackHistory) return;
    const maxHistory = this.svc.settings().maxHistory;

    this._entries.update(prev => {
      // Don't double-record if the very last entry is the same tool (within 5s)
      const last = prev[0];
      if (last && last.toolId === toolId && Date.now() - last.visitedAt < 5000) return prev;

      const entry: HistoryEntry = { toolId, visitedAt: Date.now() };
      const next = [entry, ...prev].slice(0, maxHistory);
      this.persist(next);
      return next;
    });
  }

  clearAll(): void {
    this._entries.set([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  clearEntry(index: number): void {
    this._entries.update(prev => {
      const next = prev.filter((_, i) => i !== index);
      this.persist(next);
      return next;
    });
  }

  private load(): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  }

  private persist(entries: HistoryEntry[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
  }
}

/** Convenience: resolve a toolId to its catalog entry */
export function toolById(id: string) {
  return TOOL_BY_ID[id] ?? null;
}
