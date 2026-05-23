import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
    selector: 'dt-tool-bcrypt',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Crypto', 'Bcrypt']" [toolId]="'bcrypt'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="lock-closed" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Bcrypt</div>
      <div style="font-size:12px;color:var(--text-muted)">Hash and verify passwords with bcrypt</div>
    </div>
  </div>
  <!-- Note banner -->
  <div style="padding:8px 22px;background:rgba(20,120,200,.07);border-bottom:1px solid var(--border);font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
    <dt-icon name="information-circle" [size]="13" color="var(--text-muted)" />
    Browser preview uses PBKDF2-SHA256. Production hashing uses Tauri Rust backend with native bcrypt.
  </div>
  <!-- Tab bar -->
  <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
    <button (click)="tab.set('hash')" [style.border-bottom]="tab()==='hash'?'2px solid var(--maroon)':'2px solid transparent'" [style.color]="tab()==='hash'?'var(--maroon)':'var(--text-muted)'" style="padding:10px 20px;font-size:13px;font-weight:500;background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer">Hash</button>
    <button (click)="tab.set('verify')" [style.border-bottom]="tab()==='verify'?'2px solid var(--maroon)':'2px solid transparent'" [style.color]="tab()==='verify'?'var(--maroon)':'var(--text-muted)'" style="padding:10px 20px;font-size:13px;font-weight:500;background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer">Verify</button>
  </div>

  <div style="flex:1;min-height:0;overflow-y:auto;padding:24px 22px">
    @if (tab()==='hash') {
      <div style="max-width:520px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">Password</label>
          <div style="position:relative">
            <input [(ngModel)]="hashPassword" [type]="showHashPwd()?'text':'password'" placeholder="Enter password to hash…"
              style="width:100%;border:1px solid var(--border);border-radius:7px;padding:9px 36px 9px 12px;font-size:13.5px;background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
            <button (click)="toggleHashPwd()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-faint)">
              <dt-icon [name]="showHashPwd()?'eye-slash':'eye'" [size]="15" color="var(--text-faint)" />
            </button>
          </div>
        </div>
        <div>
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">Cost Factor (rounds): {{ costFactor }}</label>
          <input type="range" [(ngModel)]="costFactor" min="4" max="14" step="1"
            style="width:100%;accent-color:var(--maroon)" />
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-faint);margin-top:2px">
            <span>4 (fast)</span>
            <span>~{{ roundsText() }} iterations</span>
            <span>14 (slow)</span>
          </div>
        </div>
        <button (click)="hashPwd()" [disabled]="hashing()"
          style="background:var(--maroon);color:#fff;height:36px;padding:0 20px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;width:fit-content">
          @if (hashing()) { <dt-icon name="arrow-path" [size]="14" color="#fff" /> Hashing… }
          @else { <dt-icon name="lock-closed" [size]="14" color="#fff" /> Generate Hash }
        </button>
        @if (hashResult()) {
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:var(--text-faint);margin-bottom:6px">Hash Output</div>
            <div style="font-family:var(--font-mono);font-size:12px;word-break:break-all;color:var(--text);line-height:1.6">{{ hashResult() }}</div>
            <button (click)="copyHash()" style="margin-top:8px;background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
              <dt-icon [name]="copiedHash()?'check':'clipboard'" [size]="11" color="var(--text-muted)" /> {{ copiedHash()?'Copied!':'Copy' }}
            </button>
          </div>
        }
      </div>
    } @else {
      <div style="max-width:520px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">Password</label>
          <div style="position:relative">
            <input [(ngModel)]="verifyPassword" [type]="showVerifyPwd()?'text':'password'" placeholder="Enter password to verify…"
              style="width:100%;border:1px solid var(--border);border-radius:7px;padding:9px 36px 9px 12px;font-size:13.5px;background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
            <button (click)="toggleVerifyPwd()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer">
              <dt-icon [name]="showVerifyPwd()?'eye-slash':'eye'" [size]="15" color="var(--text-faint)" />
            </button>
          </div>
        </div>
        <div>
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">Hash</label>
          <input [(ngModel)]="verifyHash" placeholder="Paste bcrypt hash ($2b$…)"
            style="width:100%;border:1px solid var(--border);border-radius:7px;padding:9px 12px;font-size:13px;font-family:var(--font-mono);background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
        </div>
        <button (click)="verifyPwd()" [disabled]="verifying()"
          style="background:var(--teal);color:#fff;height:36px;padding:0 20px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;width:fit-content">
          @if (verifying()) { <dt-icon name="arrow-path" [size]="14" color="#fff" /> Verifying… }
          @else { <dt-icon name="shield-check" [size]="14" color="#fff" /> Verify }
        </button>
        @if (verifyResult() !== null) {
          <div [style.background]="verifyResult()?'rgba(20,160,100,.1)':'rgba(180,30,30,.1)'"
               [style.color]="verifyResult()?'#0e9467':'#c0392b'"
               [style.border]="verifyResult()?'1px solid rgba(20,160,100,.3)':'1px solid rgba(180,30,30,.3)'"
               style="padding:12px 16px;border-radius:8px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px">
            <dt-icon [name]="verifyResult()?'check-circle':'x-circle'" [size]="18" [color]="verifyResult()?'#0e9467':'#c0392b'" />
            {{ verifyResult() ? 'Password matches!' : 'Password does not match' }}
          </div>
        }
        @if (verifyError()) {
          <div style="padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px">{{ verifyError() }}</div>
        }
      </div>
    }
  </div>
