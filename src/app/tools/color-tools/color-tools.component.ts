import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface RGB { r: number; g: number; b: number; }
interface HSL { h: number; s: number; l: number; }
interface HSV { h: number; s: number; v: number; }
interface CMYK { c: number; m: number; y: number; k: number; }

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: Math.round(h * 60 + (h < 0 ? 360 : 0)), s: Math.round(s * 100), v: Math.round(max * 100) };
}

function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - rr - k) / (1 - k) * 100),
    m: Math.round((1 - gg - k) / (1 - k) * 100),
    y: Math.round((1 - bb - k) / (1 - k) * 100),
    k: Math.round(k * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(r1: RGB, r2: RGB): number {
  const l1 = relativeLuminance(r1.r, r1.g, r1.b);
  const l2 = relativeLuminance(r2.r, r2.g, r2.b);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function makeHarmonies(hsl: HSL) {
  const { h, s, l } = hsl;
  const c = (deg: number) => {
    const rgb = hslToRgb((h + deg + 360) % 360, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };
  return {
    complementary: [c(0), c(180)],
    triadic: [c(0), c(120), c(240)],
    analogous: [c(-30), c(0), c(30)],
    splitComplementary: [c(0), c(150), c(210)],
  };
}

@Component({
    selector: 'dt-tool-color-tools',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Images', 'Colour Tools']" [toolId]="'color'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="palette" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Colour Tools</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert, analyse, and explore colours</div>
    </div>
  </div>

  <div style="flex:1;min-height:0;overflow-y:auto;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px">

    <!-- Primary colour input -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Colour Input</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
          <input type="color" [value]="hexInput()" (input)="onColorPicker($event)"
            style="width:52px;height:52px;border-radius:8px;border:2px solid var(--border);cursor:pointer;padding:2px;background:transparent" />
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">HEX</div>
            <input type="text" [(ngModel)]="hexInputModel" (ngModelChange)="onHexInput($event)"
              placeholder="#000000" maxlength="7"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;font-family:var(--font-mono);background:var(--bg);color:var(--text);box-sizing:border-box" />
          </div>
          <button (click)="copyValue(hexInput())" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:6px;cursor:pointer">
            <dt-icon [name]="copiedKey() === 'hex' ? 'check' : 'copy'" [size]="14" color="var(--text-muted)" />
          </button>
        </div>
        <!-- Swatch -->
        <div [style.background]="hexInput()" style="width:100%;height:60px;border-radius:8px;border:1px solid var(--border)"></div>
      </div>

      <!-- Converted values -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Conversions</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (row of conversionRows(); track row.label) {
            <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--surface-muted);border-radius:6px">
              <span style="font-size:11px;font-weight:600;color:var(--maroon);width:52px;flex-shrink:0">{{ row.label }}</span>
              <span style="flex:1;font-family:var(--font-mono);font-size:12px;color:var(--text)">{{ row.value }}</span>
              <button (click)="copyValue(row.value, row.label)" style="background:transparent;border:none;cursor:pointer;padding:2px">
                <dt-icon [name]="copiedKey() === row.label ? 'check' : 'copy'" [size]="13" color="var(--text-muted)" />
              </button>
            </div>
          }
        </div>
      </div>

    </div>

    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Contrast checker -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Contrast Checker (WCAG)</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <input type="color" [value]="contrastColor()" (input)="contrastColor.set($any($event.target).value)"
            style="width:36px;height:36px;border-radius:6px;border:1px solid var(--border);cursor:pointer;padding:2px;background:transparent" />
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Compare with</div>
            <input type="text" [ngModel]="contrastColor()" (ngModelChange)="contrastColor.set($event)"
              placeholder="#ffffff"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;font-family:var(--font-mono);background:var(--bg);color:var(--text);box-sizing:border-box" />
          </div>
        </div>
        <!-- Contrast ratio display -->
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div [style.background]="hexInput()" [style.color]="contrastColor()"
            style="flex:1;padding:10px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;border:1px solid var(--border)">Aa</div>
          <div [style.background]="contrastColor()" [style.color]="hexInput()"
            style="flex:1;padding:10px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;border:1px solid var(--border)">Aa</div>
        </div>
        <div style="font-size:22px;font-weight:700;text-align:center;margin-bottom:8px">{{ contrastRatioValue().toFixed(2) }}:1</div>
        <div style="display:flex;gap:6px;justify-content:center">
          <span [style.background]="passAA() ? 'var(--teal-soft)' : 'var(--surface-muted)'"
            [style.color]="passAA() ? 'var(--teal-ink)' : 'var(--text-faint)'"
            style="padding:3px 12px;border-radius:10px;font-size:11.5px;font-weight:600">AA {{ passAA() ? '✓' : '✗' }}</span>
          <span [style.background]="passAAA() ? 'var(--teal-soft)' : 'var(--surface-muted)'"
            [style.color]="passAAA() ? 'var(--teal-ink)' : 'var(--text-faint)'"
            style="padding:3px 12px;border-radius:10px;font-size:11.5px;font-weight:600">AAA {{ passAAA() ? '✓' : '✗' }}</span>
          <span [style.background]="passAA_large() ? 'var(--teal-soft)' : 'var(--surface-muted)'"
            [style.color]="passAA_large() ? 'var(--teal-ink)' : 'var(--text-faint)'"
            style="padding:3px 12px;border-radius:10px;font-size:11.5px;font-weight:600">AA Large {{ passAA_large() ? '✓' : '✗' }}</span>
        </div>
      </div>

      <!-- Colour harmonies -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Colour Harmonies</div>
        @for (group of harmonyGroups(); track group.label) {
          <div style="margin-bottom:12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">{{ group.label }}</div>
            <div style="display:flex;gap:5px">
              @for (swatch of group.swatches; track swatch) {
                <div style="flex:1;height:36px;border-radius:6px;border:1px solid var(--border);cursor:pointer;position:relative"
                  [style.background]="swatch"
                  (click)="copyValue(swatch)"
                  [title]="swatch">
                </div>
              }
            </div>
          </div>
        }
      </div>

    </div>
  </div>
</div>
`
})
export class ColorToolsComponent {
  hexInput = signal('#e63946');
  hexInputModel = '#e63946';
  contrastColor = signal('#ffffff');
  copiedKey = signal('');

  onColorPicker(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.hexInput.set(val);
    this.hexInputModel = val;
  }

  onHexInput(val: string) {
    const clean = val.startsWith('#') ? val : '#' + val;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      this.hexInput.set(clean);
    }
  }

  conversionRows = computed(() => {
    const hex = this.hexInput();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return [];
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    return [
      { label: 'HEX', value: hex.toUpperCase() },
      { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
      { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
      { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
      { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
      { label: 'R', value: `${rgb.r}` },
      { label: 'G', value: `${rgb.g}` },
      { label: 'B', value: `${rgb.b}` },
    ];
  });

  contrastRatioValue = computed(() => {
    const hex = this.hexInput();
    const hex2 = this.contrastColor();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex) || !/^#[0-9a-fA-F]{6}$/.test(hex2)) return 1;
    return contrastRatio(hexToRgb(hex), hexToRgb(hex2));
  });
  passAA = computed(() => this.contrastRatioValue() >= 4.5);
  passAAA = computed(() => this.contrastRatioValue() >= 7);
  passAA_large = computed(() => this.contrastRatioValue() >= 3);

  harmonyGroups = computed(() => {
    const hex = this.hexInput();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return [];
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const h = makeHarmonies(hsl);
    return [
      { label: 'Complementary', swatches: h.complementary },
      { label: 'Triadic', swatches: h.triadic },
      { label: 'Analogous', swatches: h.analogous },
      { label: 'Split-Complementary', swatches: h.splitComplementary },
    ];
  });

  copyValue(val: string, key?: string) {
    navigator.clipboard.writeText(val).then(() => {
      this.copiedKey.set(key ?? 'hex');
      setTimeout(() => this.copiedKey.set(''), 1500);
    });
  }
}
