import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { CodeEditorComponent } from '../../core/components/code-editor/code-editor.component';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <!-- Sample SVG with metadata -->
  <metadata>Created with Inkscape</metadata>
  <g id="layer1" style="">
    <g id="g1">
      <circle cx="50" cy="50" r="40" fill="#e63946" stroke="#000" stroke-width="2"/>
      <text x="50" y="55" text-anchor="middle" fill="#fff" font-size="16">Hello</text>
    </g>
  </g>
</svg>`;

@Component({
    selector: 'dt-tool-svg-optimizer',
    imports: [FormsModule, TopbarComponent, IconComponent, CodeEditorComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Images', 'SVG Optimizer']" [toolId]="'svg-opt'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="svg" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">SVG Optimizer</div>
      <div style="font-size:12px;color:var(--text-muted)">Minify and clean SVG files using SVGO</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="optimize()" [style.opacity]="!inputSvg().trim() ? '0.45' : '1'"
      style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="rocket" [size]="12" color="#fff" /> Optimize
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left: input + output -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">

      <!-- Toolbar -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <label style="cursor:pointer">
          <input type="file" accept=".svg,image/svg+xml" style="display:none" (change)="onFileInput($event)" />
          <span style="font-size:12px;color:var(--text-muted);background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer">
            Upload SVG
          </span>
        </label>
        <button (click)="loadSample()" style="font-size:12px;color:var(--text-muted);background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer">
          Load sample
        </button>
        <button (click)="clearAll()" style="font-size:12px;color:var(--text-muted);background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer">
          Clear
        </button>
        @if (outputSvg()) {
          <div style="flex:1"></div>
          <span [style.color]="savingPct() > 0 ? 'var(--teal)' : 'var(--text-muted)'"
            style="font-size:12px;font-weight:600">
            {{ formatSize(originalSize()) }} &rarr; {{ formatSize(optimizedSize()) }}
            ({{ savingPct() > 0 ? '-' : '+' }}{{ Math.abs(savingPct()) }}% {{ savingPct() > 0 ? 'smaller' : 'larger' }})
          </span>
        }
      </div>

      <!-- Two-pane: input / output -->
      <div style="flex:1;min-height:0;display:flex;gap:0">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border)">
          <div style="padding:8px 12px;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            Input SVG
            @if (originalSize()) {
              <span style="background:var(--surface-muted);padding:1px 7px;border-radius:10px;font-weight:400">{{ formatSize(originalSize()) }}</span>
            }
          </div>
          <dt-code-editor language="xml" style="flex:1;min-height:0" [value]="inputSvg()" (valueChange)="inputSvg.set($event)" />
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column">
          <div style="padding:8px 12px;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            Optimized SVG
            @if (optimizedSize()) {
              <span style="background:var(--teal-soft);color:var(--teal-ink);padding:1px 7px;border-radius:10px;font-weight:400">{{ formatSize(optimizedSize()) }}</span>
            }
            <div style="flex:1"></div>
            @if (outputSvg()) {
              <button (click)="copyOutput()" style="font-size:11px;background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;cursor:pointer;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px">
                <dt-icon [name]="copied() ? 'check' : 'copy'" [size]="11" color="var(--text-muted)" />
                {{ copied() ? 'Copied!' : 'Copy' }}
              </button>
              <button (click)="downloadOutput()" style="font-size:11px;background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;cursor:pointer;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px">
                <dt-icon name="download" [size]="11" color="var(--text-muted)" /> Download
              </button>
            }
          </div>
          @if (outputSvg()) {
            <dt-code-editor language="xml" style="flex:1;min-height:0" [value]="outputSvg()" [readOnly]="true" />
          } @else if (errorMsg()) {
            <div style="flex:1;padding:16px;font-size:12.5px;color:#e05">{{ errorMsg() }}</div>
          } @else {
            <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-faint)">Output will appear here</div>
          }
        </div>
      </div>
    </div>

    <!-- Right: options + preview -->
    <div style="width:240px;flex-shrink:0;overflow-y:auto;padding:16px;border-left:1px solid var(--border);display:flex;flex-direction:column;gap:16px">

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Options</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (opt of options; track opt.key) {
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;color:var(--text)">
              <input type="checkbox" [(ngModel)]="opt.enabled" style="accent-color:var(--maroon)" />
              {{ opt.label }}
            </label>
          }
        </div>
      </div>

      @if (outputSvg()) {
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Preview</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;align-items:center;justify-content:center;min-height:100px"
            [innerHTML]="previewHtml()">
          </div>
        </div>
      }

      @if (outputSvg()) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Stats</div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Original</span><span>{{ formatSize(originalSize()) }}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Optimized</span><span style="color:var(--teal)">{{ formatSize(optimizedSize()) }}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Savings</span>
              <span [style.color]="savingPct() > 0 ? 'var(--teal)' : '#e05'">{{ savingPct() > 0 ? '-' : '+' }}{{ Math.abs(savingPct()) }}%</span>
            </div>
          </div>
        </div>
      }

    </div>
  </div>
</div>
`
})
export class SvgOptimizerComponent {
  private sanitizer = inject(DomSanitizer);