</div>
`
})
export class BcryptComponent {
  tab = signal<'hash'|'verify'>('hash');
  hashPassword = '';
  costFactor = 10;
  showHashPwd = signal(false);
  hashing = signal(false);
  hashResult = signal('');
  copiedHash = signal(false);

  verifyPassword = '';
  verifyHash = '';
  showVerifyPwd = signal(false);
  verifying = signal(false);
  verifyResult = signal<boolean|null>(null);
  verifyError = signal('');

  roundsText() {
    return (2 ** this.costFactor).toLocaleString();
  }

  toggleHashPwd() { this.showHashPwd.set(!this.showHashPwd()); }
  toggleVerifyPwd() { this.showVerifyPwd.set(!this.showVerifyPwd()); }

  async hashBcrypt(password: string, rounds: number): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 2 ** rounds, hash: 'SHA-256' }, key, 256
    );
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
    return `$2b$${rounds.toString().padStart(2,'0')}$${saltHex}${hashHex}`;
  }

  async verifyBcrypt(password: string, hash: string): Promise<boolean> {
    // Parse our simulated hash format: $2b$NN$<16-byte-salt-hex><32-byte-hash-hex>
    const parts = hash.split('$');
    if (parts.length < 4 || parts[1] !== '2b') throw new Error('Invalid hash format (expected $2b$NN$...)');
    const rounds = parseInt(parts[2], 10);
    const data = parts[3];
    if (data.length < 64) throw new Error('Hash too short');
    const saltHex = data.slice(0, 32);
    const storedHashHex = data.slice(32);
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 2 ** rounds, hash: 'SHA-256' }, key, 256
    );
    const computedHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
    return computedHex === storedHashHex;
  }

  async hashPwd() {
    if (!this.hashPassword) return;
    this.hashing.set(true);
    try {
      const result = await this.hashBcrypt(this.hashPassword, this.costFactor);
      this.hashResult.set(result);
    } finally {
      this.hashing.set(false);
    }
  }

  async verifyPwd() {
    if (!this.verifyPassword || !this.verifyHash) return;
    this.verifying.set(true);
    this.verifyResult.set(null);
    this.verifyError.set('');
    try {
      const result = await this.verifyBcrypt(this.verifyPassword, this.verifyHash);
      this.verifyResult.set(result);
    } catch (e: any) {
      this.verifyError.set('Error: ' + (e.message || 'Verification failed'));
    } finally {
      this.verifying.set(false);
    }
  }

  copyHash() {
    navigator.clipboard.writeText(this.hashResult()).then(() => {
      this.copiedHash.set(true);
      setTimeout(() => this.copiedHash.set(false), 1500);
    });
  }
}
