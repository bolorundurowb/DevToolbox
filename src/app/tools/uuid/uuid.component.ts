import { Component, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { v1, v4 } from 'uuid';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function uuidv7(): string {
  const ts = BigInt(Date.now());
  const tsHex = ts.toString(16).padStart(12, '0');
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const randHex = Array.from(rand).map(b => b.toString(16).padStart(2,'0')).join('');
  return `${tsHex.slice(0,8)}-${tsHex.slice(8,12)}-7${randHex.slice(0,3)}-${((parseInt(randHex.slice(3,5), 16) & 0x3f) | 0x80).toString(16).padStart(2,'0')}${randHex.slice(5,7)}-${randHex.slice(7)}`;
}

function ulid(): string {
  const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ts = Date.now();
  let t = ''; let tmp = ts;
  for (let i = 9; i >= 0; i--) { t = CHARS[tmp % 32] + t; tmp = Math.floor(tmp / 32); }
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const r = Array.from(rand).map(b => CHARS[b % 32]).join('');
  return t + r;
}

function nanoid(size = 21, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('');
}

type UuidVersion = 'v1' | 'v4' | 'v7' | 'ulid' | 'nanoid';
const QUANTITY_OPTS = [1, 8, 32, 100];

@Component({
    selector: 'dt-tool-uuid',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Crypto', 'UUID Generator']" [toolId]="'uuid'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="identification" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">UUID / ULID Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate v1, v4, v7 UUIDs, ULIDs, and NanoIDs</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="generate()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Generate
      <kbd style="background:rgba(255,255,255,.2);border-radius:3px;padding:1px 4px;font-size:10px">⌘↵</kbd>
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <!-- Left panel: controls -->
    <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;padding:14px">
      <!-- Version -->
      <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Version</div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:16px">
        @for (v of versions; track v.id) {
          <button (click)="selectVersion(v.id)"
            [style.background]="version()===v.id?'var(--maroon-soft)':'var(--surface)'"
            [style.border]="version()===v.id?'1px solid var(--maroon)':'1px solid var(--border)'"
            [style.color]="version()===v.id?'var(--maroon)':'var(--text)'"
            style="padding:7px 10px;border-radius:7px;font-size:12.5px;font-weight:500;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px">
            <span style="font-family:var(--font-mono);font-size:11px;min-width:40px">{{ v.id }}</span>
            <span style="font-size:11px;color:var(--text-faint)">{{ v.desc }}</span>
          </button>
        }
      </div>

      <!-- Quantity -->
      <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Quantity</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:16px">
        @for (q of quantities; track q) {
          <button (click)="selectQty(q)"
            [style.background]="qty()===q?'var(--maroon)':'var(--surface)'"
            [style.color]="qty()===q?'#fff':'var(--text-muted)'"
            [style.border]="qty()===q?'1px solid var(--maroon)':'1px solid var(--border)'"
            style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer">{{ q }}</button>
        }
      </div>

      <!-- Format -->
      <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Format</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" [(ngModel)]="useHyphens" (change)="onFormatChange()" /> Hyphens
        </label>
        <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" [(ngModel)]="useBraces" (change)="onFormatChange()" /> Braces &#123; &#125;
        </label>
        <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" [(ngModel)]="useUppercase" (change)="onFormatChange()" /> Uppercase
        </label>
      </div>

      <!-- Auto-regen -->
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;color:var(--text-muted)">
        <input type="checkbox" [(ngModel)]="autoRegen" /> Re-gen on change
      </label>
    </div>

    <!-- Right panel: output -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:8px">
        Generated ({{ ids().length }})
        <div style="flex:1"></div>
        @if (ids().length > 0) {
          <button (click)="copyAll()" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copiedAll()?'check':'clipboard-document'" [size]="11" color="var(--text-muted)" /> {{ copiedAll()?'All Copied!':'Copy All' }}
          </button>
        }
      </div>
      <div style="flex:1;overflow-y:auto;padding:8px 0">
        @for (item of ids(); track item.id; let i = $index) {
          <div style="display:flex;align-items:center;padding:4px 14px;gap:10px" [style.background]="i%2===0?'transparent':'rgba(128,128,128,.03)'">
            <span style="font-size:11px;color:var(--text-faint);min-width:28px;text-align:right">{{ i+1 }}</span>
            <span style="font-family:var(--font-mono);font-size:13px;flex:1;user-select:all">{{ item.val }}</span>
            <button (click)="copyOne(item)" style="background:transparent;border:1px solid var(--border);border-radius:4px;padding:1px 7px;font-size:11px;cursor:pointer;color:var(--text-faint);flex-shrink:0">
              {{ item.copied ? '✓' : 'Copy' }}
            </button>
          </div>
        }
        @if (ids().length === 0) {
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-faint);font-size:13px;flex-direction:column;gap:8px">
            <dt-icon name="identification" [size]="36" color="var(--text-faint)" />
            <div>Click Generate to create IDs</div>
          </div>
        }
      </div>
    </div>
  </div>
</div>
`
})
export class UuidComponent {
  versions = [
    { id: 'v1' as UuidVersion, desc: 'Time-based' },
    { id: 'v4' as UuidVersion, desc: 'Random' },
    { id: 'v7' as UuidVersion, desc: 'Unix timestamp' },
    { id: 'ulid' as UuidVersion, desc: 'Sortable' },
    { id: 'nanoid' as UuidVersion, desc: 'URL-safe' },
  ];
  quantities = QUANTITY_OPTS;

  version = signal<UuidVersion>('v4');
  qty = signal(8);
  useHyphens = true;
  useBraces = false;
  useUppercase = false;
  autoRegen = true;
  ids = signal<{ id: string; val: string; copied: boolean }[]>([]);
  copiedAll = signal(false);

  selectVersion(v: UuidVersion) {
    this.version.set(v);
    if (this.autoRegen) this.generate();
  }
  selectQty(q: number) {
    this.qty.set(q);
    if (this.autoRegen) this.generate();
  }
  onFormatChange() {
    if (this.autoRegen && this.ids().length > 0) this.generate();
  }

  generateOne(): string {
    let id: string;
    switch (this.version()) {
      case 'v1': id = v1(); break;
      case 'v4': id = v4(); break;
      case 'v7': id = uuidv7(); break;
      case 'ulid': id = ulid(); break;
      case 'nanoid': id = nanoid(); break;
    }
    if (!this.useHyphens) id = id.replace(/-/g, '');
    if (this.useUppercase) id = id.toUpperCase();
    if (this.useBraces) id = '{' + id + '}';
    return id;
  }

  generate() {
    const items = Array.from({ length: this.qty() }, (_, i) => ({
      id: i.toString(),
      val: this.generateOne(),
      copied: false,
    }));
    this.ids.set(items);
  }

  copyOne(item: { id: string; val: string; copied: boolean }) {
    navigator.clipboard.writeText(item.val).then(() => {
      this.ids.update(list => list.map(x => x.id === item.id ? { ...x, copied: true } : x));
      setTimeout(() => this.ids.update(list => list.map(x => x.id === item.id ? { ...x, copied: false } : x)), 1200);
    });
  }

  copyAll() {
    const text = this.ids().map(x => x.val).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedAll.set(true);
      setTimeout(() => this.copiedAll.set(false), 1500);
    });
  }
}
