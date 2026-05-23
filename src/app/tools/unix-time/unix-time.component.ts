import { Component, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

const DISPLAY_TIMEZONES = [
  { label: 'UTC', tz: 'UTC' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Paris', tz: 'Europe/Paris' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' },
  { label: 'Sydney', tz: 'Australia/Sydney' },
  { label: 'Dubai', tz: 'Asia/Dubai' },
];

function formatRelative(tsMs: number): string {
  const diff = Math.floor((Date.now() - tsMs) / 1000);
  const abs = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';
  if (abs < 5) return 'just now';
  if (abs < 60) return `${prefix}${abs} seconds${suffix}`;
  if (abs < 3600) return `${prefix}${Math.floor(abs / 60)} minutes${suffix}`;
  if (abs < 86400) return `${prefix}${Math.floor(abs / 3600)} hours${suffix}`;
  if (abs < 2592000) return `${prefix}${Math.floor(abs / 86400)} days${suffix}`;
  return `${prefix}${Math.floor(abs / 2592000)} months${suffix}`;
}

function isMs(n: number): boolean {
  // Heuristic: if > 13 digits or > 1e12, treat as ms
  return n > 1e12;
}

interface ConvertedRow {
  label: string;
  value: string;
  key: string;
}

@Component({
    selector: 'dt-tool-unix-time',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Web & Network', 'Unix Time Converter']" [toolId]="'unix'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);display:grid;place-items:center">
      <dt-icon name="clock" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Unix Time Converter</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert Unix timestamps to human-readable dates</div>
    </div>
    <div style="flex:1"></div>
    <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="liveMode" (ngModelChange)="onLiveToggle()" style="accent-color:var(--teal)" />
      Live clock
    </label>
    <button (click)="useNow()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="clock" [size]="12" color="#fff" /> Now
    </button>
  </div>

  <!-- Input -->
  <div style="padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--surface)">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Input — Unix timestamp (s or ms) or ISO date string</div>
    <input type="text" [(ngModel)]="inputValue" (ngModelChange)="onInputChange()"
      placeholder="e.g. 1700000000 or 2024-01-01T00:00:00Z"
      style="width:100%;border:2px solid var(--border);border-radius:8px;padding:10px 14px;font-size:15px;font-family:var(--font-mono);background:var(--bg);color:var(--text);box-sizing:border-box;outline:none"
      [style.border-color]="errorMsg() ? '#e05' : 'var(--border)'" />
    @if (errorMsg()) {
      <div style="font-size:12px;color:#e05;margin-top:4px">{{ errorMsg() }}</div>
    }
    @if (detectedType()) {
      <div style="font-size:11.5px;color:var(--teal);margin-top:4px">Detected: {{ detectedType() }}</div>
    }
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left: converted values -->
    <div style="flex:1;min-width:0;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px">

      @if (rows().length) {
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Representations</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
            @for (row of rows(); track row.key) {
              <div [style.border-bottom]="$last ? 'none' : '1px solid var(--border)'"
                style="padding:10px 14px;display:flex;align-items:center;gap:12px">
                <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);width:120px;flex-shrink:0">{{ row.label }}</span>
                <span style="flex:1;font-family:var(--font-mono);font-size:12.5px;color:var(--text);word-break:break-all">{{ row.value }}</span>
                <button (click)="copyValue(row.value, row.key)" style="background:transparent;border:none;cursor:pointer;padding:2px;border-radius:4px;flex-shrink:0">
                  <dt-icon [name]="copiedKey() === row.key ? 'check' : 'copy'" [size]="13" color="var(--text-muted)" />
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Timezone comparison -->
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Timezone Comparison</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
            @for (tz of tzRows(); track tz.label) {
              <div [style.border-bottom]="$last ? 'none' : '1px solid var(--border)'"
                style="padding:9px 14px;display:flex;align-items:center;gap:12px">
                <span style="font-size:12px;font-weight:600;color:var(--text-muted);width:120px;flex-shrink:0">{{ tz.label }}</span>
                <span style="font-family:var(--font-mono);font-size:12px;color:var(--text)">{{ tz.formatted }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div style="text-align:center;padding:40px 0;font-size:13px;color:var(--text-faint)">Enter a timestamp above to convert</div>
      }
    </div>

    <!-- Right: custom offset + info -->
    <div style="width:220px;flex-shrink:0;border-left:1px solid var(--border);padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:16px">
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Custom Offset</div>
        <input type="text" [(ngModel)]="customOffset" (ngModelChange)="onInputChange()"
          placeholder="+05:30 or -08:00"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;font-family:var(--font-mono);background:var(--surface);color:var(--text);box-sizing:border-box" />
        @if (customOffsetRow()) {
          <div style="margin-top:8px;background:var(--teal-soft);border-radius:6px;padding:8px;font-family:var(--font-mono);font-size:12px;color:var(--teal-ink)">
            {{ customOffsetRow() }}
          </div>
        }
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Quick Convert</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          @for (q of quickPresets; track q.label) {
            <button (click)="setTimestamp(q.ts())"
              style="font-size:11.5px;color:var(--text);background:var(--surface-muted);border:1px solid var(--border);border-radius:5px;padding:4px 8px;cursor:pointer;text-align:left">
              {{ q.label }}
            </button>
          }
        </div>
      </div>

      @if (currentTs()) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Current Unix (s)</div>
          <div style="font-family:var(--font-mono);font-size:13px;color:var(--teal)">{{ currentTs() }}</div>
        </div>
      }
    </div>
  </div>
</div>
`
})
export class UnixTimeComponent implements OnDestroy {
  inputValue = '';
  liveMode = false;
  customOffset = '';
  copiedKey = signal('');
  errorMsg = signal('');
  detectedType = signal('');
  rows = signal<ConvertedRow[]>([]);
  tzRows = signal<{ label: string; formatted: string }[]>([]);
  customOffsetRow = signal('');
  currentTs = signal('');

  private _liveInterval: ReturnType<typeof setInterval> | null = null;

  quickPresets = [
    { label: 'Epoch (0)', ts: () => 0 },
    { label: 'Y2K', ts: () => 946684800 },
    { label: '2038 problem', ts: () => 2147483647 },
    { label: 'Unix billion', ts: () => 1000000000 },
  ];

  useNow() {
    this.inputValue = Math.floor(Date.now() / 1000).toString();
    this.onInputChange();
  }

  setTimestamp(ts: number) {
    this.inputValue = ts.toString();
    this.onInputChange();
  }

  onLiveToggle() {
    if (this.liveMode) {
      this._liveInterval = setInterval(() => {
        this.inputValue = Math.floor(Date.now() / 1000).toString();
        this.onInputChange();
      }, 1000);
      this.currentTs.set(Math.floor(Date.now() / 1000).toString());
    } else {
      if (this._liveInterval) clearInterval(this._liveInterval);
      this.currentTs.set('');
    }
  }

  onInputChange() {
    this.errorMsg.set('');
    this.detectedType.set('');
    const raw = this.inputValue.trim();
    if (!raw) { this.rows.set([]); this.tzRows.set([]); return; }

    let date: Date | null = null;
    let tsMs = 0;

    // Try numeric
    if (/^-?\d+$/.test(raw)) {
      const n = parseInt(raw);
      if (isMs(n)) {
        tsMs = n; date = new Date(n);
        this.detectedType.set('Unix milliseconds');
      } else {
        tsMs = n * 1000; date = new Date(n * 1000);
        this.detectedType.set('Unix seconds');
      }
    } else {
      // Try ISO / RFC
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        date = d; tsMs = d.getTime();
        this.detectedType.set('Date string');
      } else {
        this.errorMsg.set('Invalid timestamp or date string');
        this.rows.set([]); this.tzRows.set([]);
        return;
      }
    }

    const tsS = Math.floor(tsMs / 1000);
    this.rows.set([
      { key: 'unix_s', label: 'Unix (seconds)', value: tsS.toString() },
      { key: 'unix_ms', label: 'Unix (ms)', value: tsMs.toString() },
      { key: 'iso', label: 'ISO 8601', value: date.toISOString() },
      { key: 'rfc', label: 'RFC 2822', value: date.toUTCString() },
      { key: 'local', label: 'Local string', value: date.toLocaleString() },
      { key: 'utc', label: 'UTC string', value: date.toUTCString() },
      { key: 'relative', label: 'Relative', value: formatRelative(tsMs) },
    ]);

    this.tzRows.set(DISPLAY_TIMEZONES.map(tz => ({
      label: tz.label,
      formatted: date!.toLocaleString('en-US', { timeZone: tz.tz, dateStyle: 'medium', timeStyle: 'long' }),
    })));

    // Custom offset
    if (this.customOffset && /^[+-]\d{2}:\d{2}$/.test(this.customOffset)) {
      try {
        const [sign, rest] = [this.customOffset[0], this.customOffset.slice(1)];
        const [oh, om] = rest.split(':').map(Number);
        const offsetMin = (sign === '+' ? 1 : -1) * (oh * 60 + om);
        const shifted = new Date(tsMs + offsetMin * 60000);
        this.customOffsetRow.set(shifted.toISOString().replace('T', ' ').slice(0, 19) + ' ' + this.customOffset);
      } catch { this.customOffsetRow.set(''); }
    } else {
      this.customOffsetRow.set('');
    }
  }

  copyValue(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(''), 1500);
    });
  }

  ngOnDestroy() {
    if (this._liveInterval) clearInterval(this._liveInterval);
  }
}
