import { Component, signal, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface FileItem {
  id: number;
  file: File;
  status: 'pending' | 'converting' | 'done' | 'error';
  outputBlob?: Blob;
  outputSize?: number;
  errorMsg?: string;
}

const MIME_MAP: Record<string, string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  WebP: 'image/webp',
  AVIF: 'image/avif',
};

const EXT_MAP: Record<string, string> = {
  PNG: 'png', JPG: 'jpg', WebP: 'webp', AVIF: 'avif',
};

let nextId = 0;

@Component({
    selector: 'dt-tool-img-converter',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Tools', 'Image Converter']" [toolId]="'img-convert'" />

  <!-- Header bar -->
  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="image" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Image Converter</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert PNG, JPG, WebP, AVIF via Canvas API</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="convertAll()" [disabled]="pendingCount() === 0"
      style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;opacity:1"
      [style.opacity]="pendingCount() === 0 ? '0.45' : '1'">
      <dt-icon name="layers" [size]="12" color="#fff" /> Convert all
    </button>
  </div>

  <!-- Two-column layout -->
  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left: drop zone + queue -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden">
      <!-- Drop zone -->
      <div
        (dragover)="$event.preventDefault(); dragOver.set(true)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        [style.background]="dragOver() ? 'var(--maroon-soft)' : 'var(--surface)'"
        [style.border-color]="dragOver() ? 'var(--maroon)' : 'var(--border)'"
        style="margin:16px;border:2px dashed var(--border);border-radius:10px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s">
        <dt-icon name="upload" [size]="24" color="var(--text-muted)" />
        <div style="font-size:13px;font-weight:500;color:var(--text)">Drop images here</div>
        <div style="font-size:11.5px;color:var(--text-muted)">or click to browse — PNG, JPG, WebP, AVIF</div>
        <input #fileInput type="file" multiple accept="image/*" style="display:none" (change)="onFileInput($event)" />
      </div>

      <!-- File queue -->
      <div style="flex:1;min-height:0;overflow-y:auto;padding:0 16px 16px">
        @if (files().length === 0) {
          <div style="text-align:center;padding:32px 0;font-size:13px;color:var(--text-faint)">No files added yet</div>
        }
        @for (item of files(); track item.id) {
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:6px;background:var(--surface-muted);display:grid;place-items:center;flex-shrink:0">
              <dt-icon name="image" [size]="16" color="var(--text-muted)" />
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item.file.name }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                {{ sourceFormat(item) }} → {{ targetFormat() }}
                &nbsp;·&nbsp;
                {{ formatSize(item.file.size) }}
                @if (item.status === 'done' && item.outputSize) {
                  → {{ formatSize(item.outputSize) }}
                  <span [style.color]="item.outputSize < item.file.size ? 'var(--teal)' : 'var(--text-muted)'">
                    ({{ sizeDelta(item) }})
                  </span>
                }
              </div>
            </div>
            <!-- Status badge -->
            <div style="flex-shrink:0">
              @if (item.status === 'pending') {
                <span style="font-size:11px;color:var(--text-faint);background:var(--surface-muted);padding:2px 8px;border-radius:10px">Pending</span>
              } @else if (item.status === 'converting') {
                <span style="font-size:11px;color:var(--teal);background:var(--teal-soft);padding:2px 8px;border-radius:10px">Converting…</span>
              } @else if (item.status === 'done') {
                <button (click)="downloadFile(item)" style="font-size:11px;color:var(--teal-ink);background:var(--teal-soft);padding:2px 8px;border-radius:10px;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                  <dt-icon name="download" [size]="11" color="var(--teal)" /> Download
                </button>
              } @else if (item.status === 'error') {
                <span style="font-size:11px;color:#e05;background:#ffe0ea;padding:2px 8px;border-radius:10px" [title]="item.errorMsg">Error</span>
              }
            </div>
            <button (click)="removeFile(item.id)" style="background:transparent;border:none;cursor:pointer;color:var(--text-faint);padding:4px;border-radius:4px;display:grid;place-items:center">
              <dt-icon name="trash" [size]="14" color="var(--text-faint)" />
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Right: options panel -->
    <div style="width:260px;flex-shrink:0;overflow-y:auto;padding:16px">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Output Format</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px">
        @for (fmt of formats; track fmt) {
          <button (click)="targetFormat.set(fmt)"
            [style.background]="targetFormat() === fmt ? 'var(--maroon)' : 'var(--surface)'"
            [style.color]="targetFormat() === fmt ? '#fff' : 'var(--text)'"
            [style.border-color]="targetFormat() === fmt ? 'var(--maroon)' : 'var(--border)'"
            style="padding:8px;border-radius:7px;border:1px solid;font-size:13px;font-weight:600;cursor:pointer">
            {{ fmt }}
          </button>
        }
      </div>

      @if (targetFormat() !== 'PNG') {
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
            Quality: {{ quality() }}%
          </div>
          <input type="range" min="1" max="100" [value]="quality()" (input)="quality.set(+$any($event.target).value)"
            style="width:100%;accent-color:var(--maroon)" />
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-faint);margin-top:2px">
            <span>1%</span><span>100%</span>
          </div>
        </div>
      }

      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Resize (optional)</div>
        <div style="display:flex;gap:6px;align-items:center">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Width</div>
            <input type="number" placeholder="auto" [(ngModel)]="resizeWidth" (ngModelChange)="onWidthChange()"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
          <button (click)="lockAspect.set(!lockAspect())"
            [title]="lockAspect() ? 'Aspect locked' : 'Aspect unlocked'"
            style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px;cursor:pointer;margin-top:14px;display:grid;place-items:center"
            [style.border-color]="lockAspect() ? 'var(--maroon)' : 'var(--border)'">
            <dt-icon name="lock" [size]="12" [color]="lockAspect() ? 'var(--maroon)' : 'var(--text-muted)'" />
          </button>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Height</div>
            <input type="number" placeholder="auto" [(ngModel)]="resizeHeight"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Queue Summary</div>
        <div style="font-size:12px;color:var(--text);display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">Total</span>
            <span>{{ files().length }}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">Pending</span>
            <span>{{ pendingCount() }}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--teal)">Done</span>
            <span>{{ doneCount() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`
})
export class ImgConverterComponent {
  files = signal<FileItem[]>([]);
  dragOver = signal(false);
  targetFormat = signal<string>('WebP');
  quality = signal(85);
  lockAspect = signal(true);
  resizeWidth: number | null = null;
  resizeHeight: number | null = null;

  formats = ['PNG', 'JPG', 'WebP', 'AVIF'];

  pendingCount() { return this.files().filter(f => f.status === 'pending').length; }
  doneCount() { return this.files().filter(f => f.status === 'done').length; }

  sourceFormat(item: FileItem): string {
    const t = item.file.type;
    if (t.includes('png')) return 'PNG';
    if (t.includes('jpeg') || t.includes('jpg')) return 'JPG';
    if (t.includes('webp')) return 'WebP';
    if (t.includes('avif')) return 'AVIF';
    return t.split('/')[1]?.toUpperCase() || '?';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  sizeDelta(item: FileItem): string {
    if (!item.outputSize) return '';
    const pct = ((item.outputSize - item.file.size) / item.file.size * 100);
    return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    this.addFiles(files);
  }

  onFileInput(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.addFiles(files);
    (e.target as HTMLInputElement).value = '';
  }

  addFiles(files: File[]) {
    this.files.update(existing => [
      ...existing,
      ...files.map(f => ({ id: nextId++, file: f, status: 'pending' as const })),
    ]);
  }

  removeFile(id: number) {
    this.files.update(fs => fs.filter(f => f.id !== id));
  }

  onWidthChange() {
    // aspect lock handled at convert time
  }

  async convertImage(file: File, targetFmt: string, q: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let w = this.resizeWidth || img.width;
        let h = this.resizeHeight || img.height;
        if (this.lockAspect() && this.resizeWidth && !this.resizeHeight) {
          h = Math.round(img.height * (this.resizeWidth / img.width));
        } else if (this.lockAspect() && this.resizeHeight && !this.resizeWidth) {
          w = Math.round(img.width * (this.resizeHeight / img.height));
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Conversion failed')),
          MIME_MAP[targetFmt],
          q / 100,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
      img.src = url;
    });
  }

  convertAll() {
    const pending = this.files().filter(f => f.status === 'pending');
    const fmt = this.targetFormat();
    const q = this.quality();
    pending.forEach(item => {
      this.files.update(fs => fs.map(f => f.id === item.id ? { ...f, status: 'converting' } : f));
      this.convertImage(item.file, fmt, q)
        .then(blob => {
          this.files.update(fs => fs.map(f =>
            f.id === item.id ? { ...f, status: 'done', outputBlob: blob, outputSize: blob.size } : f,
          ));
        })
        .catch(err => {
          this.files.update(fs => fs.map(f =>
            f.id === item.id ? { ...f, status: 'error', errorMsg: String(err) } : f,
          ));
        });
    });
  }

  downloadFile(item: FileItem) {
    if (!item.outputBlob) return;
    const ext = EXT_MAP[this.targetFormat()] ?? 'bin';
    const baseName = item.file.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(item.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
