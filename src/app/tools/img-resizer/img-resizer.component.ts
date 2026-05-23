import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface ResizeItem {
  id: number;
  file: File;
  status: 'pending' | 'resizing' | 'done' | 'error';
  srcW: number;
  srcH: number;
  outW: number;
  outH: number;
  outputBlob?: Blob;
  errorMsg?: string;
}

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: 'HD', w: 1920, h: 1080 },
  { label: '2K', w: 2560, h: 1440 },
  { label: '4K', w: 3840, h: 2160 },
  { label: 'Square', w: 1080, h: 1080 },
  { label: 'Thumb', w: 320, h: 240 },
];

let _nextId = 0;

@Component({
    selector: 'dt-tool-img-resizer',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Tools', 'Image Resizer']" [toolId]="'img-resize'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);display:grid;place-items:center">
      <dt-icon name="resize" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Image Resizer</div>
      <div style="font-size:12px;color:var(--text-muted)">Batch resize images to any dimension</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="resizeAll()" [style.opacity]="pendingItems().length === 0 ? '0.45' : '1'"
      style="background:var(--teal);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="resize" [size]="12" color="#fff" /> Resize all
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left: drop + queue -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border)">
      <div
        (dragover)="$event.preventDefault(); dragOver.set(true)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        [style.background]="dragOver() ? 'var(--teal-soft)' : 'var(--surface)'"
        [style.border-color]="dragOver() ? 'var(--teal)' : 'var(--border)'"
        style="margin:16px;border:2px dashed var(--border);border-radius:10px;padding:22px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;transition:all .15s">
        <dt-icon name="upload" [size]="22" color="var(--text-muted)" />
        <div style="font-size:13px;font-weight:500;color:var(--text)">Drop images or click to browse</div>
        <input #fileInput type="file" multiple accept="image/*" style="display:none" (change)="onFileInput($event)" />
      </div>

      <div style="flex:1;min-height:0;overflow-y:auto;padding:0 16px 16px">
        @if (items().length === 0) {
          <div style="text-align:center;padding:24px 0;font-size:13px;color:var(--text-faint)">No files added</div>
        }
        @for (item of items(); track item.id) {
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:6px;background:var(--surface-muted);display:grid;place-items:center;flex-shrink:0">
              <dt-icon name="image" [size]="16" color="var(--text-muted)" />
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item.file.name }}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                @if (item.srcW) {
                  {{ item.srcW }}&times;{{ item.srcH }}
                  @if (item.status === 'done') {
                    <span style="color:var(--teal)"> &rarr; {{ item.outW }}&times;{{ item.outH }}</span>
                  } @else {
                    &rarr; {{ item.outW }}&times;{{ item.outH }}
                  }
                } @else {
                  Loading&hellip;
                }
              </div>
            </div>
            @if (item.status === 'pending') {
              <span style="font-size:11px;color:var(--text-faint);background:var(--surface-muted);padding:2px 8px;border-radius:10px">Pending</span>
            } @else if (item.status === 'resizing') {
              <span style="font-size:11px;color:var(--teal);background:var(--teal-soft);padding:2px 8px;border-radius:10px">Resizing&hellip;</span>
            } @else if (item.status === 'done') {
              <button (click)="downloadItem(item)" style="font-size:11px;color:var(--teal-ink);background:var(--teal-soft);padding:2px 8px;border-radius:10px;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                <dt-icon name="download" [size]="11" color="var(--teal)" /> Download
              </button>
            } @else if (item.status === 'error') {
              <span style="font-size:11px;color:#e05;background:#ffe0ea;padding:2px 8px;border-radius:10px" [title]="item.errorMsg">Error</span>
            }
            <button (click)="removeItem(item.id)" style="background:transparent;border:none;cursor:pointer;padding:4px;border-radius:4px;display:grid;place-items:center">
              <dt-icon name="trash" [size]="14" color="var(--text-faint)" />
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Right: options -->
    <div style="width:260px;flex-shrink:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px">

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Presets</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button (click)="applyOriginal()" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);font-size:12px;background:var(--surface);cursor:pointer;color:var(--text)">Original</button>
          @for (p of presets; track p.label) {
            <button (click)="applyPreset(p)" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);font-size:12px;background:var(--surface);cursor:pointer;color:var(--text)">{{ p.label }}</button>
          }
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Dimensions</div>
        <div style="display:flex;gap:6px;align-items:center">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Width</div>
            <input type="number" [(ngModel)]="targetW" placeholder="px"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
          <button (click)="lockAspect.set(!lockAspect())"
            [style.border-color]="lockAspect() ? 'var(--teal)' : 'var(--border)'"
            style="background:transparent;border:1px solid;border-radius:6px;padding:5px;cursor:pointer;margin-top:14px;display:grid;place-items:center">
            <dt-icon name="lock" [size]="12" [color]="lockAspect() ? 'var(--teal)' : 'var(--text-muted)'" />
          </button>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Height</div>
            <input type="number" [(ngModel)]="targetH" placeholder="px"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Scale %</div>
        <input type="number" [(ngModel)]="scalePercent" min="1" max="400" placeholder="e.g. 50"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
        <div style="font-size:11px;color:var(--text-faint);margin-top:4px">Overrides width/height when set</div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Quality: {{ quality() }}%</div>
        <input type="range" min="1" max="100" [value]="quality()" (input)="quality.set(+$any($event.target).value)"
          style="width:100%;accent-color:var(--teal)" />
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Summary</div>
        <div style="font-size:12px;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Files</span><span>{{ items().length }}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--teal)">Done</span><span>{{ doneItems().length }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
`
})
export class ImgResizerComponent {
  items = signal<ResizeItem[]>([]);
  dragOver = signal(false);
  lockAspect = signal(true);
  quality = signal(90);
  targetW: number | null = null;
  targetH: number | null = null;
  scalePercent: number | null = null;
  presets = PRESETS;

  pendingItems() { return this.items().filter(i => i.status === 'pending'); }
  doneItems() { return this.items().filter(i => i.status === 'done'); }

  applyPreset(p: { w: number; h: number }) {
    this.targetW = p.w; this.targetH = p.h; this.scalePercent = null;
  }
  applyOriginal() { this.targetW = null; this.targetH = null; this.scalePercent = null; }

  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    this.addFiles(files);
  }
  onFileInput(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.addFiles(files);
    (e.target as HTMLInputElement).value = '';
  }

  addFiles(files: File[]) {
    files.forEach(file => {
      const id = _nextId++;
      this.items.update(arr => [...arr, { id, file, status: 'pending', srcW: 0, srcH: 0, outW: 0, outH: 0 }]);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        this.items.update(arr => arr.map(i =>
          i.id === id ? { ...i, srcW: img.width, srcH: img.height, outW: img.width, outH: img.height } : i,
        ));
      };
      img.src = url;
    });
  }

  removeItem(id: number) { this.items.update(arr => arr.filter(i => i.id !== id)); }

  resizeImage(file: File, w: number, h: number, q: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Resize failed')), 'image/jpeg', q / 100);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
      img.src = url;
    });
  }

  resizeAll() {
    this.pendingItems().forEach(item => {
      let outW = item.srcW || 800;
      let outH = item.srcH || 600;

      if (this.scalePercent) {
        const s = this.scalePercent / 100;
        outW = Math.round(outW * s);
        outH = Math.round(outH * s);
      } else if (this.targetW && this.targetH) {
        outW = this.targetW; outH = this.targetH;
      } else if (this.targetW) {
        outW = this.targetW;
        outH = this.lockAspect() ? Math.round((item.srcH || 1) * (this.targetW / (item.srcW || 1))) : item.srcH || outH;
      } else if (this.targetH) {
        outH = this.targetH;
        outW = this.lockAspect() ? Math.round((item.srcW || 1) * (this.targetH / (item.srcH || 1))) : item.srcW || outW;
      }

      this.items.update(arr => arr.map(i => i.id === item.id ? { ...i, status: 'resizing', outW, outH } : i));
      this.resizeImage(item.file, outW, outH, this.quality())
        .then(blob => {
          this.items.update(arr => arr.map(i => i.id === item.id ? { ...i, status: 'done', outputBlob: blob } : i));
        })
        .catch(err => {
          this.items.update(arr => arr.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: String(err) } : i));
        });
    });
  }

  downloadItem(item: ResizeItem) {
    if (!item.outputBlob) return;
    const base = item.file.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(item.outputBlob);
    const a = document.createElement('a');
    a.href = url; a.download = `${base}_${item.outW}x${item.outH}.jpg`; a.click();
    URL.revokeObjectURL(url);
  }
}
