import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

/* ── Color math helpers ───────────────────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2 = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3-t)*6;
    return p;
  };
  return [Math.round(hue2(h+1/3)*255), Math.round(hue2(h)*255), Math.round(hue2(h-1/3)*255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
}

function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(...hslToRgb(Math.round(((h % 360) + 360) % 360), Math.max(0,Math.min(100,s)), Math.max(0,Math.min(100,l))));
}

function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}

function textOnBg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000';
  return luminance(...rgb) > 0.35 ? '#1a1a1a' : '#ffffff';
}

/* ── Palette entry ────────────────────────────────────────────────────── */
interface Swatch {
  hex: string;
  hsl: string;
  rgb: string;
  label: string;
}

function makeSwatch(h: number, s: number, l: number, label: string): Swatch {
  const hex = hslToHex(h, s, l);
  const rgb = hexToRgb(hex)!;
  return {
    hex,
    hsl: `hsl(${Math.round(((h%360)+360)%360)}, ${Math.max(0,Math.min(100,Math.round(s)))}%, ${Math.max(0,Math.min(100,Math.round(l)))}%)`,
    rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    label,
  };
}

/* ── Harmony generators ───────────────────────────────────────────────── */
type HarmonyMode = 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split-complementary' | 'tints-shades';

function generatePalette(hex: string, mode: HarmonyMode): Swatch[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const [h, s, l] = rgbToHsl(...rgb);

  switch (mode) {
    case 'monochromatic': {
      const sat = Math.max(20, s);
      return [
        makeSwatch(h, sat, 15, 'Dark 3'),
        makeSwatch(h, sat, 25, 'Dark 2'),
        makeSwatch(h, sat, 37, 'Dark 1'),
        makeSwatch(h, sat, l,  'Base'),
        makeSwatch(h, sat * 0.85, 62, 'Light 1'),
        makeSwatch(h, sat * 0.7,  74, 'Light 2'),
        makeSwatch(h, sat * 0.55, 84, 'Light 3'),
        makeSwatch(h, sat * 0.35, 93, 'Light 4'),
      ];
    }
    case 'complementary': {
      const comp = h + 180;
      return [
        makeSwatch(h,    s, 25, 'Primary Dark'),
        makeSwatch(h,    s, l,  'Primary'),
        makeSwatch(h,    s, Math.min(l+20, 85), 'Primary Light'),
        makeSwatch(h,    s, Math.min(l+35, 93), 'Primary Pale'),
        makeSwatch(comp, s, 25, 'Complement Dark'),
        makeSwatch(comp, s, l,  'Complement'),
        makeSwatch(comp, s, Math.min(l+20, 85), 'Complement Light'),
        makeSwatch(comp, s, Math.min(l+35, 93), 'Complement Pale'),
      ];
    }
    case 'analogous': {
      return [
        makeSwatch(h - 60, s, l, '-60°'),
        makeSwatch(h - 30, s, l, '-30°'),
        makeSwatch(h,      s, l, 'Base'),
        makeSwatch(h + 30, s, l, '+30°'),
        makeSwatch(h + 60, s, l, '+60°'),
        makeSwatch(h - 60, s * 0.7, Math.min(l+25,88), '-60° Light'),
        makeSwatch(h,      s * 0.7, Math.min(l+25,88), 'Base Light'),
        makeSwatch(h + 60, s * 0.7, Math.min(l+25,88), '+60° Light'),
      ];
    }
    case 'triadic': {
      const h2 = h + 120, h3 = h + 240;
      return [
        makeSwatch(h,  s, l,  'Primary'),
        makeSwatch(h2, s, l,  'Secondary'),
        makeSwatch(h3, s, l,  'Tertiary'),
        makeSwatch(h,  s, Math.max(l-18,10), 'Primary Dark'),
        makeSwatch(h2, s, Math.max(l-18,10), 'Secondary Dark'),
        makeSwatch(h3, s, Math.max(l-18,10), 'Tertiary Dark'),
        makeSwatch(h,  s*0.6, Math.min(l+28,90), 'Primary Light'),
        makeSwatch(h2, s*0.6, Math.min(l+28,90), 'Secondary Light'),
      ];
    }
    case 'tetradic': {
      const h2 = h+90, h3 = h+180, h4 = h+270;
      return [
        makeSwatch(h,  s, l,  'Color 1'),
        makeSwatch(h2, s, l,  'Color 2'),
        makeSwatch(h3, s, l,  'Color 3'),
        makeSwatch(h4, s, l,  'Color 4'),
        makeSwatch(h,  s*0.65, Math.min(l+28,90), 'Color 1 Light'),
        makeSwatch(h2, s*0.65, Math.min(l+28,90), 'Color 2 Light'),
        makeSwatch(h3, s*0.65, Math.min(l+28,90), 'Color 3 Light'),
        makeSwatch(h4, s*0.65, Math.min(l+28,90), 'Color 4 Light'),
      ];
    }
    case 'split-complementary': {
      const h2 = h + 150, h3 = h + 210;
      return [
        makeSwatch(h,  s, l,  'Primary'),
        makeSwatch(h2, s, l,  'Split A'),
        makeSwatch(h3, s, l,  'Split B'),
        makeSwatch(h,  s, Math.max(l-18,10),      'Primary Dark'),
        makeSwatch(h2, s, Math.max(l-18,10),      'Split A Dark'),
        makeSwatch(h3, s, Math.max(l-18,10),      'Split B Dark'),
        makeSwatch(h,  s*0.6, Math.min(l+28,90),  'Primary Light'),
        makeSwatch(h2, s*0.6, Math.min(l+28,90),  'Split A Light'),
      ];
    }
    case 'tints-shades': {
      return [
        makeSwatch(h, s, 10, '10%'),
        makeSwatch(h, s, 20, '20%'),
        makeSwatch(h, s, 30, '30%'),
        makeSwatch(h, s, 40, '40%'),
        makeSwatch(h, s, l,  'Base'),
        makeSwatch(h, s, 60, '60%'),
        makeSwatch(h, s, 70, '70%'),
        makeSwatch(h, s, 80, '80%'),
        makeSwatch(h, s, 90, '90%'),
      ];
    }
  }
}

