import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

const EMAIL_RE = /^[^@]+@[^@]+\.[^@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URI_RE = /^https?:\/\//;

function inferStringFormat(val: string): string | null {
  if (EMAIL_RE.test(val)) return 'email';
  if (DATE_RE.test(val)) return 'date';
  if (URI_RE.test(val)) return 'uri';
  return null;
}

interface GenOptions {
  includeRequired: boolean;
  inferFormats: boolean;
}

function getType(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function generateSchema(val: unknown, opts: GenOptions, depth = 0): Record<string, unknown> {
  if (val === null) return { type: 'null' };
  if (Array.isArray(val)) {
    if (val.length === 0) return { type: 'array', items: {} };
    const types = Array.from(new Set(val.map(getType)));
    if (types.length === 1) {
      return { type: 'array', items: generateSchema(val[0], opts, depth + 1) };
    }
    return { type: 'array', items: { oneOf: types.map(t => ({ type: t })) } };
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      props[k] = generateSchema(v, opts, depth + 1);
    }
    const schema: Record<string, unknown> = { type: 'object', properties: props };
    if (opts.includeRequired && Object.keys(props).length > 0) {
      schema['required'] = Object.keys(props);
    }
    return schema;
  }
  if (typeof val === 'string') {
    const s: Record<string, unknown> = { type: 'string' };
    if (opts.inferFormats) {
      const fmt = inferStringFormat(val);
      if (fmt) s['format'] = fmt;
    }
    return s;
  }
  if (typeof val === 'number') {
    return { type: Number.isInteger(val) ? 'integer' : 'number' };
  }
  return { type: typeof val };
}

function countProps(schema: Record<string, unknown>, depth = 0): { props: number; depth: number; types: Set<string> } {
  let props = 0;
  let maxDepth = depth;
  const types = new Set<string>();
  if (schema['type']) types.add(String(schema['type']));
  if (schema['properties']) {
    const p = schema['properties'] as Record<string, Record<string, unknown>>;
    for (const v of Object.values(p)) {
      props++;
      const sub = countProps(v, depth + 1);
      props += sub.props;
      if (sub.depth > maxDepth) maxDepth = sub.depth;
      sub.types.forEach(t => types.add(t));
    }
  }
  return { props, depth: maxDepth, types };
}

@Component({
  selector: 'dt-tool-json-schema',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Data Transform', 'JSON Schema Generator']" [toolId]="'json-schema'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="document" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">JSON Schema Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate Draft-07 JSON Schema from a sample JSON</div>
    </div>
  </div>

  <!-- Options -->
  <div style="display:flex;align-items:center;gap:16px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="includeRequired" (ngModelChange)="generate()" /> Include required
    </label>
    <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="inferFormats" (ngModelChange)="generate()" /> Infer formats (email, date, uri)
    </label>
    @if (stats()) {
      <span style="font-size:11.5px;color:var(--text-faint);margin-left:auto">{{ stats() }}</span>
    }
  </div>

  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0;overflow:hidden">
    <!-- Input -->
    <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">Sample JSON</div>
      <textarea [(ngModel)]="input" (ngModelChange)="generate()"
        placeholder='{"name":"Alice","age":30,"email":"alice@example.com"}'
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
    <!-- Output -->
    <div style="display:flex;flex-direction:column;min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;gap:6px">
        JSON Schema (Draft-07)
        <div style="flex:1"></div>
        @if (schema()) {
          <button (click)="copyOut()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      @if (error()) {
        <div style="margin:10px;padding:8px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:12px">{{ error() }}</div>
      }
      <textarea readonly [value]="schema()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
  </div>
</div>
`,
})
export class JsonSchemaComponent {
  input = '';
  includeRequired = true;
  inferFormats = true;
  schema = signal('');
  error = signal('');
  stats = signal('');
  copied = signal(false);

  generate() {
    this.error.set('');
    if (!this.input.trim()) { this.schema.set(''); this.stats.set(''); return; }
    try {
      const val = JSON.parse(this.input);
      const opts: GenOptions = { includeRequired: this.includeRequired, inferFormats: this.inferFormats };
      const s = generateSchema(val, opts);
      const full = { $schema: 'http://json-schema.org/draft-07/schema#', ...s };
      this.schema.set(JSON.stringify(full, null, 2));
      const info = countProps(s);
      this.stats.set(`${info.props} properties · depth ${info.depth} · types: ${Array.from(info.types).join(', ')}`);
    } catch (e: any) {
      this.error.set('Invalid JSON: ' + (e?.message ?? String(e)));
      this.schema.set('');
    }
  }

  copyOut() {
    navigator.clipboard.writeText(this.schema()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
