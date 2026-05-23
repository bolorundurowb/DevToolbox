import {
  Component, signal, computed, OnInit, OnDestroy, ChangeDetectorRef, inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Get date-part strings in a specific IANA timezone */
function partsInTz(d: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) map[p.type] = p.value;
  // hour12:false can give '24' for midnight
  if (map['hour'] === '24') map['hour'] = '00';
  return map;
}

/** Return '+HH:MM' / '-HH:MM' offset string for a timezone at date d */
function tzOffset(d: Date, tz: string): string {
  const utcMs   = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const localMs = new Date(d.toLocaleString('en-US', { timeZone: tz   })).getTime();
  const diff    = Math.round((localMs - utcMs) / 60000);
  const sign    = diff >= 0 ? '+' : '-';
  const abs     = Math.abs(diff);
  return `${sign}${String(Math.floor(abs/60)).padStart(2,'0')}:${String(abs%60).padStart(2,'0')}`;
}

const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON_SHORT  = MON_NAMES.map(m => m.slice(0,3));
const DAY_SHORT  = DAY_NAMES.map(d => d.slice(0,3));

type Precision = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

interface FormatRow { key: string; label: string; value: string; mono?: boolean }

function buildOutputs(d: Date, tz: string, prec: Precision): FormatRow[] {
  const p      = partsInTz(d, tz);
  const offset = tzOffset(d, tz);
  const isUtc  = offset === '+00:00';

  const ms  = d.getMilliseconds();
  const msStr = String(ms).padStart(3,'0');

  const fracMap: Record<Precision, string> = {
    seconds:      '',
    milliseconds: `.${msStr}`,
    microseconds: `.${msStr}000`,
    nanoseconds:  `.${msStr}000000`,
  };
  const frac = fracMap[prec];

  const unixSec = Math.floor(d.getTime() / 1000);
  const unixMs  = d.getTime();
  const unixUs  = unixMs * 1000;
  const unixNs  = unixMs * 1_000_000;
  const unixMap: Record<Precision, string> = {
    seconds:      String(unixSec),
    milliseconds: String(unixMs),
    microseconds: String(unixUs),
    nanoseconds:  String(unixNs),
  };

  const Y = p['year'], Mo = p['month'], D = p['day'];
  const H = p['hour'], Mi = p['minute'], S = p['second'];

  // Day-of-week in tz (need a date object midnight in tz)
  const tzDateStr = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}`;
  const dowIdx    = new Date(`${Y}-${Mo}-${D}`).getDay();

  const isoUtc   = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}${frac}Z`;
  const isoLocal = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}${frac}${offset}`;
  const rfc2822  = `${DAY_SHORT[dowIdx]}, ${D} ${MON_SHORT[parseInt(Mo,10)-1]} ${Y} ${H}:${Mi}:${S} ${isUtc ? '+0000' : offset.replace(':','')}`;
  const httpDate = `${DAY_SHORT[dowIdx]}, ${D} ${MON_SHORT[parseInt(Mo,10)-1]} ${Y} ${H}:${Mi}:${S} GMT`;

  const rows: FormatRow[] = [
    { key:'iso-utc',   label:'ISO 8601 · UTC',          value: isoUtc,     mono:true },
    { key:'iso-local', label:`ISO 8601 · ${tz}`,        value: isoLocal,   mono:true },
    { key:'unix-s',    label:'Unix timestamp (s)',       value: unixMap['seconds'],      mono:true },
    { key:'unix-ms',   label:'Unix timestamp (ms)',      value: unixMap['milliseconds'], mono:true },
    ...(prec === 'microseconds' ? [{ key:'unix-us', label:'Unix timestamp (µs)', value: unixMap['microseconds'], mono:true as const }] : []),
    ...(prec === 'nanoseconds'  ? [{ key:'unix-ns', label:'Unix timestamp (ns)', value: unixMap['nanoseconds'],  mono:true as const }] : []),
    { key:'rfc2822',   label:'RFC 2822',                value: rfc2822,    mono:true },
    { key:'http',      label:'HTTP Date (RFC 7231)',     value: httpDate,   mono:true },
    { key:'long',      label:'Long form',                value: `${DAY_NAMES[dowIdx]}, ${parseInt(D,10)} ${MON_NAMES[parseInt(Mo,10)-1]} ${Y} at ${H}:${Mi}:${S} (${tz})` },
    { key:'date-iso',  label:'Date only · ISO',          value: `${Y}-${Mo}-${D}`, mono:true },
    { key:'date-us',   label:'Date only · US',           value: `${Mo}/${D}/${Y}`, mono:true },
    { key:'date-eu',   label:'Date only · EU',           value: `${D}/${Mo}/${Y}`, mono:true },
    { key:'time-24',   label:`Time only · 24h${frac ? ' + frac' : ''}`, value: `${H}:${Mi}:${S}${frac}`, mono:true },
    { key:'offset',    label:'UTC Offset',               value: offset,     mono:true },
  ];
  return rows;
}

/* ── Timezone list ────────────────────────────────────────────────────── */
const ALL_TZ: string[] = (() => {
  try { return (Intl as any).supportedValuesOf('timeZone') as string[]; }
  catch { return ['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Tokyo','Asia/Shanghai','Australia/Sydney']; }
})();

const COMMON_TZ = [
  'UTC',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Toronto','America/Sao_Paulo',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
  'Africa/Lagos','Africa/Johannesburg',
  'Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Asia/Singapore',
  'Australia/Sydney','Pacific/Auckland',
];

@Component({
  selector: 'dt-datetime-util',
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`
    :host { display:flex; flex-direction:column; flex:1; min-height:0; }

    .prec-pill {
      padding:5px 13px; border-radius:20px; border:1px solid var(--border);
      background:transparent; cursor:pointer; font-size:12.5px;
      font-family:var(--font-ui); color:var(--text-muted); transition:all 0.12s;
    }
    .prec-pill:hover { border-color:var(--border-strong); color:var(--text); }
    .prec-pill.active {
      background:var(--maroon-soft); border-color:var(--maroon);
      color:var(--maroon-ink); font-weight:600;
    }

    .format-row {
      display:flex; align-items:center; gap:12px;
      padding:9px 14px; border-radius:8px; border:1px solid var(--border);
      background:var(--surface); transition:border-color 0.1s;
    }
    .format-row:hover { border-color:var(--border-strong); }

    .copy-btn {
      flex-shrink:0; border:none; background:transparent; cursor:pointer;
      padding:4px; border-radius:5px; color:var(--text-faint);
      transition:color 0.1s, background 0.1s; display:flex; align-items:center;
    }
    .copy-btn:hover { color:var(--text); background:var(--surface-muted); }

    .clock-digit {
      font-size:52px; font-weight:700; font-family:var(--font-mono);
      color:var(--text); letter-spacing:-2px; line-height:1;
    }
    .clock-ms {
      font-size:28px; font-weight:500; font-family:var(--font-mono);
      color:var(--text-muted); letter-spacing:-1px; line-height:1;
    }
  `],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
  <dt-topbar [crumbs]="['Web & Network', 'Date & Time']" toolId="datetime-util" />

  <div style="flex:1;overflow:auto;padding:28px 36px 40px">
    <div style="max-width:800px;margin:0 auto;display:flex;flex-direction:column;gap:20px">

      <!-- ── Live clock display ─────────────────────────────────────── -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px 32px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <!-- Clock digits -->
        <div style="display:flex;align-items:baseline;gap:2px">
          <span class="clock-digit">{{ clockHMS() }}</span>
          @if (precision() !== 'seconds') {
            <span class="clock-ms">.{{ clockFrac() }}</span>
          }
        </div>
        <!-- Date & TZ line -->
        <div style="font-size:15px;color:var(--text-muted);font-family:var(--font-ui)">
          {{ clockDate() }} &nbsp;&middot;&nbsp;
          <span style="font-family:var(--font-mono);font-size:13px">{{ timezone() }}</span>
          @if (tzOff()) {
            <span style="font-family:var(--font-mono);font-size:13px;color:var(--text-faint)"> (UTC{{ tzOff() }})</span>
          }
        </div>
        <!-- Live / Freeze toggle -->
        <div style="margin-top:6px;display:flex;gap:8px">
          <button (click)="toggleLive()"
            style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-family:var(--font-ui);cursor:pointer;transition:all 0.15s"
            [style.background]="isLive() ? 'var(--teal-soft)' : 'var(--surface-muted)'"
            [style.border]="isLive() ? '1px solid rgba(28,74,79,.35)' : '1px solid var(--border)'"
            [style.color]="isLive() ? 'var(--teal)' : 'var(--text-muted)'"
            [style.font-weight]="isLive() ? '600' : '400'">
            <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background 0.15s"
              [style.background]="isLive() ? 'var(--teal)' : 'var(--text-faint)'"></span>
            {{ isLive() ? 'Live' : 'Frozen' }}
          </button>
          <button (click)="snapshot()"
            style="padding:5px 12px;border-radius:20px;font-size:12px;font-family:var(--font-ui);cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-muted)">
            Snapshot
          </button>
        </div>
      </div>

      <!-- ── Controls ───────────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <!-- Timezone -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="font-size:11.5px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Timezone</label>
          <div style="position:relative">
            <input type="text" [(ngModel)]="tzSearch" (ngModelChange)="onTzSearch($event)"
              placeholder="Search timezone…"
              style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;font-family:var(--font-ui);box-sizing:border-box;outline:none" />
            @if (tzSearch) {
              <div style="position:absolute;top:calc(100%+4px);left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:200px;overflow-y:auto;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,0.15)">
                @for (tz of tzResults(); track tz) {
                  <button (click)="selectTz(tz)"
                    style="display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;cursor:pointer;font-size:13px;font-family:var(--font-mono);color:var(--text);transition:background 0.1s"
                    (mouseenter)="$any($event.target).style.background='var(--surface-muted)'"
                    (mouseleave)="$any($event.target).style.background='transparent'">
                    {{ tz }}
                  </button>
                }
                @if (tzResults().length === 0) {
                  <div style="padding:10px 12px;font-size:12.5px;color:var(--text-faint)">No match</div>
                }
              </div>
            }
          </div>
          <!-- Common TZ chips -->
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            @for (tz of commonTz; track tz) {
              <button (click)="selectTz(tz)"
                style="padding:3px 9px;border-radius:12px;font-size:11.5px;font-family:var(--font-mono);cursor:pointer;transition:all 0.1s"
                [style.background]="tz === timezone() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                [style.border]="tz === timezone() ? '1px solid var(--maroon)' : '1px solid var(--border)'"
                [style.color]="tz === timezone() ? 'var(--maroon-ink)' : 'var(--text-muted)'"
                [style.font-weight]="tz === timezone() ? '600' : '400'">
                {{ tz === 'UTC' ? 'UTC' : tz.split('/')[1]?.replace(/_/g,' ') ?? tz }}
              </button>
            }
          </div>
        </div>

        <!-- Precision + Custom input -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;flex-direction:column;gap:8px">
            <label style="font-size:11.5px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Precision</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              @for (p of precisions; track p.id) {
                <button class="prec-pill" [class.active]="p.id === precision()" (click)="precision.set(p.id)">{{ p.label }}</button>
              }
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px">
            <label style="font-size:11.5px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Custom date / time</label>
            <div style="display:flex;gap:8px">
              <input type="datetime-local" [(ngModel)]="customInput"
                style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;font-family:var(--font-mono);outline:none;min-width:0"
                [style.opacity]="isLive() ? '0.45' : '1'"
                [disabled]="isLive()" />
              <button (click)="useCustom()" [disabled]="isLive()"
                style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);font-size:12.5px;font-family:var(--font-ui);cursor:pointer;white-space:nowrap;flex-shrink:0"
                [style.opacity]="isLive() ? '0.45' : '1'">
                Use
              </button>
            </div>
            @if (!isLive()) {
              <p style="font-size:11.5px;color:var(--text-faint);margin:0">
                Clock is frozen. Toggle "Live" to resume.
              </p>
            }
          </div>
        </div>
      </div>

      <!-- ── Format outputs ─────────────────────────────────────────── -->
      <div style="display:flex;flex-direction:column;gap:1px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:12px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.6px">Formats</span>
          <button (click)="copyAll()"
            style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;border:1px solid var(--border);background:var(--surface-muted);color:var(--text);font-size:12px;font-family:var(--font-ui);cursor:pointer">
            <dt-icon [name]="copyAllDone() ? 'check-circle' : 'copy'" [size]="12" />
            {{ copyAllDone() ? 'Copied!' : 'Copy all as JSON' }}
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px">
          @for (row of outputs(); track row.key) {
            <div class="format-row">
              <span style="font-size:12px;color:var(--text-faint);font-family:var(--font-ui);min-width:210px;flex-shrink:0">{{ row.label }}</span>
              <span style="flex:1;font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                [style.font-family]="row.mono ? 'var(--font-mono)' : 'var(--font-ui)'">{{ row.value }}</span>
              <button class="copy-btn" (click)="copyRow(row)" [title]="'Copy ' + row.label">
                <dt-icon [name]="copiedKey() === row.key ? 'check-circle' : 'copy'" [size]="13"
                  [color]="copiedKey() === row.key ? 'var(--teal)' : 'currentColor'" />
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Sub-ms precision note -->
      @if (precision() === 'microseconds' || precision() === 'nanoseconds') {
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--surface-muted);border:1px solid var(--border);border-radius:8px">
          <dt-icon name="information-circle" [size]="14" color="var(--text-faint)" />
          <span style="font-size:12px;color:var(--text-faint)">
            JavaScript's <code style="font-family:var(--font-mono)">Date</code> has millisecond precision.
            Sub-millisecond digits are padded with zeros.
          </span>
        </div>
      }

    </div>
  </div>
</div>
`
})
export class DatetimeUtilComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly precisions: { id: Precision; label: string }[] = [
    { id: 'seconds',      label: 's'  },
    { id: 'milliseconds', label: 'ms' },
    { id: 'microseconds', label: 'µs' },
    { id: 'nanoseconds',  label: 'ns' },
  ];

  readonly commonTz = COMMON_TZ.slice(0, 12);

  precision  = signal<Precision>('milliseconds');
  timezone   = signal('UTC');
  isLive     = signal(true);
  copiedKey  = signal('');
  copyAllDone= signal(false);

  tzSearch   = '';
  tzResults  = signal<string[]>([]);
  customInput = '';

  private _date = signal(new Date());

  /* ── Computed ──────────────────────────────────────────────────── */
  readonly outputs = computed(() => buildOutputs(this._date(), this.timezone(), this.precision()));

  readonly clockHMS = computed(() => {
    const p = partsInTz(this._date(), this.timezone());
    return `${p['hour']}:${p['minute']}:${p['second']}`;
  });

  readonly clockFrac = computed(() => {
    const ms = this._date().getMilliseconds();
    const mss = String(ms).padStart(3,'0');
    switch (this.precision()) {
      case 'milliseconds': return mss;
      case 'microseconds': return mss + '000';
      case 'nanoseconds':  return mss + '000000';
      default: return '';
    }
  });

  readonly clockDate = computed(() => {
    const d = this._date();
    const p = partsInTz(d, this.timezone());
    const dow = new Date(`${p['year']}-${p['month']}-${p['day']}`).getDay();
    return `${DAY_NAMES[dow]}, ${parseInt(p['day'],10)} ${MON_NAMES[parseInt(p['month'],10)-1]} ${p['year']}`;
  });

  readonly tzOff = computed(() => {
    const o = tzOffset(this._date(), this.timezone());
    return o === '+00:00' ? '' : o;
  });

  /* ── Lifecycle ─────────────────────────────────────────────────── */
  ngOnInit(): void {
    this.timer = setInterval(() => {
      if (this.isLive()) {
        this._date.set(new Date());
        this.cdr.markForCheck();
      }
    }, 87); // ~11 fps — smooth without burning CPU
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /* ── Actions ───────────────────────────────────────────────────── */
  toggleLive(): void {
    this.isLive.update(v => !v);
    if (this.isLive()) this._date.set(new Date());
  }

  snapshot(): void {
    this.isLive.set(false);
    this._date.set(new Date());
    // Pre-fill the custom input with current datetime-local value
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2,'0');
    this.customInput =
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  useCustom(): void {
    if (!this.customInput) return;
    const d = new Date(this.customInput);
    if (!isNaN(d.getTime())) {
      this._date.set(d);
    }
  }

  selectTz(tz: string): void {
    this.timezone.set(tz);
    this.tzSearch = '';
    this.tzResults.set([]);
  }

  onTzSearch(q: string): void {
    if (!q.trim()) { this.tzResults.set([]); return; }
    const lower = q.toLowerCase();
    this.tzResults.set(ALL_TZ.filter(tz => tz.toLowerCase().includes(lower)).slice(0, 30));
  }

  copyRow(row: FormatRow): void {
    navigator.clipboard.writeText(row.value);
    this.copiedKey.set(row.key);
    setTimeout(() => this.copiedKey.set(''), 1500);
  }

  copyAll(): void {
    const obj: Record<string, string> = {};
    for (const r of this.outputs()) obj[r.key] = r.value;
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    this.copyAllDone.set(true);
    setTimeout(() => this.copyAllDone.set(false), 1500);
  }
}