  inputSvg = signal('');
  outputSvg = signal('');
  originalSize = signal(0);
  optimizedSize = signal(0);
  errorMsg = signal('');
  copied = signal(false);

  Math = Math;

  options = [
    { key: 'removeMetadata', label: 'Remove metadata', enabled: true },
    { key: 'collapseGroups', label: 'Collapse groups', enabled: true },
    { key: 'removeHidden', label: 'Remove hidden elements', enabled: true },
    { key: 'cleanIDs', label: 'Clean IDs', enabled: false },
    { key: 'multipass', label: 'Multipass', enabled: true },
  ];

  savingPct(): number {
    if (!this.originalSize()) return 0;
    return Math.round((1 - this.optimizedSize() / this.originalSize()) * 100);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  previewHtml(): SafeHtml {
    const svg = this.outputSvg();
    const clean = svg.replace(/<\?xml[^>]*\?>/i, '').trim();
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }

  loadSample() { this.inputSvg.set(SAMPLE_SVG); }
  clearAll() { this.inputSvg.set(''); this.outputSvg.set(''); this.errorMsg.set(''); }

  onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.inputSvg.set(reader.result as string);
    };
    reader.readAsText(file);
  }

  optimize() {
    const svg = this.inputSvg().trim();
    if (!svg) return;
    this.errorMsg.set('');
    this.originalSize.set(new Blob([svg]).size);

    import('svgo/browser').then(({ optimize }) => {
      try {
        const opts: Record<string, unknown> = {
          multipass: this.options.find(o => o.key === 'multipass')?.enabled ?? true,
          plugins: [
            'preset-default',
            ...(this.options.find(o => o.key === 'removeMetadata')?.enabled ? ['removeMetadata'] : []),
            ...(this.options.find(o => o.key === 'collapseGroups')?.enabled ? ['collapseGroups'] : []),
            ...(this.options.find(o => o.key === 'removeHidden')?.enabled ? ['removeHiddenElems'] : []),
            ...(this.options.find(o => o.key === 'cleanIDs')?.enabled ? ['cleanIds'] : []),
          ],
        };
        const result = optimize(svg, opts as Parameters<typeof optimize>[1]);
        this.outputSvg.set(result.data);
        this.optimizedSize.set(new Blob([result.data]).size);
      } catch (err) {
        this.errorMsg.set(String(err));
      }
    }).catch(() => {
      // Fallback: simple minification without svgo
      try {
        let out = svg
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\s+/g, ' ')
          .replace(/> </g, '><')
          .trim();
        if (this.options.find(o => o.key === 'removeMetadata')?.enabled) {
          out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
        }
        this.outputSvg.set(out);
        this.optimizedSize.set(new Blob([out]).size);
      } catch (err2) {
        this.errorMsg.set('Optimization failed: ' + String(err2));
      }
    });
  }

  copyOutput() {
    navigator.clipboard.writeText(this.outputSvg()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  downloadOutput() {
    const blob = new Blob([this.outputSvg()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'optimized.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
