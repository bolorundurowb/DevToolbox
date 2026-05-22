import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

type HexMode = 'text-to-hex' | 'hex-to-text' | 'dec-hex';

@Component({
  selector: 'dt-tool-hex',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding', 'Hex']" [toolId]="'hex'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="hashtag" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Hex Converter</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert between text, hex bytes, and decimal numbers</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="process()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Convert
    </button>
  </div>
  <!-- Toolbar -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      <button (click)="setMode('text-to-hex')" [style.background]="mode()==='text-to-hex'?'var(--maroon)':'transparent'" [style.color]="mode()==='text-to-hex'?'#fff':'var(--text-muted)'" style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">Text→Hex</button>
      <button (click)="setMode('hex-to-text')" [style.background]="mode()==='hex-to-text'?'var(--maroon)':'transparent'" [style.color]="mode()==='hex-to-text'?'#fff':'var(--text-muted)'" style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">Hex→Text</button>
      <button (click)="setMode('dec-hex')" [style.background]="mode()==='dec-hex'?'var(--maroon)':'transparent'" [style.color]="mode()==='dec-hex'?'#fff':'var(--text-muted)'" style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">Decimal↔Hex</button>
    </div>
    @if (mode()==='text-to-hex') {
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" [(ngModel)]="spaceSeparated" (change)="process()" /> Space-separated
      </label>
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" [(ngModel)]="uppercase" (change)="process()" /> Uppercase
      </label>
    }
  </div>
  <!-- Body -->
  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    @if (mode()==='dec-hex') {
      <!-- Decimal / Hex converter panel -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:16px;overflow-y:auto">
        <div style="width:100%;max-width:480px;display:flex;flex-direction:column;gap:12px">
          <div style="font-size:13px;font-weight:600;color:var(--text-muted)">Decimal</div>
          <input [(ngModel)]="decInput" (ngModelChange)="fromDec()" type="number"
            placeholder="Enter decimal number…"
            style="border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--font-mono);font-size:14px;background:var(--surface);color:var(--text);outline:none;width:100%;box-sizing:border-box" />
          <div style="font-size:13px;font-weight:600;color:var(--text-muted)">Hexadecimal</div>
          <input [(ngModel)]="hexInput" (ngModelChange)="fromHex()"
            placeholder="Enter hex number (e.g. FF, 0x1A)…"
            style="border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--font-mono);font-size:14px;background:var(--surface);color:var(--text);outline:none;width:100%;box-sizing:border-box" />
          @if (numValue() !== null) {
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Decimal</div>
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:600">{{ numValue() }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Hex</div>
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:600;color:var(--maroon)">0x{{ numValue()!.toString(16).toUpperCase() }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Binary</div>
                <div style="font-family:var(--font-mono);font-size:12px">{{ numValue()!.toString(2) }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Octal</div>
                <div style="font-family:var(--font-mono);font-size:12px">{{ numValue()!.toString(8) }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Bits needed</div>
                <div style="font-family:var(--font-mono);font-size:12px">{{ bitsNeeded() }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-faint);margin-bottom:3px">Bytes needed</div>
                <div style="font-family:var(--font-mono);font-size:12px">{{ bytesNeeded() }}</div>
              </div>
            </div>
          }
          @if (error()) {
            <div style="padding:8px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:6px;color:#c0392b;font-size:12px">{{ error() }}</div>
          }
        </div>
      </div>
    } @else {
      <!-- Input -->
      <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border);min-width:0">
        <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0">Input</div>
        <textarea [(ngModel)]="input" (ngModelChange)="process()"
          [placeholder]="mode()==='text-to-hex'?'Enter text to convert to hex…':'Enter hex bytes (e.g. 48 65 6c 6c 6f)…'"
          style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:13px;background:transparent;color:var(--text);line-height:1.6"></textarea>
      </div>
      <!-- Output -->
      <div style="flex:1;display:flex;flex-direction:column;min-width:0">
        <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:8px">
          Output
          <div style="flex:1"></div>
          @if (output()) {
            <button (click)="copyOutput()" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
              <dt-icon [name]="copied()?'check':'clipboard'" [size]="11" color="var(--text-muted)" /> {{ copied()?'Copied!':'Copy' }}
            </button>
          }
        </div>
        @if (error()) {
          <div style="margin:14px;padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px">{{ error() }}</div>
        }
        <pre style="flex:1;padding:14px;font-family:var(--font-mono);font-size:13px;color:var(--text);overflow:auto;margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.6">{{ output() }}</pre>
      </div>
    }
  </div>
  <!-- Footer -->
  @if (mode()!=='dec-hex') {
    <div style="padding:6px 22px;border-top:1px solid var(--border);display:flex;gap:20px;font-size:11px;color:var(--text-faint);flex-shrink:0">
      <span>Input: {{ input.length }} chars</span>
      @if (mode()==='text-to-hex') {
        <span>Bytes: {{ input.length }}</span>
        <span>Hex chars: {{ hexCharCount() }}</span>
      } @else {
        <span>Bytes: {{ byteCount() }}</span>
      }
    </div>
  }
</div>
`,
})
export class HexComponent {
  mode = signal<HexMode>('text-to-hex');
  input = '';
  spaceSeparated = true;
  uppercase = false;
  output = signal('');
  error = signal('');
  copied = signal(false);
  byteCount = signal(0);

  hexCharCount = computed(() => this.output().split(' ').join('').length);

  // Decimal ↔ Hex mode
  decInput = '';
  hexInput = '';
  numValue = signal<number | null>(null);
  bitsNeeded = signal(0);
  bytesNeeded = signal(0);

  setMode(m: HexMode) { this.mode.set(m); this.output.set(''); this.error.set(''); this.numValue.set(null); }

  process() {
    this.error.set('');
    if (!this.input) { this.output.set(''); return; }
    try {
      if (this.mode() === 'text-to-hex') {
        const bytes = Array.from(new TextEncoder().encode(this.input));
        let hex = bytes.map(b => b.toString(16).padStart(2, '0'));
        if (this.uppercase) hex = hex.map(h => h.toUpperCase());
        this.output.set(this.spaceSeparated ? hex.join(' ') : hex.join(''));
        this.byteCount.set(bytes.length);
      } else {
        const clean = this.input.replace(/\s+/g, '').replace(/^0x/i, '');
        if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Invalid hex input');
        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16));
        this.byteCount.set(bytes.length);
        this.output.set(new TextDecoder().decode(new Uint8Array(bytes)));
      }
    } catch (e: any) {
      this.error.set('Error: ' + (e.message || 'Conversion failed'));
      this.output.set('');
    }
  }

  fromDec() {
    this.error.set('');
    const n = parseInt(this.decInput, 10);
    if (isNaN(n)) { this.numValue.set(null); return; }
    this.numValue.set(n);
    this.hexInput = '0x' + n.toString(16).toUpperCase();
    this.updateBits(n);
  }

  fromHex() {
    this.error.set('');
    const clean = this.hexInput.replace(/^0x/i, '');
    const n = parseInt(clean, 16);
    if (isNaN(n)) { this.numValue.set(null); return; }
    this.numValue.set(n);
    this.decInput = n.toString(10);
    this.updateBits(n);
  }

  updateBits(n: number) {
    const bits = n === 0 ? 1 : Math.floor(Math.log2(Math.abs(n))) + 1;
    this.bitsNeeded.set(bits);
    this.bytesNeeded.set(Math.ceil(bits / 8));
  }

  copyOutput() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