const MODES: { id: HarmonyMode; label: string; desc: string }[] = [
  { id: 'monochromatic',       label: 'Monochromatic',       desc: 'Same hue, varied brightness' },
  { id: 'complementary',       label: 'Complementary',       desc: 'Opposite hues (180°)' },
  { id: 'analogous',           label: 'Analogous',           desc: 'Adjacent hues (±30°–60°)' },
  { id: 'triadic',             label: 'Triadic',             desc: '3 hues evenly spaced (120°)' },
  { id: 'tetradic',            label: 'Tetradic',            desc: '4 hues evenly spaced (90°)' },
  { id: 'split-complementary', label: 'Split-Complementary', desc: 'Base + two near-complement hues' },
  { id: 'tints-shades',        label: 'Tints & Shades',      desc: 'Full lightness range of one hue' },
];

@Component({
  selector: 'dt-color-palette',
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    .mode-pill {
      padding: 5px 12px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: transparent;
      cursor: pointer;
      font-size: 12.5px;
      font-family: var(--font-ui);
      color: var(--text-muted);
      transition: all 0.12s;
      white-space: nowrap;
    }
    .mode-pill:hover { border-color: var(--border-strong); color: var(--text); }
    .mode-pill.active {
      background: var(--maroon-soft);
      border-color: var(--maroon);
      color: var(--maroon-ink);
      font-weight: 600;
    }

    .swatch-card {
      border-radius: 10px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: border-color 0.12s, transform 0.12s;
      cursor: default;
    }
    .swatch-card:hover { border-color: var(--border-strong); transform: translateY(-2px); }

    .copy-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      color: inherit;
      opacity: 0.6;
      transition: opacity 0.1s;
      display: flex;
      align-items: center;
    }
    .copy-btn:hover { opacity: 1; }

    .format-tab {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      font-size: 11.5px;
      font-family: var(--font-mono);
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.1s;
    }
    .format-tab.active {
      background: var(--surface-muted);
      color: var(--text);
      border-color: var(--border-strong);
    }
  `],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['Images', 'Color Palette Generator']" toolId="palette-gen" />

  <div style="flex:1;overflow:auto;padding:28px 36px 40px">
    <div style="max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:24px">

      <!-- ── Controls row ─────────────────────────────────────────────── -->
      <div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap">

        <!-- Base colour picker -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="font-size:11.5px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Base Color</label>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="position:relative;width:44px;height:44px;border-radius:10px;overflow:hidden;border:1px solid var(--border);flex-shrink:0">
              <input type="color" [(ngModel)]="baseHex" (ngModelChange)="onColorPick($event)"
                style="position:absolute;inset:-6px;width:calc(100%+12px);height:calc(100%+12px);border:none;cursor:pointer;padding:0" />
            </div>
            <input type="text" [(ngModel)]="hexInput" (ngModelChange)="onHexType($event)"
              placeholder="#3a7bd5"
              style="width:110px;height:44px;padding:0 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13.5px;font-family:var(--font-mono);outline:none"
              [style.border-color]="hexError() ? 'var(--red,#c0392b)' : 'var(--border)'" />
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
            @for (p of presets; track p) {
              <button (click)="applyPreset(p)" [title]="p"
                style="width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform 0.1s"
                [style.background]="p"
                (mouseenter)="$any($event.target).style.transform='scale(1.2)'"
                (mouseleave)="$any($event.target).style.transform='scale(1)'">
              </button>
            }
          </div>
        </div>

        <!-- Mode selector -->
        <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0">
          <label style="font-size:11.5px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Harmony</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            @for (m of modes; track m.id) {
              <button class="mode-pill" [class.active]="m.id === mode()" (click)="mode.set(m.id)" [title]="m.desc">
                {{ m.label }}
              </button>
            }
          </div>
          <p style="font-size:12px;color:var(--text-faint);margin:0">{{ modeDesc() }}</p>
        </div>
      </div>

      <!-- ── Palette grid ──────────────────────────────────────────────── -->
      @if (palette().length > 0) {
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--text)">{{ palette().length }} colours · {{ modeLabel() }}</span>

            <div style="display:flex;align-items:center;gap:8px">
              <!-- Format toggle -->
              <div style="display:flex;gap:4px">
                @for (f of formats; track f) {
                  <button class="format-tab" [class.active]="f === displayFmt()" (click)="displayFmt.set(f)">{{ f }}</button>
                }
              </div>
              <!-- Copy all -->
              <button (click)="copyAll()"
                style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);font-size:12.5px;font-weight:500;font-family:var(--font-ui);cursor:pointer">
                <dt-icon [name]="copyAllDone() ? 'check-circle' : 'copy'" [size]="13" />
                {{ copyAllDone() ? 'Copied!' : 'Copy all' }}
              </button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
            @for (sw of palette(); track sw.hex) {
              <div class="swatch-card">
                <!-- Color block -->
                <div style="height:80px;display:flex;align-items:flex-end;padding:8px"
                  [style.background]="sw.hex">
                  <span style="font-size:10.5px;font-weight:600;font-family:var(--font-mono);opacity:0.85;letter-spacing:.3px"
                    [style.color]="textFor(sw.hex)">{{ sw.label }}</span>
                </div>
                <!-- Info -->
                <div style="padding:10px 10px 8px;background:var(--surface)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
                    <span style="font-size:12px;font-family:var(--font-mono);color:var(--text);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ displayValue(sw) }}
                    </span>
                    <button class="copy-btn" (click)="copySwatch(sw)" [title]="'Copy ' + displayFmt()">
                      <dt-icon [name]="copiedHex() === sw.hex ? 'check-circle' : 'copy'" [size]="12" [color]="copiedHex() === sw.hex ? 'var(--teal)' : 'currentColor'" />
                    </button>
                  </div>
                  <div style="font-size:10.5px;color:var(--text-faint);font-family:var(--font-mono);margin-top:3px">
                    {{ sw.hsl }}
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── CSS vars export ────────────────────────────────────────── -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:12.5px;font-weight:600;color:var(--text)">CSS Custom Properties</span>
            <button (click)="copyCss()"
              style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);font-size:12px;font-family:var(--font-ui);cursor:pointer">
              <dt-icon [name]="cssDone() ? 'check-circle' : 'copy'" [size]="12" />
              {{ cssDone() ? 'Copied!' : 'Copy CSS' }}
            </button>
          </div>
          <pre style="margin:0;font-size:11.5px;color:var(--text-muted);font-family:var(--font-mono);white-space:pre-wrap;line-height:1.6">{{ cssVars() }}</pre>
        </div>
      }

      @if (hexError()) {
        <div style="padding:12px 16px;border-radius:8px;background:rgba(180,30,30,.08);border:1px solid rgba(180,30,30,.25);color:#c0392b;font-size:13px">
          Please enter a valid hex colour (e.g. #3a7bd5)
        </div>
      }

    </div>
  </div>
</div>
`
})
export class ColorPaletteComponent {
  readonly modes = MODES;
  readonly formats = ['HEX', 'RGB', 'HSL'] as const;
  readonly presets = [
    '#3a7bd5','#e74c3c','#2ecc71','#f39c12','#9b59b6',
    '#1abc9c','#e67e22','#2c3e50','#e91e63','#00bcd4',
  ];

