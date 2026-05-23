import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
    selector: 'dt-tool-hmac',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Crypto', 'HMAC']" [toolId]="'hmac'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="shield-exclamation" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">HMAC Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Compute HMAC digest with SHA-256, SHA-384, or SHA-512</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="compute()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Compute
    </button>
  </div>

  <div style="flex:1;min-height:0;overflow-y:auto;padding:20px 22px">
    <div style="max-width:640px;display:flex;flex-direction:column;gap:16px">
      <!-- Algorithm selector -->
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Algorithm</div>
        <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden;width:fit-content">
          @for (a of algorithms; track a) {
            <button (click)="algo.set(a)" (click)="computeIfReady()"
              [style.background]="algo()===a?'var(--maroon)':'transparent'"
              [style.color]="algo()===a?'#fff':'var(--text-muted)'"
              style="padding:6px 16px;font-size:12.5px;font-weight:500;border:none;cursor:pointer">{{ a }}</button>
          }
        </div>
      </div>

      <!-- Secret key -->
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Secret Key</div>
        <div style="position:relative">
          <input [(ngModel)]="key" (ngModelChange)="computeIfReady()" [type]="showKey()?'text':'password'"
            placeholder="Enter secret key…"
            style="width:100%;border:1px solid var(--border);border-radius:7px;padding:9px 40px 9px 12px;font-size:13px;font-family:var(--font-mono);background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
          <button (click)="toggleShowKey()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer">
            <dt-icon [name]="showKey()?'eye-slash':'eye'" [size]="15" color="var(--text-faint)" />
          </button>
        </div>
        @if (key) {
          <div style="margin-top:5px;display:flex;gap:8px">
            <span style="font-size:11px;color:var(--text-faint)">Key as hex:</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">{{ keyHex() }}</span>
          </div>
          <div style="margin-top:2px;display:flex;gap:8px">
            <span style="font-size:11px;color:var(--text-faint)">Key as base64:</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">{{ keyBase64() }}</span>
          </div>
        }
      </div>

      <!-- Message -->
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Message</div>
        <textarea [(ngModel)]="message" (ngModelChange)="computeIfReady()"
          placeholder="Enter message to sign…"
          rows="4"
          style="width:100%;resize:vertical;border:1px solid var(--border);border-radius:7px;outline:none;padding:10px 12px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);line-height:1.5;box-sizing:border-box"></textarea>
      </div>

      <!-- Output -->
      @if (hmacResult()) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted)">HMAC-{{ algo() }} Digest</div>
            <div style="flex:1"></div>
            <div style="display:flex;border:1px solid var(--border);border-radius:5px;overflow:hidden">
              <button (click)="outFormat.set('hex')" [style.background]="outFormat()==='hex'?'var(--maroon)':'transparent'" [style.color]="outFormat()==='hex'?'#fff':'var(--text-muted)'" style="padding:3px 8px;font-size:11px;font-weight:500;border:none;cursor:pointer">Hex</button>
              <button (click)="outFormat.set('base64')" [style.background]="outFormat()==='base64'?'var(--maroon)':'transparent'" [style.color]="outFormat()==='base64'?'#fff':'var(--text-muted)'" style="padding:3px 8px;font-size:11px;font-weight:500;border:none;cursor:pointer">Base64</button>
            </div>
            <button (click)="copyResult()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
              <dt-icon [name]="copied()?'check':'clipboard'" [size]="11" color="var(--text-muted)" /> {{ copied()?'Copied!':'Copy' }}
            </button>
          </div>
          <div style="font-family:var(--font-mono);font-size:13px;color:var(--text);word-break:break-all;line-height:1.6">{{ outFormat()==='hex' ? hmacResult()!.hex : hmacResult()!.base64 }}</div>
          <div style="margin-top:8px;font-size:11px;color:var(--text-faint)">{{ algo() }} · {{ hmacResult()!.bits }} bits · {{ outFormat()==='hex' ? hmacResult()!.hex.length + ' hex chars' : hmacResult()!.base64.length + ' base64 chars' }}</div>
        </div>
      } @else if (error()) {
        <div style="padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px">{{ error() }}</div>
      }
    </div>
  </div>
</div>
`
})
export class HmacComponent {
  algorithms = ['SHA-256', 'SHA-384', 'SHA-512'];
  algo = signal('SHA-256');
  key = '';
  message = '';
  showKey = signal(false);
  outFormat = signal<'hex'|'base64'>('hex');
  hmacResult = signal<{ hex: string; base64: string; bits: number } | null>(null);
  error = signal('');
  copied = signal(false);

  toggleShowKey() { this.showKey.set(!this.showKey()); }

  keyHex(): string {
    return Array.from(new TextEncoder().encode(this.key)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  keyBase64(): string {
    return btoa(this.key);
  }

  async computeHmac(key: string, message: string, algo: string): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: algo }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', keyMaterial, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  hexToBase64(hex: string): string {
    const bytes = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
    return btoa(String.fromCharCode(...bytes));
  }

  computeIfReady() {
    if (this.key && this.message) this.compute();
    else this.hmacResult.set(null);
  }

  async compute() {
    this.error.set('');
    if (!this.key) { this.error.set('Please enter a secret key'); return; }
    if (!this.message) { this.error.set('Please enter a message'); return; }
    try {
      const hex = await this.computeHmac(this.key, this.message, this.algo());
      const bits: Record<string, number> = { 'SHA-256': 256, 'SHA-384': 384, 'SHA-512': 512 };
      this.hmacResult.set({ hex, base64: this.hexToBase64(hex), bits: bits[this.algo()] ?? 0 });
    } catch (e: any) {
      this.error.set('Error: ' + (e.message || 'Computation failed'));
      this.hmacResult.set(null);
    }
  }

  copyResult() {
    const r = this.hmacResult();
    if (!r) return;
    const val = this.outFormat() === 'hex' ? r.hex : r.base64;
    navigator.clipboard.writeText(val).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
