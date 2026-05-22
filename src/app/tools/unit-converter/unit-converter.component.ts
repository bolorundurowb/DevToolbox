import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface Unit { key: string; label: string; toBase: number; }

const DATA_UNITS: Unit[] = [
  { key: 'bit',  label: 'Bit',       toBase: 1 },
  { key: 'byte', label: 'Byte',      toBase: 8 },
  { key: 'kb',   label: 'KB (1000)', toBase: 8 * 1000 },
  { key: 'kib',  label: 'KiB (1024)', toBase: 8 * 1024 },
  { key: 'mb',   label: 'MB',        toBase: 8 * 1000 * 1000 },
  { key: 'mib',  label: 'MiB',       toBase: 8 * 1024 * 1024 },
  { key: 'gb',   label: 'GB',        toBase: 8 * 1000 ** 3 },
  { key: 'gib',  label: 'GiB',       toBase: 8 * 1024 ** 3 },
  { key: 'tb',   label: 'TB',        toBase: 8 * 1000 ** 4 },
  { key: 'tib',  label: 'TiB',       toBase: 8 * 1024 ** 4 },
];

const TIME_UNITS: Unit[] = [
  { key: 'ns',  label: 'Nanoseconds',  toBase: 1 },
  { key: 'us',  label: 'Microseconds', toBase: 1000 },
  { key: 'ms',  label: 'Milliseconds', toBase: 1_000_000 },
  { key: 's',   label: 'Seconds',      toBase: 1_000_000_000 },
  { key: 'min', label: 'Minutes',      toBase: 60 * 1_000_000_000 },
  { key: 'hr',  label: 'Hours',        toBase: 3600 * 1_000_000_000 },
  { key: 'day', label: 'Days',         toBase: 86400 * 1_000_000_000 },
  { key: 'wk',  label: 'Weeks',        toBase: 7 * 86400 * 1_000_000_000 },
];

function formatNum(n: number): string {
  if (n === 0) return '0';
  if (!isFinite(n)) return '∞';
  if (n >= 1e15 || (n < 1e-6 && n > 0)) return n.toExponential(6);
  // Up to 10 significant digits
  const s = n.toPrecision(10);
  const f = parseFloat(s);
  return String(f);
}

@Component({
  selector: 'dt-tool-unit-converter',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Utilities', 'Unit Converter']" [toolId]="'unit-conv'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="hashtag" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Unit Converter</div>
      <div style="font-size:12px;color:var(--text-muted)">Data storage and time unit conversion</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
    <button (click)="tab.set('data')"
      [style.border-bottom]="tab()==='data' ? '2px solid var(--maroon)' : '2px solid transparent'"
      [style.color]="tab()==='data' ? 'var(--maroon)' : 'var(--text-muted)'"
      style="padding:10px 18px;font-size:13px;font-weight:500;background:transparent;border:none;border-top:none;border-left:none;border-right:none;cursor:pointer">
      Data Storage
    </button>
    <button (click)="tab.set('time')"
      [style.border-bottom]="tab()==='time' ? '2px solid var(--maroon)' : '2px solid transparent'"
      [style.color]="tab()==='time' ? 'var(--maroon)' : 'var(--text-muted)'"
      style="padding:10px 18px;font-size:13px;font-weight:500;background:transparent;border:none;border-top:none;border-left:none;border-right:none;cursor:pointer">
      Time
    </button>
  </div>

  <div style="flex:1;overflow-y:auto;padding:20px 22px">
    @if (tab() === 'data') {
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        @for (u of dataUnits; track u.key) {
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 14px">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px">{{ u.label }}</div>
            <input type="number" [value]="dataValues[u.key]"
              (input)="onDataInput(u.key, $event)"
              style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-family:var(--font-mono);font-size:13px;background:var(--bg);color:var(--text);outline:none" />
          </div>
        }
      </div>
    }
    @if (tab() === 'time') {
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        @for (u of timeUnits; track u.key) {
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 14px">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px">{{ u.label }}</div>
            <input type="number" [value]="timeValues[u.key]"
              (input)="onTimeInput(u.key, $event)"
              style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-family:var(--font-mono);font-size:13px;background:var(--bg);color:var(--text);outline:none" />
          </div>
        }
      </div>
    }
  </div>
</div>
`,
})
export class UnitConverterComponent {
  tab = signal<'data' | 'time'>('data');
  dataUnits = DATA_UNITS;
  timeUnits = TIME_UNITS;

  dataValues: Record<string, string> = Object.fromEntries(DATA_UNITS.map(u => [u.key, '']));
  timeValues: Record<string, string> = Object.fromEntries(TIME_UNITS.map(u => [u.key, '']));

  onDataInput(key: string, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.dataValues[key] = val;
    if (!val || isNaN(Number(val))) return;
    const n = Number(val);
    const unit = DATA_UNITS.find(u => u.key === key)!;
    const inBits = n * unit.toBase;
    DATA_UNITS.forEach(u => {
      if (u.key !== key) this.dataValues[u.key] = formatNum(inBits / u.toBase);
    });
  }

  onTimeInput(key: string, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.timeValues[key] = val;
    if (!val || isNaN(Number(val))) return;
    const n = Number(val);
    const unit = TIME_UNITS.find(u => u.key === key)!;
    const inNs = n * unit.toBase;
    TIME_UNITS.forEach(u => {
      if (u.key !== key) this.timeValues[u.key] = formatNum(inNs / u.toBase);
    });
  }
}
