import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
  selector: 'dt-tool-json',
  standalone: true,
  imports: [TopbarComponent, IconComponent, FormsModule],
  template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'JSON Formatter']" [toolId]="'json'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="braces" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">JSON Formatter</div>
          <div style="font-size:12px;color:var(--text-muted)">Format, validate and minify JSON</div>
        </div>
        <div style="flex:1"></div>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted)">
          Indent
          <select [(ngModel)]="indent" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
          <input type="checkbox" [(ngModel)]="sortKeys" style="accent-color:var(--teal);cursor:pointer" />
          Sort keys
        </label>

        <button (click)="minify()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          Minify
        </button>

        <button (click)="copy()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none">
          <dt-icon name="copy" [size]="13" [color]="'#fff'" />
          {{ copied() ? 'Copied!' : 'Copy' }}
        </button>

        <button (click)="openFile()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          <dt-icon name="upload" [size]="13" />
          Open
        </button>
      </div>

      <!-- Two-pane body -->
      <div style="flex:1;min-height:0;display:flex;overflow:hidden">

        <!-- Input pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border)">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">INPUT</span>
          </div>

          @if (!hasInput()) {
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--surface);padding:32px;cursor:text" (click)="focusInput()">
              <div style="font-size:32px;opacity:0.25;line-height:1">&#123; &#125;</div>
              <div style="text-align:center">
                <div style="font-size:13px;font-weight:500;color:var(--text-muted)">Paste JSON here</div>
                <div style="font-size:12px;color:var(--text-faint);margin-top:4px">⌘V to paste from clipboard</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                <button (click)="$event.stopPropagation();loadSample('object')" style="background:var(--surface-muted);color:var(--text-muted);border:1px solid var(--border);height:26px;padding:0 10px;border-radius:6px;font-size:12px;cursor:pointer">Sample object</button>
                <button (click)="$event.stopPropagation();loadSample('array')" style="background:var(--surface-muted);color:var(--text-muted);border:1px solid var(--border);height:26px;padding:0 10px;border-radius:6px;font-size:12px;cursor:pointer">Sample array</button>
              </div>
            </div>
            <!-- hidden textarea to allow paste -->
            <textarea #hiddenInput style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px" (paste)="onPaste($event)"></textarea>
          } @else {
            <textarea
              style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.5"
              [value]="inputVal()"
              (input)="onInput($event)"
              placeholder="Paste JSON here…"
              spellcheck="false"
            ></textarea>
          }

          <!-- Footer -->
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:6px">
            @if (error()) {
              <dt-icon name="alert-circle" [size]="12" [color]="'#e05252'" />
              <span style="font-size:11.5px;color:#e05252;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ error() }}</span>
            } @else if (hasInput()) {
              <dt-icon name="check" [size]="12" [color]="'var(--teal)'" />
              <span style="font-size:11.5px;color:var(--teal)">Valid JSON</span>
              <span style="font-size:11.5px;color:var(--text-faint);margin-left:6px">{{ inputBytes() }} bytes</span>
            }
          </div>
        </div>

        <!-- Output pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">OUTPUT</span>
          </div>
          <div style="flex:1;display:flex;min-height:0;overflow:hidden;background:var(--surface)">
            <!-- Line numbers -->
            @if (output()) {
              <div style="padding:14px 8px 14px 10px;font-family:var(--font-mono);font-size:12.5px;color:var(--text-faint);user-select:none;text-align:right;overflow:hidden;line-height:1.5;background:var(--surface-muted);border-right:1px solid var(--border);min-width:36px;flex-shrink:0">
                @for (n of lineNumbers(); track n) {
                  <div>{{ n }}</div>
                }
              </div>
            }
            <pre style="flex:1;overflow:auto;margin:0;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);white-space:pre-wrap;word-break:break-all;line-height:1.5">{{ output() }}</pre>
          </div>
          <!-- Footer -->
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:8px">
            @if (output()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ outputLines() }} lines · {{ outputBytes() }} bytes</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`],
})
export class JsonComponent {
  inputVal = signal('');
  indent = '2';
  sortKeys = false;
  copied = signal(false);

  hasInput = computed(() => this.inputVal().trim().length > 0);

  output = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    try {
      let parsed = JSON.parse(raw);
      if (this.sortKeys) parsed = this.deepSort(parsed);
      const ind = this.indent === 'tab' ? '\t' : Number(this.indent);
      return JSON.stringify(parsed, null, ind);
    } catch {
      return raw;
    }
  });

  error = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    try { JSON.parse(raw); return ''; }
    catch (e: unknown) { return 'Parse error: ' + (e instanceof Error ? e.message : String(e)); }
  });

  lineNumbers = computed(() => {
    const out = this.output();
    if (!out) return [] as number[];
    return out.split('\n').map((_, i) => i + 1);
  });

  outputLines = computed(() => this.output() ? this.output().split('\n').length : 0);
  outputBytes = computed(() => new Blob([this.output()]).size);
  inputBytes = computed(() => new Blob([this.inputVal()]).size);

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    if (text) { this.inputVal.set(text); e.preventDefault(); }
  }

  focusInput() {
    const el = document.querySelector('textarea[style*="opacity:0"]') as HTMLTextAreaElement | null;
    el?.focus();
  }

  deepSort(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(v => this.deepSort(v));
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj as Record<string, unknown>).sort()
        .reduce((acc: Record<string, unknown>, k) => {
          acc[k] = this.deepSort((obj as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return obj;
  }

  minify() {
    const raw = this.inputVal().trim();
    if (!raw) return;
    try { this.inputVal.set(JSON.stringify(JSON.parse(raw))); } catch { /* ignore */ }
  }

  async copy() {
    const out = this.output();
    if (!out) return;
    await navigator.clipboard.writeText(out);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { this.inputVal.set(reader.result as string); };
      reader.readAsText(file);
    };
    input.click();
  }

  loadSample(type: 'object' | 'array') {
    if (type === 'object') {
      this.inputVal.set(`{"name":"Alice","age":30,"address":{"city":"New York","zip":"10001"},"tags":["developer","designer"],"active":true}`);
    } else {
      this.inputVal.set(`[{"id":1,"name":"Item One","price":9.99,"active":true},{"id":2,"name":"Item Two","price":19.99,"active":false}]`);
    }
  }
}
