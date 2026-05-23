import { Component, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

type AspectRatio = 'Free' | '1:1' | '3:2' | '4:3' | '16:9' | '9:16';
type ActiveTab = 'Crop' | 'Resize';

const ASPECT_RATIOS: AspectRatio[] = ['Free', '1:1', '3:2', '4:3', '16:9', '9:16'];

const RATIO_VALUES: Record<AspectRatio, number | null> = {
  'Free': null, '1:1': 1, '3:2': 3 / 2, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16,
};

@Component({
    selector: 'dt-tool-img-cropper',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Tools', 'Image Cropper']" [toolId]="'img-crop'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="crop" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Image Cropper</div>
      <div style="font-size:12px;color:var(--text-muted)">Crop and resize images with aspect control</div>
    </div>
    <div style="flex:1"></div>
    <!-- Tab toggle -->
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      @for (tab of tabs; track tab) {
        <button (click)="activeTab.set(tab)"
          [style.background]="activeTab() === tab ? 'var(--maroon)' : 'transparent'"
          [style.color]="activeTab() === tab ? '#fff' : 'var(--text-muted)'"
          style="padding:5px 14px;font-size:12.5px;font-weight:500;border:none;cursor:pointer">{{ tab }}</button>
      }
    </div>
    @if (imageUrl()) {
      <button (click)="exportCrop()"
        style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        <dt-icon name="download" [size]="12" color="#fff" /> Export
      </button>
    }
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Canvas area -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;position:relative">
      @if (!imageUrl()) {
        <div
          (dragover)="$event.preventDefault(); dragOver.set(true)"
          (dragleave)="dragOver.set(false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
          [style.background]="dragOver() ? 'var(--maroon-soft)' : 'var(--surface)'"
          [style.border-color]="dragOver() ? 'var(--maroon)' : 'var(--border)'"
          style="flex:1;margin:16px;border:2px dashed var(--border);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer">
          <dt-icon name="image" [size]="32" color="var(--text-muted)" />
          <div style="font-size:14px;font-weight:500;color:var(--text)">Drop an image or click to load</div>
          <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileInput($event)" />
        </div>
      } @else {
        <div style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;position:relative">
          <!-- Image container with crop overlay -->
          <div [style.position]="'relative'" [style.display]="'inline-block'"
               (mousedown)="startDrag($event)" style="cursor:crosshair;user-select:none">
            <img #imgEl [src]="imageUrl()" (load)="onImageLoaded()"
              style="display:block;max-width:100%;max-height:60vh;object-fit:contain" />

            @if (imgLoaded()) {
              <!-- Crop overlay: dark outside crop box -->
              <div style="position:absolute;inset:0;pointer-events:none">
                <!-- Top bar -->
                <div [style.position]="'absolute'" [style.left]="'0'" [style.right]="'0'"
                     [style.top]="'0'" [style.height.px]="cropY()" style="background:rgba(0,0,0,0.45)"></div>
                <!-- Bottom bar -->
                <div [style.position]="'absolute'" [style.left]="'0'" [style.right]="'0'"
                     [style.bottom]="'0'" [style.top.px]="cropY() + cropH()" style="background:rgba(0,0,0,0.45)"></div>
                <!-- Left bar -->
                <div [style.position]="'absolute'" [style.top.px]="cropY()" [style.height.px]="cropH()"
                     [style.left]="'0'" [style.width.px]="cropX()" style="background:rgba(0,0,0,0.45)"></div>
                <!-- Right bar -->
                <div [style.position]="'absolute'" [style.top.px]="cropY()" [style.height.px]="cropH()"
                     [style.right]="'0'" [style.left.px]="cropX() + cropW()" style="background:rgba(0,0,0,0.45)"></div>

                <!-- Crop box border -->
                <div [style.position]="'absolute'" [style.left.px]="cropX()" [style.top.px]="cropY()"
                     [style.width.px]="cropW()" [style.height.px]="cropH()"
                     style="border:2px solid var(--maroon);box-sizing:border-box">
                  <!-- Rule-of-thirds lines -->
                  <div style="position:absolute;left:33.33%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3)"></div>
                  <div style="position:absolute;left:66.66%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3)"></div>
                  <div style="position:absolute;top:33.33%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3)"></div>
                  <div style="position:absolute;top:66.66%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3)"></div>
                  <!-- Corner handles -->
                  <div style="position:absolute;left:-4px;top:-4px;width:10px;height:10px;background:var(--maroon);border-radius:2px"></div>
                  <div style="position:absolute;right:-4px;top:-4px;width:10px;height:10px;background:var(--maroon);border-radius:2px"></div>
                  <div style="position:absolute;left:-4px;bottom:-4px;width:10px;height:10px;background:var(--maroon);border-radius:2px"></div>
                  <div style="position:absolute;right:-4px;bottom:-4px;width:10px;height:10px;background:var(--maroon);border-radius:2px"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Info bar -->
        <div style="flex-shrink:0;padding:8px 16px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text-muted);display:flex;gap:16px">
          <span>Crop: {{ Math.round(cropX()) }}, {{ Math.round(cropY()) }} — {{ Math.round(cropW()) }}&times;{{ Math.round(cropH()) }}px (preview)</span>
          @if (imgEl) {
            <span>Image: {{ displayW }}&times;{{ displayH }}px (displayed)</span>
          }
        </div>
      }
    </div>

    <!-- Right: controls -->
    <div style="width:250px;flex-shrink:0;overflow-y:auto;padding:16px;border-left:1px solid var(--border);display:flex;flex-direction:column;gap:16px">

      @if (imageUrl()) {
        <button (click)="clearImage()" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--text-muted);width:100%">
          Change image
        </button>
      }

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Aspect Ratio</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          @for (ar of aspectRatios; track ar) {
            <button (click)="setAspect(ar)"
              [style.background]="aspectRatio() === ar ? 'var(--maroon)' : 'var(--surface)'"
              [style.color]="aspectRatio() === ar ? '#fff' : 'var(--text)'"
              [style.border-color]="aspectRatio() === ar ? 'var(--maroon)' : 'var(--border)'"
              style="padding:4px 10px;border-radius:6px;border:1px solid;font-size:12px;cursor:pointer">{{ ar }}</button>
          }
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Crop Size</div>
        <div style="display:flex;gap:6px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">W</div>
            <input type="number" [value]="Math.round(cropW())" (change)="setCropW(+$any($event.target).value)"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">H</div>
            <input type="number" [value]="Math.round(cropH())" (change)="setCropH(+$any($event.target).value)"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Position</div>
        <div style="display:flex;gap:6px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">X</div>
            <input type="number" [value]="Math.round(cropX())" (change)="cropX.set(+$any($event.target).value)"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Y</div>
            <input type="number" [value]="Math.round(cropY())" (change)="cropY.set(+$any($event.target).value)"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box" />
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Anchor</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;width:90px">
          @for (r of [0,1,2]; track r) {
            @for (c of [0,1,2]; track c) {
              <button (click)="setAnchor(r,c)"
                [style.background]="anchorR() === r && anchorC() === c ? 'var(--maroon)' : 'var(--surface-muted)'"
                style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);cursor:pointer;padding:0">
              </button>
            }
          }
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Output Format</div>
        <select [(ngModel)]="outputFormat"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12.5px;background:var(--surface);color:var(--text)">
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
      </div>

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Quality: {{ quality() }}%</div>
        <input type="range" min="1" max="100" [value]="quality()" (input)="quality.set(+$any($event.target).value)"
          style="width:100%;accent-color:var(--maroon)" />
      </div>

    </div>
  </div>
</div>
`
})
export class ImgCropperComponent {
  @ViewChild('imgEl') imgElRef?: ElementRef<HTMLImageElement>;

  tabs: ActiveTab[] = ['Crop', 'Resize'];
  activeTab = signal<ActiveTab>('Crop');
  aspectRatios = ASPECT_RATIOS;
  aspectRatio = signal<AspectRatio>('Free');

  dragOver = signal(false);
  imageUrl = signal<string>('');
  imgLoaded = signal(false);
  sourceFile: File | null = null;

  cropX = signal(20);
  cropY = signal(20);
  cropW = signal(200);
  cropH = signal(150);
  anchorR = signal(1);
  anchorC = signal(1);
  quality = signal(92);
  outputFormat = 'image/jpeg';

  displayW = 0;
  displayH = 0;

  Math = Math;

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this.loadFile(file);
  }
  onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.loadFile(file);
  }
  loadFile(file: File) {
    this.sourceFile = file;
    const url = URL.createObjectURL(file);
    this.imageUrl.set(url);
    this.imgLoaded.set(false);
  }
  clearImage() {
    this.imageUrl.set(''); this.imgLoaded.set(false); this.sourceFile = null;
  }
  onImageLoaded() {
    const el = this.imgElRef?.nativeElement;
    if (!el) return;
    this.displayW = el.clientWidth;
    this.displayH = el.clientHeight;
    this.cropX.set(Math.round(el.clientWidth * 0.1));
    this.cropY.set(Math.round(el.clientHeight * 0.1));
    this.cropW.set(Math.round(el.clientWidth * 0.8));
    this.cropH.set(Math.round(el.clientHeight * 0.8));
    this.imgLoaded.set(true);
  }

  setAspect(ar: AspectRatio) {
    this.aspectRatio.set(ar);
    const ratio = RATIO_VALUES[ar];
    if (ratio !== null) {
      this.cropH.set(Math.round(this.cropW() / ratio));
    }
  }

  setCropW(w: number) {
    this.cropW.set(w);
    const ratio = RATIO_VALUES[this.aspectRatio()];
    if (ratio !== null) this.cropH.set(Math.round(w / ratio));
  }
  setCropH(h: number) {
    this.cropH.set(h);
    const ratio = RATIO_VALUES[this.aspectRatio()];
    if (ratio !== null) this.cropW.set(Math.round(h * ratio));
  }

  setAnchor(r: number, c: number) {
    this.anchorR.set(r); this.anchorC.set(c);
    const el = this.imgElRef?.nativeElement;
    if (!el) return;
    const x = c === 0 ? 0 : c === 1 ? (el.clientWidth - this.cropW()) / 2 : el.clientWidth - this.cropW();
    const y = r === 0 ? 0 : r === 1 ? (el.clientHeight - this.cropH()) / 2 : el.clientHeight - this.cropH();
    this.cropX.set(Math.max(0, x)); this.cropY.set(Math.max(0, y));
  }

  startDrag(e: MouseEvent) {
    this.dragging = true;
    this.dragStartX = e.offsetX; this.dragStartY = e.offsetY;
    const move = (ev: MouseEvent) => {
      if (!this.dragging) return;
      const dx = ev.clientX - (e.clientX - this.dragStartX + this.cropX());
      const dy = ev.clientY - (e.clientY - this.dragStartY + this.cropY());
      this.cropX.set(Math.max(0, ev.offsetX));
      this.cropY.set(Math.max(0, ev.offsetY));
    };
    const up = () => { this.dragging = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  cropImage(file: File, x: number, y: number, w: number, h: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const el = this.imgElRef?.nativeElement;
        const scaleX = el ? img.naturalWidth / el.clientWidth : 1;
        const scaleY = el ? img.naturalHeight / el.clientHeight : 1;
        const canvas = document.createElement('canvas');
        const sw = Math.round(w * scaleX); const sh = Math.round(h * scaleY);
        canvas.width = sw; canvas.height = sh;
        canvas.getContext('2d')!.drawImage(img, Math.round(x * scaleX), Math.round(y * scaleY), sw, sh, 0, 0, sw, sh);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Crop failed')), this.outputFormat, this.quality() / 100);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
      img.src = url;
    });
  }

  exportCrop() {
    if (!this.sourceFile) return;
    this.cropImage(this.sourceFile, this.cropX(), this.cropY(), this.cropW(), this.cropH())
      .then(blob => {
        const ext = this.outputFormat.split('/')[1];
        const base = this.sourceFile!.name.replace(/\.[^.]+$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${base}_cropped.${ext}`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => console.error('Export failed:', err));
  }
}
