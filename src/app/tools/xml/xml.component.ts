import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function formatXml(xml: string, indentSize: number): string {
  const tab = ' '.repeat(indentSize);
  let result = '';
  let indent = 0;

  // Normalize line endings and split on tag boundaries
  const tokens = xml
    .replace(/>\s*</g, '><')
    .replace(/>\s*/g, '>')
    .replace(/\s*</g, '<')
    .split(/(?<=>)(?=<)/);

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Closing tag
    if (/^<\//.test(trimmed)) {
      indent = Math.max(0, indent - 1);
      result += tab.repeat(indent) + trimmed + '\n';
    }
    // Self-closing tag
    else if (/\/>$/.test(trimmed) || /^<\?/.test(trimmed) || /^<!/.test(trimmed)) {
      result += tab.repeat(indent) + trimmed + '\n';
    }
    // Opening tag with inline content (e.g. <tag>text</tag>)
    else if (/^<[^/][^>]*>[^<]+<\/[^>]+>$/.test(trimmed)) {
      result += tab.repeat(indent) + trimmed + '\n';
    }
    // Opening tag
    else if (/^<[^/]/.test(trimmed)) {
      result += tab.repeat(indent) + trimmed + '\n';
      indent++;
    }
    // Text node
    else {
      result += tab.repeat(indent) + trimmed + '\n';
    }
  }

  return result.trim();
}

function validateXml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml.trim(), 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    const msg = err.textContent ?? 'Invalid XML';
    return msg.replace(/\s+/g, ' ').trim();
  }
  return '';
}

@Component({
  selector: 'dt-tool-xml',
  standalone: true,
  imports: [TopbarComponent, IconComponent, FormsModule],
  template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'XML Formatter']" [toolId]="'xml'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="code" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">XML Formatter</div>
          <div style="font-size:12px;color:var(--text-muted)">Format and validate XML documents</div>
        </div>
        <div style="flex:1"></div>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted)">
          Indent
          <select [(ngModel)]="indentSize" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
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
          <textarea
            style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.5"
            [value]="inputVal()"
            (input)="onInput($event)"
            placeholder="Paste XML here…"
            spellcheck="false"
          ></textarea>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:6px">
            @if (error()) {
              <dt-icon name="alert-circle" [size]="12" [color]="'#e05252'" />
              <span style="font-size:11.5px;color:#e05252;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ error() }}</span>
            } @else if (inputVal().trim()) {
              <dt-icon name="check" [size]="12" [color]="'var(--teal)'" />
              <span style="font-size:11.5px;color:var(--teal)">Valid XML</span>
            }
          </div>
        </div>

        <!-- Output pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">OUTPUT</span>
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
              <span style="font-size:11.5px;color:var(--text-faint)">{{ lineNumbers().length }} lines · {{ outputBytes() }} bytes</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`],
})
export class XmlComponent {
  inputVal = signal('');
  indentSize = '2';
  copied = signal(false);

  error = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    return validateXml(raw);
  });

  output = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    const err = this.error();
    if (err) return raw;
    try {
      return formatXml(raw, Number(this.indentSize));
    } catch {
      return raw;
    }
  });

  lineNumbers = computed(() => {
    const out = this.output();
    if (!out) return [] as number[];
    return out.split('\n').map((_, i) => i + 1);
  });

  outputBytes = computed(() => new Blob([this.output()]).size);

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  minify() {
    const raw = this.inputVal().trim();
    if (!raw || this.error()) return;
    this.inputVal.set(raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim());
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
    input.accept = '.xml,text/xml,application/xml,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { this.inputVal.set(reader.result as string); };
      reader.readAsText(file);
    };
    input.click();
  }
}
