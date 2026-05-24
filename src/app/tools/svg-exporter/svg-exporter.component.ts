import { Component, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { CodeEditorComponent } from '../../core/components/code-editor/code-editor.component';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5b3a8a"/>
      <stop offset="100%" stop-color="#1c4a4f"/>
    </linearGradient>
  </defs>
  <rect width="320" height="180" rx="24" fill="url(#g)"/>
  <circle cx="82" cy="88" r="42" fill="rgba(255,255,255,.18)"/>
  <text x="160" y="100" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="28" font-weight="700">Dev Core Tools</text>
</svg>`;

type ExportFormat = 'PNG' | 'JPEG';

@Component({
  selector: 'dt-tool-svg-exporter',
  imports: [FormsModule, TopbarComponent, IconComponent, CodeEditorComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Images', 'SVG Exporter']" [toolId]="'svg-export'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="svg" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">SVG Exporter</div>
      <div style="font-size:12px;color:var(--text-muted)">Preview SVG content and export it as PNG or JPEG</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="exportImage()" [disabled]="!svgText().trim()"
      [style.opacity]="!svgText().trim() ? '0.45' : '1'"
      style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="download" [size]="12" color="#fff" /> Export {{ format() }}
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden">
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
        @if (detectedSize()) {
          <span style="font-size:12px;color:var(--text-muted);margin-left:auto">Detected: {{ detectedSize() }}</span>
        }
      </div>

      <dt-code-editor language="xml" style="flex:1;min-height:0" [(value)]="svgModel" (valueChange)="onSvgChange($event)" />
    </div>

    <div style="width:360px;flex-shrink:0;display:flex;flex-direction:column;min-height:0">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Output Format</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            @for (fmt of formats; track fmt) {
              <button (click)="format.set(fmt)"
                [style.background]="format() === fmt ? 'var(--maroon)' : 'var(--surface)'"
                [style.color]="format() === fmt ? '#fff' : 'var(--text)'"
                [style.border-color]="format() === fmt ? 'var(--maroon)' : 'var(--border)'"
                style="padding:8px;border-radius:7px;border:1px solid;font-size:13px;font-weight:600;cursor:pointer">
                {{ fmt }}
              </button>
            }
          </div>
        </div>

        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Size</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-muted)">
              Width
              <input type="number" min="1" [(ngModel)]="exportWidth" (ngModelChange)="onWidthChange($event)"
                style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;background:var(--surface);color:var(--text)" />
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-muted)">
              Height
              <input type="number" min="1" [(ngModel)]="exportHeight" (ngModelChange)="onHeightChange($event)"
                style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;background:var(--surface);color:var(--text)" />
            </label>
          </div>
          <label style="margin-top:8px;display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-muted);cursor:pointer">
            <input type="checkbox" [(ngModel)]="lockAspect" style="accent-color:var(--maroon)" />
            Lock aspect ratio
          </label>
        </div>

        @if (format() === 'JPEG') {
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">JPEG Options</div>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-muted);margin-bottom:8px">
              Quality: {{ quality() }}%
              <input type="range" min="1" max="100" [value]="quality()" (input)="quality.set(+$any($event.target).value)" style="width:100%;accent-color:var(--maroon)" />
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-muted)">
              Background
              <input type="color" [(ngModel)]="jpegBackground" style="width:42px;height:28px;padding:0;border:1px solid var(--border);border-radius:5px;background:var(--surface)" />
            </label>
          </div>
        }
      </div>

      <div style="flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Preview</div>
        <div style="flex:1;min-height:180px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:center;overflow:auto">
          @if (previewUrl()) {
            <img [src]="previewUrl()!" alt="SVG preview"
              style="max-width:100%;max-height:100%;object-fit:contain;display:block" />
          } @else {
            <div style="font-size:13px;color:var(--text-faint);text-align:center">Paste or upload SVG content to preview it</div>
          }
        </div>
        @if (errorMsg()) {
          <div style="font-size:12px;color:#e05;background:rgba(224,0,85,.08);border:1px solid rgba(224,0,85,.18);border-radius:8px;padding:8px 10px">{{ errorMsg() }}</div>
        }
        @if (exportedInfo()) {
          <div style="font-size:12px;color:var(--teal);background:var(--teal-soft);border:1px solid rgba(28,74,79,.18);border-radius:8px;padding:8px 10px">{{ exportedInfo() }}</div>
        }
      </div>
    </div>
  </div>
</div>
`
})
export class SvgExporterComponent implements OnDestroy {
  readonly formats: ExportFormat[] = ['PNG', 'JPEG'];
  readonly svgText = signal('');
  readonly previewUrl = signal<string | null>(null);
  readonly detectedSize = signal('');
  readonly errorMsg = signal('');
  readonly exportedInfo = signal('');
  readonly format = signal<ExportFormat>('PNG');
  readonly quality = signal(92);

