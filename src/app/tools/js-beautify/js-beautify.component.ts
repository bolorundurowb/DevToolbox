import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { js as beautifyJs, css as beautifyCss, html as beautifyHtml } from 'js-beautify';

type BeautifyMode = 'js' | 'css' | 'html';

const MODE_LABELS: Record<BeautifyMode, string> = {
  js: 'JS / TS',
  css: 'CSS',
  html: 'HTML',
};

const SAMPLES: Record<BeautifyMode, string> = {
  js: `function greet(name){if(!name){return 'Hello, World!';}const msg = 'Hello, '+name+'!';console.log(msg);return msg;}const arr=[1,2,3].map(x=>x*2).filter(x=>x>2);`,
  css: `.container{display:flex;flex-direction:column;gap:16px;padding:24px 32px;background-color:#fff;border:1px solid #e2e8f0;border-radius:8px;}.title{font-size:24px;font-weight:700;color:#1a202c;}`,
  html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Page</title></head><body><div class="container"><h1>Hello</h1><p>World</p></div></body></html>`,
};

@Component({
    selector: 'dt-tool-js-beautify',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Code Beautifier']" [toolId]="'js'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="code" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Code Beautifier</div>
          <div style="font-size:12px;color:var(--text-muted)">Format JS/TS, CSS and HTML</div>
        </div>
        <div style="flex:1"></div>

        <!-- Mode selector -->
        <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          @for (entry of modeEntries; track entry[0]) {
            <button (click)="mode.set(entry[0])"
              [style.background]="mode() === entry[0] ? 'var(--maroon)' : 'var(--surface)'"
              [style.color]="mode() === entry[0] ? '#fff' : 'var(--text-muted)'"
              style="height:28px;padding:0 12px;border:none;font-size:12.5px;font-weight:500;cursor:pointer">
              {{ entry[1] }}
            </button>
          }
        </div>

        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted)">
          Indent
          <select [(ngModel)]="indentSize" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
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
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">INPUT</span>
          </div>
          <textarea
            style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.5"
            [value]="inputVal()"
            (input)="onInput($event)"
            [placeholder]="'Paste ' + modeLabelCurrent() + ' code here…'"
            spellcheck="false"
          ></textarea>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0">
            @if (inputVal().trim()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ inputVal().trim().length }} chars in</span>
            }
          </div>
        </div>

        <!-- Output pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">FORMATTED</span>
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
              <span style="font-size:11.5px;color:var(--text-faint)">{{ lineNumbers().length }} lines · {{ output().length }} chars</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`]
})
export class JsBeautifyComponent {
  inputVal = signal('');
  mode = signal<BeautifyMode>('js');
  indentSize = '2';
  copied = signal(false);

  modeEntries = Object.entries(MODE_LABELS) as [BeautifyMode, string][];
  modeLabelCurrent = computed(() => MODE_LABELS[this.mode()]);

  output = computed(() => {
    const raw = this.inputVal().trim();
    if (!raw) return '';
    const indent = Number(this.indentSize);
    const opts = { indent_size: indent, preserve_newlines: true };
    try {
      switch (this.mode()) {
        case 'js': return beautifyJs(raw, opts);
        case 'css': return beautifyCss(raw, opts);
        case 'html': return beautifyHtml(raw, { ...opts, indent_inner_html: true });
      }
    } catch { return raw; }
  });

  lineNumbers = computed(() => {
    const out = this.output();
    if (!out) return [] as number[];
    return out.split('\n').map((_, i) => i + 1);
  });

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  loadSample() {
    this.inputVal.set(SAMPLES[this.mode()]);
  }

  async copy() {
    const out = this.output();
    if (!out) return;
    await navigator.clipboard.writeText(out);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
