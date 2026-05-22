import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  const sep = delim === 'tab' ? '\t' : delim;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === sep) { row.push(field); field = ''; }
      else if (ch === '\r' && text[i + 1] === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; }
      else if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
      else { field += ch; }
    }
    i++;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

function csvToJson(text: string, delim: string): string {
  const rows = parseCsv(text, delim);
  if (rows.length < 2) return '[]';
  const headers = rows[0];
  const result = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = row[i] ?? ''; });
    return obj;
  });
  return JSON.stringify(result, null, 2);
}

function jsonToCsv(text: string, delim: string): string {
  const sep = delim === 'tab' ? '\t' : delim;
  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escField = (v: string) => {
    const s = String(v ?? '');
    if (s.includes(sep) || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [headers.map(escField).join(sep), ...data.map((row: Record<string, unknown>) => headers.map(h => escField(String(row[h] ?? ''))).join(sep))].join('\n');
}

function csvToXml(text: string, delim: string): string {
  const rows = parseCsv(text, delim);
  if (rows.length < 2) return '<rows></rows>';
  const headers = rows[0].map(h => h.trim().replace(/[^a-zA-Z0-9_.-]/g, '_') || 'col');
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const xmlRows = rows.slice(1).map(row => {
    const cols = headers.map((h, i) => `    <${h}>${escape(row[i] ?? '')}</${h}>`).join('\n');
    return `  <row>\n${cols}\n  </row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n${xmlRows.join('\n')}\n</rows>`;
}

@Component({
  selector: 'dt-tool-csv-json',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Data Transform', 'CSV ↔ JSON / XML']" [toolId]="'csv-json'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="code-bracket" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">CSV ↔ JSON / XML</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert tabular data between formats</div>
    </div>
  </div>

  <!-- Mode + delimiter -->
  <div style="display:flex;align-items:center;gap:14px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      @for (m of modes; track m.key) {
        <button (click)="mode.set(m.key)"
          [style.background]="mode()===m.key ? 'var(--maroon)' : 'transparent'"
          [style.color]="mode()===m.key ? '#fff' : 'var(--text-muted)'"
          style="padding:5px 12px;font-size:12.5px;font-weight:500;border:none;cursor:pointer">
          {{ m.label }}
        </button>
      }
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:12px;color:var(--text-muted)">Delimiter:</span>
      <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
        @for (d of delimiters; track d.key) {
          <button (click)="delim.set(d.key)"
            [style.background]="delim()===d.key ? 'var(--teal)' : 'transparent'"
            [style.color]="delim()===d.key ? '#fff' : 'var(--text-muted)'"
            style="padding:3px 10px;font-size:12px;border:none;cursor:pointer">
            {{ d.label }}
          </button>
        }
      </div>
    </div>
    @if (stats()) {
      <span style="font-size:11.5px;color:var(--text-faint);margin-left:auto">{{ stats() }}</span>
    }
  </div>

  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0;overflow:hidden">
    <!-- Input -->
    <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">{{ inputLabel() }}</div>
      <textarea [(ngModel)]="input" (ngModelChange)="convert()"
        [placeholder]="inputPlaceholder()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
    <!-- Output -->
    <div style="display:flex;flex-direction:column;min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;gap:6px">
        {{ outputLabel() }}
        <div style="flex:1"></div>
        @if (output()) {
          <button (click)="copyOut()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      @if (error()) {
        <div style="margin:10px;padding:8px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:12px">{{ error() }}</div>
      }
      <textarea readonly [value]="output()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
  </div>
</div>
`,
})
export class CsvJsonComponent {
  modes = [
    { key: 'csv-json', label: 'CSV → JSON' },
    { key: 'json-csv', label: 'JSON → CSV' },
    { key: 'csv-xml', label: 'CSV → XML' },
  ];
  delimiters = [
    { key: ',', label: 'Comma' },
    { key: ';', label: 'Semi' },
    { key: 'tab', label: 'Tab' },
  ];
  mode = signal('csv-json');
  delim = signal(',');
  input = '';
  output = signal('');
  error = signal('');
  stats = signal('');
  copied = signal(false);

  inputLabel = computed(() => this.mode() === 'json-csv' ? 'JSON Input' : 'CSV Input');
  outputLabel = computed(() => {
    const m = this.mode();
    if (m === 'csv-json') return 'JSON Output';
    if (m === 'json-csv') return 'CSV Output';
    return 'XML Output';
  });
  inputPlaceholder = computed(() => this.mode() === 'json-csv' ? '[\n  {\n    "name": "Alice",\n    "age": "30"\n  }\n]' : 'name,age\nAlice,30\nBob,25');

  convert() {
    this.error.set('');
    if (!this.input.trim()) { this.output.set(''); this.stats.set(''); return; }
    try {
      const m = this.mode();
      if (m === 'csv-json') {
        const result = csvToJson(this.input, this.delim());
        this.output.set(result);
        const rows = parseCsv(this.input, this.delim());
        this.stats.set(`${rows.length - 1} rows · ${rows[0]?.length ?? 0} columns`);
      } else if (m === 'json-csv') {
        const result = jsonToCsv(this.input, this.delim());
        this.output.set(result);
        const data = JSON.parse(this.input);
        this.stats.set(`${data.length} rows · ${Object.keys(data[0] ?? {}).length} columns`);
      } else {
        const result = csvToXml(this.input, this.delim());
        this.output.set(result);
        const rows = parseCsv(this.input, this.delim());
        this.stats.set(`${rows.length - 1} rows · ${rows[0]?.length ?? 0} columns`);
      }
    } catch (e: any) {
      this.error.set('Error: ' + (e?.message ?? String(e)));
      this.output.set('');
    }
  }

  copyOut() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