  svgModel = '';
  exportWidth = 320;
  exportHeight = 180;
  lockAspect = true;
  jpegBackground = '#ffffff';
  private aspectRatio = 16 / 9;

  loadSample(): void {
    this.svgModel = SAMPLE_SVG;
    this.onSvgChange(SAMPLE_SVG);
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  clearAll(): void {
    this.revokePreview();
    this.svgModel = '';
    this.svgText.set('');
    this.previewUrl.set(null);
    this.detectedSize.set('');
    this.errorMsg.set('');
    this.exportedInfo.set('');
  }

  onSvgChange(value: string): void {
    this.svgText.set(value);
    this.errorMsg.set('');
    this.exportedInfo.set('');
    const svg = value.trim();

    if (!svg) {
      this.revokePreview();
      this.previewUrl.set(null);
      this.detectedSize.set('');
      return;
    }

    const dimensions = this.readSvgDimensions(svg);
    if (!dimensions) {
      this.revokePreview();
      this.previewUrl.set(null);
      this.detectedSize.set('');
      this.errorMsg.set('Enter valid SVG markup before exporting.');
      return;
    }

    this.exportWidth = dimensions.width;
    this.exportHeight = dimensions.height;
    this.aspectRatio = dimensions.width / dimensions.height;
    this.detectedSize.set(`${dimensions.width} x ${dimensions.height}`);

    this.revokePreview();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    this.previewUrl.set(URL.createObjectURL(blob));
  }

  private revokePreview(): void {
    const old = this.previewUrl();
    if (old) URL.revokeObjectURL(old);
  }

  onFileInput(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      this.svgModel = text;
      this.onSvgChange(text);
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  onWidthChange(value: number): void {
    const width = Math.max(1, Number(value) || 1);
    this.exportWidth = width;
    if (this.lockAspect) this.exportHeight = Math.max(1, Math.round(width / this.aspectRatio));
  }

  onHeightChange(value: number): void {
    const height = Math.max(1, Number(value) || 1);
    this.exportHeight = height;
    if (this.lockAspect) this.exportWidth = Math.max(1, Math.round(height * this.aspectRatio));
  }

  async exportImage(): Promise<void> {
    const svg = this.svgText().trim();
    if (!svg) return;

    this.errorMsg.set('');
    this.exportedInfo.set('');

    try {
      const blob = await this.rasterize(svg);
      const ext = this.format() === 'PNG' ? 'png' : 'jpg';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `svg-export.${ext}`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.exportedInfo.set(`Exported ${this.exportWidth} x ${this.exportHeight} ${this.format()} (${this.formatSize(blob.size)})`);
    } catch (error: any) {
      this.errorMsg.set(error?.message ?? String(error));
    }
  }

  private rasterize(svg: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.exportWidth;
        canvas.height = this.exportHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas is unavailable.'));
          return;
        }

        if (this.format() === 'JPEG') {
          ctx.fillStyle = this.jpegBackground;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const mime = this.format() === 'PNG' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Could not export SVG image.')),
          mime,
          this.quality() / 100,
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not render SVG. Check the markup and external references.'));
      };

      image.src = url;
    });
  }

  private readSvgDimensions(svg: string): { width: number; height: number } | null {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    const root = doc.documentElement;
    if (parseError || root.tagName.toLowerCase() !== 'svg') return null;

    const width = this.parseSvgLength(root.getAttribute('width'));
    const height = this.parseSvgLength(root.getAttribute('height'));
    if (width && height) return { width, height };

    const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
      return { width: Math.round(viewBox[2]), height: Math.round(viewBox[3]) };
    }

    return { width: 512, height: 512 };
  }

  private parseSvgLength(value: string | null): number | null {
    if (!value) return null;
    const match = value.trim().match(/^(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
}
