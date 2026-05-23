import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ── YAML → JS object parser ────────────────────────────────────────────────
function parseYaml(yaml: string): unknown {
  const lines = yaml.split('\n');
  return parseBlock(lines, 0, 0).value;
}

interface ParseResult { value: unknown; nextLine: number; }

function parseBlock(lines: string[], startLine: number, baseIndent: number): ParseResult {
  // Collect lines at this indent level
  const block: string[] = [];
  let i = startLine;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }
    const indent = line.length - trimmed.length;
    if (indent < baseIndent) break;
    block.push(line);
    i++;
  }

  // Detect list vs mapping vs scalar
  const firstNonEmpty = block.find(l => l.trim() && !l.trim().startsWith('#'));
  if (!firstNonEmpty) return { value: null, nextLine: i };

  const firstTrimmed = firstNonEmpty.trimStart();
  const firstIndent = firstNonEmpty.length - firstTrimmed.length;

  if (firstTrimmed.startsWith('- ')) {
    // Sequence
    const arr: unknown[] = [];
    let j = 0;
    while (j < block.length) {
      const line = block[j];
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith('#')) { j++; continue; }
      const indent = line.length - trimmed.length;
      if (indent !== firstIndent) { j++; continue; }
      if (trimmed.startsWith('- ')) {
        const rest = trimmed.slice(2).trim();
        if (!rest) {
          // Multi-line block item
          const subLines = [];
          j++;
          while (j < block.length) {
            const sub = block[j];
            const subTrimmed = sub.trimStart();
            if (!subTrimmed || subTrimmed.startsWith('#')) { j++; continue; }
            const subIndent = sub.length - subTrimmed.length;
            if (subIndent <= firstIndent) break;
            subLines.push(sub);
            j++;
          }
          arr.push(parseBlock(subLines, 0, firstIndent + 2).value);
        } else {
          arr.push(parseScalar(rest));
          j++;
        }
      } else {
        j++;
      }
    }
    return { value: arr, nextLine: startLine + block.length };
  } else {
    // Mapping
    const obj: Record<string, unknown> = {};
    let j = 0;
    while (j < block.length) {
      const line = block[j];
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith('#')) { j++; continue; }
      const indent = line.length - trimmed.length;
      if (indent !== firstIndent) { j++; continue; }
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) { j++; continue; }
      const key = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();
      if (!rest) {
        // Nested block
        const subLines: string[] = [];
        j++;
        while (j < block.length) {
          const sub = block[j];
          const subTrimmed = sub.trimStart();
          if (!subTrimmed || subTrimmed.startsWith('#')) { j++; continue; }
          const subIndent = sub.length - subTrimmed.length;
          if (subIndent <= firstIndent) break;
          subLines.push(sub);
          j++;
        }
        obj[key] = parseBlock(subLines, 0, firstIndent + 2).value;
      } else {
        obj[key] = parseScalar(rest);
        j++;
      }
    }
    return { value: obj, nextLine: startLine + block.length };
  }
}

function parseScalar(s: string): unknown {
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ── JS object → YAML serializer ───────────────────────────────────────────
function objToYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (/[:#\[\]{}&*!|>'"%@`]/.test(obj) || obj.includes('\n') || obj === '' || /^(true|false|null|~|\d.*)$/i.test(obj)) {
      return JSON.stringify(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(v => {
      const valStr = objToYaml(v, indent + 1);
      if (typeof v === 'object' && v !== null) {
        return `${pad}- \n${valStr}`;
      }
      return `${pad}- ${valStr}`;
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${objToYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${objToYaml(v, 0)}`;
    }).join('\n');
  }
  return String(obj);
}

function jsonToYaml(jsonStr: string): string {
  const obj = JSON.parse(jsonStr);
  return objToYaml(obj, 0);
}

@Component({
    selector: 'dt-tool-yaml',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'YAML / JSON Converter']" [toolId]="'yaml'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="code" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">YAML / JSON Converter</div>
          <div style="font-size:12px;color:var(--text-muted)">Convert between YAML and JSON formats</div>
        </div>
        <div style="flex:1"></div>

        <!-- Mode toggle -->
        <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button (click)="mode.set('yaml-to-json')"
            [style.background]="mode() === 'yaml-to-json' ? 'var(--maroon)' : 'var(--surface)'"
            [style.color]="mode() === 'yaml-to-json' ? '#fff' : 'var(--text-muted)'"
            style="height:28px;padding:0 12px;border:none;font-size:12.5px;font-weight:500;cursor:pointer">
            YAML → JSON
          </button>
          <button (click)="mode.set('json-to-yaml')"
            [style.background]="mode() === 'json-to-yaml' ? 'var(--maroon)' : 'var(--surface)'"
            [style.color]="mode() === 'json-to-yaml' ? '#fff' : 'var(--text-muted)'"
            style="height:28px;padding:0 12px;border:none;font-size:12.5px;font-weight:500;cursor:pointer">
            JSON → YAML
          </button>
        </div>

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
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">{{ mode() === 'yaml-to-json' ? 'YAML INPUT' : 'JSON INPUT' }}</span>
          </div>
          <textarea
            style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.5"
            [value]="inputVal()"
            (input)="onInput($event)"
            [placeholder]="mode() === 'yaml-to-json' ? 'Paste YAML here…' : 'Paste JSON here…'"
            spellcheck="false"
          ></textarea>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:6px">
            @if (error()) {
              <dt-icon name="alert-circle" [size]="12" [color]="'#e05252'" />
              <span style="font-size:11.5px;color:#e05252;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ error() }}</span>
            } @else if (inputVal().trim() && output()) {
              <dt-icon name="check" [size]="12" [color]="'var(--teal)'" />
              <span style="font-size:11.5px;color:var(--teal)">Converted</span>
            }
          </div>
        </div>

        <!-- Output pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">{{ mode() === 'yaml-to-json' ? 'JSON OUTPUT' : 'YAML OUTPUT' }}</span>
          </div>
          <pre style="flex:1;overflow:auto;margin:0;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);white-space:pre-wrap;word-break:break-all;line-height:1.5">{{ output() }}</pre>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0">
            @if (output()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ output().split('\n').length }} lines</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`]
})
export class YamlComponent {
  inputVal = signal('');
  mode = signal<'yaml-to-json' | 'json-to-yaml'>('yaml-to-json');
  copied = signal(false);

  error = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    try {
      if (this.mode() === 'yaml-to-json') {
        parseYaml(raw);
      } else {
        JSON.parse(raw);
      }
      return '';
    } catch (e: unknown) {
      return e instanceof Error ? e.message : String(e);
    }
  });

  output = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw || this.error()) return '';
    try {
      if (this.mode() === 'yaml-to-json') {
        const parsed = parseYaml(raw);
        return JSON.stringify(parsed, null, 2);
      } else {
        return jsonToYaml(raw);
      }
    } catch (e: unknown) {
      return '';
    }
  });

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  async copy() {
    const out = this.output();
    if (!out) return;
    await navigator.clipboard.writeText(out);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