  mode       = signal<HarmonyMode>('monochromatic');
  displayFmt = signal<'HEX' | 'RGB' | 'HSL'>('HEX');
  baseHex    = signal('#3a7bd5');
  hexInput   = signal('#3a7bd5');
  hexError   = signal(false);
  copiedHex  = signal('');
  copyAllDone= signal(false);
  cssDone    = signal(false);

  readonly modeDesc  = computed(() => MODES.find(m => m.id === this.mode())?.desc ?? '');
  readonly modeLabel = computed(() => MODES.find(m => m.id === this.mode())?.label ?? '');

  readonly palette = computed(() => generatePalette(this.baseHex(), this.mode()));

  readonly cssVars = computed(() => {
    const swatches = this.palette();
    if (!swatches.length) return '';
    const slug = this.mode().replace(/-/g, '_');
    const lines = swatches.map((s, i) =>
      `  --color-${slug}-${i+1}: ${s.hex};   /* ${s.label} */`
    );
    return `:root {\n${lines.join('\n')}\n}`;
  });

  onColorPick(hex: string): void {
    this.baseHex.set(hex);
    this.hexInput.set(hex);
    this.hexError.set(false);
  }

  onHexType(val: string): void {
    const clean = val.trim().startsWith('#') ? val.trim() : '#' + val.trim();
    if (hexToRgb(clean)) {
      this.baseHex.set(clean);
      this.hexError.set(false);
    } else {
      this.hexError.set(val.length > 3);
    }
  }

  applyPreset(hex: string): void {
    this.baseHex.set(hex);
    this.hexInput.set(hex);
    this.hexError.set(false);
  }

  displayValue(sw: Swatch): string {
    switch (this.displayFmt()) {
      case 'RGB': return sw.rgb;
      case 'HSL': return sw.hsl;
      default:    return sw.hex;
    }
  }

  textFor(hex: string): string { return textOnBg(hex); }

  copySwatch(sw: Swatch): void {
    navigator.clipboard.writeText(this.displayValue(sw));
    this.copiedHex.set(sw.hex);
    setTimeout(() => this.copiedHex.set(''), 1500);
  }

  copyAll(): void {
    const vals = this.palette().map(s => this.displayValue(s)).join('\n');
    navigator.clipboard.writeText(vals);
    this.copyAllDone.set(true);
    setTimeout(() => this.copyAllDone.set(false), 1500);
  }

  copyCss(): void {
    navigator.clipboard.writeText(this.cssVars());
    this.cssDone.set(true);
    setTimeout(() => this.cssDone.set(false), 1500);
  }
}
