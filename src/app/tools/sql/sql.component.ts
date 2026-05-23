import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { format } from 'sql-formatter';

type SqlDialect = 'sql' | 'mysql' | 'postgresql' | 'tsql';

const DIALECT_LABELS: Record<SqlDialect, string> = {
  sql: 'Standard SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  tsql: 'T-SQL',
};

const SAMPLE_SQL = `SELECT u.id, u.name, u.email, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at > '2024-01-01' AND u.active = 1 GROUP BY u.id, u.name, u.email HAVING COUNT(o.id) > 0 ORDER BY total_spent DESC LIMIT 100;`;

@Component({
    selector: 'dt-tool-sql',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'SQL Formatter']" [toolId]="'sql'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="layers" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">SQL Formatter</div>
          <div style="font-size:12px;color:var(--text-muted)">Format and beautify SQL queries</div>
        </div>
        <div style="flex:1"></div>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted)">
          Dialect
          <select [(ngModel)]="dialect" (ngModelChange)="reformat()" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
            @for (entry of dialectEntries; track entry[0]) {
              <option [value]="entry[0]">{{ entry[1] }}</option>
            }
          </select>
        </label>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted)">
          Indent
          <select [(ngModel)]="indentSize" (ngModelChange)="reformat()" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </label>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
          <input type="checkbox" [(ngModel)]="uppercase" (ngModelChange)="reformat()" style="accent-color:var(--teal);cursor:pointer" />
          Uppercase
        </label>

        <button (click)="loadSample()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          Sample
        </button>

        <button (click)="copy()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none">
          <dt-icon name="copy" [size]="13" [color]="'#fff'" />
          {{ copied() ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- Two-pane body -->
      <div style="flex:1;min-height:0;display:flex;overflow:hidden">

        <!-- Input pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border)">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">SQL INPUT</span>
          </div>
          <textarea
            style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.5"
            [value]="inputVal()"
            (input)="onInput($event)"
            placeholder="Paste SQL here…"
            spellcheck="false"
          ></textarea>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:6px">
            @if (error()) {
              <dt-icon name="alert-circle" [size]="12" [color]="'#e05252'" />
              <span style="font-size:11.5px;color:#e05252;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ error() }}</span>
            } @else if (inputVal().trim()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ inputVal().trim().length }} chars</span>
            }
          </div>
        </div>

        <!-- Output pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">FORMATTED OUTPUT</span>
          </div>
          <div style="flex:1;display:flex;min-height:0;overflow:hidden;background:var(--surface)">
            @if (output()) {
              <div style="padding:14px 8px 14px 10px;font-family:var(--font-mono);font-size:12.5px;color:var(--text-faint);user-select:none;text-align:right;overflow:hidden;line-height:1.5;background:var(--surface-muted);border-right:1px solid var(--border);min-width:36px;flex-shrink:0">
                @for (n of lineNumbers(); track n) {
                  <div>{{ n }}</div>
                }
              </div>
            }
            <pre style="flex:1;overflow:auto;margin:0;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);white-space:pre-wrap;word-break:break-all;line-height:1.5">{{ output() }}</pre>
          </div>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0">
            @if (output()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ lineNumbers().length }} lines</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`]
})
export class SqlComponent {
  inputVal = signal('');
  dialect: SqlDialect = 'sql';
  indentSize = '2';
  uppercase = true;
  copied = signal(false);
  error = signal('');

  dialectEntries = Object.entries(DIALECT_LABELS) as [SqlDialect, string][];

  output = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    try {
      const result = format(raw, {
        language: this.dialect,
        tabWidth: Number(this.indentSize),
        keywordCase: this.uppercase ? 'upper' : 'preserve',
      });
      this.error.set('');
      return result;
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Format error');
      return raw;
    }
  });

  lineNumbers = computed(() => {
    const out = this.output();
    if (!out) return [] as number[];
    return out.split('\n').map((_, i) => i + 1);
  });

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  reformat() {
    // trigger recompute by reading output
    void this.output();
  }

  loadSample() {
    this.inputVal.set(SAMPLE_SQL);
  }

  async copy() {
    const out = this.output();
    if (!out) return;
    await navigator.clipboard.writeText(out);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
