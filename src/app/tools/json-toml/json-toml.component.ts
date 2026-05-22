import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ---- JSON -> TOML serializer ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TomlValue = any;

function jsonToToml(obj: Record<string, TomlValue>, prefix = ''): string {
  const lines: string[] = [];
  const tables: Array<{ key: string; val: Record<string, TomlValue> }> = [];
  const arrayTables: Array<{ key: string; val: Record<string, TomlValue>[] }> = [];

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v === null) { lines.push(`${k} = "null"`); }
    else if (typeof v === 'boolean') { lines.push(`${k} = ${v}`); }
    else if (typeof v === 'number') { lines.push(`${k} = ${v}`); }
    else if (typeof v === 'string') {
      const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      lines.push(`${k} = "${escaped}"`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${k} = []`); }
      else if (v.every(x => typeof x !== 'object' || x === null)) {
        const items = v.map(x => x === null ? '"null"' : typeof x === 'string' ? `"${x.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : String(x));
        lines.push(`${k} = [${items.join(', ')}]`);
      } else if (v.every(x => x !== null && typeof x === 'object' && !Array.isArray(x))) {
        arrayTables.push({ key: fullKey, val: v as Record<string, TomlValue>[] });
      } else {
        lines.push(`${k} = []  # mixed array not fully supported`);
      }
    } else if (typeof v === 'object') {
      tables.push({ key: fullKey, val: v as Record<string, TomlValue> });
    }
  }

  const result: string[] = [];
  if (lines.length) result.push(lines.join('\n'));

  for (const { key, val } of tables) {
    result.push(`\n[${key}]`);
    result.push(jsonToToml(val, key).replace(new RegExp(`^\\[${key.replace('.', '\\.')}\\.`, 'gm'), '['));
  }

  for (const { key, val } of arrayTables) {
    for (const item of val) {
      result.push(`\n[[${key}]]`);
      result.push(jsonToToml(item as Record<string, TomlValue>, key));
    }
  }

  return result.filter(Boolean).join('\n');
}

// ---- TOML -> JSON parser ----
function tomlToJson(text: string): unknown {
  const lines = text.split('\n');
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> = root;
  let currentPath: string[] = [];
  let arrayTableCounters: Record<string, number> = {};

  function setPath(obj: Record<string, unknown>, parts: string[], val: unknown): void {
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in cur)) cur[parts[i]] = {};
      const next = cur[parts[i]];
      if (Array.isArray(next)) cur = next[next.length - 1] as Record<string, unknown>;
      else cur = next as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = val;
  }

  function getPath(obj: Record<string, unknown>, parts: string[]): Record<string, unknown> {
    let cur: Record<string, unknown> = obj;
    for (const p of parts) {
      if (Array.isArray(cur[p])) {
        const arr = cur[p] as Record<string, unknown>[];
        cur = arr[arr.length - 1];
      } else {
        if (!(p in cur)) cur[p] = {};
        cur = cur[p] as Record<string, unknown>;
      }
    }
    return cur;
  }

  function parseValue(s: string): unknown {
    s = s.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === '') return '';
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (s.startsWith('[')) {
      const inner = s.slice(1, s.lastIndexOf(']')).trim();
      if (!inner) return [];
      return inner.split(',').map(x => parseValue(x.trim()));
    }
    const n = Number(s);
    if (!isNaN(n) && s !== '') return n;
    return s;
  }

  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    i++;
    if (!line || line.startsWith('#')) continue;
    const commentIdx = line.indexOf(' #');
    if (commentIdx > 0) line = line.slice(0, commentIdx).trim();

    if (line.startsWith('[[') && line.endsWith(']]')) {
      const key = line.slice(2, -2).trim();
      const parts = key.split('.');
      const topKey = parts[0];
      if (!(topKey in root)) root[topKey] = [];
      const arr = root[topKey] as Record<string, unknown>[];
      const newEntry: Record<string, unknown> = {};
      arr.push(newEntry);
      if (parts.length === 1) current = newEntry;
      else current = getPath(newEntry, parts.slice(1));
      currentPath = parts;
    } else if (line.startsWith('[') && line.endsWith(']')) {
      const key = line.slice(1, -1).trim();
      currentPath = key.split('.');
      current = getPath(root, currentPath);
    } else if (line.includes('=')) {
      const eq = line.indexOf('=');
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      current[key] = parseValue(val);
    }
  }

  return root;
}

@Component({
  selector: 'dt-tool-json-toml',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Data Transform', 'JSON ↔ TOML']" [toolId]="'json-toml'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="code-bracket" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">JSON ↔ TOML</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert between JSON and TOML configuration formats</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="toggleDirection()"
      style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 14px;font-size:12.5px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:6px">
      <dt-icon name="arrow-path" [size]="13" color="var(--text-muted)" />
      {{ direction() === 'json-toml' ? 'JSON → TOML' : 'TOML → JSON' }}
    </button>
  </div>

  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0;overflow:hidden">
    <!-- Left -->
    <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">
        {{ direction() === 'json-toml' ? 'JSON Input' : 'TOML Input' }}
      </div>
      <textarea [(ngModel)]="leftText" (ngModelChange)="convert()"
        [placeholder]="leftPlaceholder()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
    <!-- Right -->
    <div style="display:flex;flex-direction:column;min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;gap:6px">
        {{ direction() === 'json-toml' ? 'TOML Output' : 'JSON Output' }}
        <div style="flex:1"></div>
        @if (rightText()) {
          <button (click)="copyOut()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      @if (error()) {
        <div style="margin:10px;padding:8px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:12px">{{ error() }}</div>
      }
      <textarea readonly [value]="rightText()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
  </div>
</div>
`,
})
export class JsonTomlComponent {
  direction = signal<'json-toml' | 'toml-json'>('json-toml');
  leftText = '';
  rightText = signal('');
  error = signal('');
  copied = signal(false);

  leftPlaceholder = computed(() =>
    this.direction() === 'json-toml'
      ? '{\n  "name": "my-app",\n  "version": "1.0.0"\n}'
      : '[package]\nname = "my-app"\nversion = "1.0.0"'
  );

  toggleDirection() {
    const prev = this.rightText();
    this.direction.update(d => d === 'json-toml' ? 'toml-json' : 'json-toml');
    this.leftText = prev;
    this.convert();
  }

  convert() {
    this.error.set('');
    if (!this.leftText.trim()) { this.rightText.set(''); return; }
    try {
      if (this.direction() === 'json-toml') {
        const obj = JSON.parse(this.leftText);
        this.rightText.set(jsonToToml(obj));
      } else {
        const obj = tomlToJson(this.leftText);
        this.rightText.set(JSON.stringify(obj, null, 2));
      }
    } catch (e: any) {
      this.error.set('Error: ' + (e?.message ?? String(e)));
      this.rightText.set('');
    }
  }

  copyOut() {
    navigator.clipboard.writeText(this.rightText()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
