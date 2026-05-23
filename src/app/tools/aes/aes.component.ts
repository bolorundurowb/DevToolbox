import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

@Component({
    selector: 'dt-tool-aes',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Hashing & Crypto', 'AES Encrypt/Decrypt']" [toolId]="'aes'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="lock-closed" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">AES Encrypt / Decrypt</div>
      <div style="font-size:12px;color:var(--text-muted)">AES-GCM authenticated encryption with passphrase or raw key</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
    <button (click)="tab.set('encrypt')"
      [style.border-bottom]="tab()==='encrypt' ? '2px solid var(--maroon)' : '2px solid transparent'"
      [style.color]="tab()==='encrypt' ? 'var(--maroon)' : 'var(--text-muted)'"
      style="padding:10px 18px;font-size:13px;font-weight:500;background:transparent;border:none;border-top:none;border-left:none;border-right:none;cursor:pointer">
      Encrypt
    </button>
    <button (click)="tab.set('decrypt')"
      [style.border-bottom]="tab()==='decrypt' ? '2px solid var(--maroon)' : '2px solid transparent'"
      [style.color]="tab()==='decrypt' ? 'var(--maroon)' : 'var(--text-muted)'"
      style="padding:10px 18px;font-size:13px;font-weight:500;background:transparent;border:none;border-top:none;border-left:none;border-right:none;cursor:pointer">
      Decrypt
    </button>
  </div>

  <div style="flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px">
    <!-- Key settings -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:10px">Key Settings</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;color:var(--text-muted)">Key size:</span>
          <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button (click)="keyBits.set(128)" [style.background]="keyBits()===128?'var(--maroon)':'transparent'" [style.color]="keyBits()===128?'#fff':'var(--text-muted)'" style="padding:3px 10px;font-size:12px;border:none;cursor:pointer">128</button>
            <button (click)="keyBits.set(256)" [style.background]="keyBits()===256?'var(--maroon)':'transparent'" [style.color]="keyBits()===256?'#fff':'var(--text-muted)'" style="padding:3px 10px;font-size:12px;border:none;cursor:pointer">256</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;color:var(--text-muted)">Key input:</span>
          <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button (click)="keyMode.set('passphrase')" [style.background]="keyMode()==='passphrase'?'var(--maroon)':'transparent'" [style.color]="keyMode()==='passphrase'?'#fff':'var(--text-muted)'" style="padding:3px 10px;font-size:12px;border:none;cursor:pointer">Passphrase</button>
            <button (click)="keyMode.set('hex')" [style.background]="keyMode()==='hex'?'var(--maroon)':'transparent'" [style.color]="keyMode()==='hex'?'#fff':'var(--text-muted)'" style="padding:3px 10px;font-size:12px;border:none;cursor:pointer">Hex Key</button>
          </div>
        </div>
      </div>
      @if (keyMode() === 'passphrase') {
        <input type="password" [(ngModel)]="passphrase" placeholder="Enter passphrase…"
          style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--text);outline:none" />
        <div style="margin-top:6px;font-size:11px;color:var(--text-faint)">PBKDF2 · SHA-256 · 100,000 iterations · random 16-byte salt</div>
      } @else {
        <input type="text" [(ngModel)]="hexKey" placeholder="Hex key (32 or 64 hex chars for 128/256 bit)…"
          style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-family:var(--font-mono);font-size:12.5px;background:var(--bg);color:var(--text);outline:none" />
      }
    </div>

    <!-- Plaintext / Ciphertext input -->
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">{{ tab() === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)' }}</div>
      <textarea [(ngModel)]="inputText" [rows]="5"
        [placeholder]="tab() === 'encrypt' ? 'Enter text to encrypt…' : 'Paste base64 ciphertext…'"
        style="width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;outline:none"></textarea>
    </div>

    <button (click)="run()" [disabled]="running()"
      style="align-self:flex-start;background:var(--teal);color:#fff;height:34px;padding:0 20px;border-radius:7px;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:7px;border:none;cursor:pointer">
      <dt-icon [name]="tab()==='encrypt'?'lock-closed':'key'" [size]="13" color="#fff" />
      {{ running() ? 'Working…' : (tab() === 'encrypt' ? 'Encrypt' : 'Decrypt') }}
    </button>

    @if (error()) {
      <div style="padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;color:#b91c1c;font-size:12.5px">{{ error() }}</div>
    }

    @if (outputText()) {
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;display:flex;align-items:center;gap:8px">
          {{ tab() === 'encrypt' ? 'Ciphertext (Base64)' : 'Decrypted Plaintext' }}
          <button (click)="copyOutput()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <textarea readonly [value]="outputText()" rows="5"
          style="width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;outline:none"></textarea>
      </div>
      @if (keyDetails()) {
        <div style="font-size:11.5px;color:var(--text-faint);line-height:1.7">
          <strong>Key derivation details:</strong> {{ keyDetails() }}
        </div>
      }
    }
  </div>
</div>
`
})
export class AesComponent {
  tab = signal<'encrypt' | 'decrypt'>('encrypt');
  keyBits = signal(256);
  keyMode = signal<'passphrase' | 'hex'>('passphrase');
  passphrase = '';
  hexKey = '';
  inputText = '';
  outputText = signal('');
  error = signal('');
  running = signal(false);
  copied = signal(false);
  keyDetails = signal('');

  async run() {
    this.error.set('');
    this.outputText.set('');
    this.keyDetails.set('');
    if (!this.inputText.trim()) { this.error.set('Input is empty.'); return; }
    this.running.set(true);
    try {
      if (this.tab() === 'encrypt') await this.encrypt();
      else await this.decrypt();
    } catch (e: any) {
      this.error.set('Error: ' + (e?.message ?? String(e)));
    } finally {
      this.running.set(false);
    }
  }

  private async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const rawKey = toBufferSource(enc.encode(this.passphrase));
    const baseKey = await crypto.subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toBufferSource(salt), iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: this.keyBits() },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async importHexKey(): Promise<CryptoKey> {
    const bytes = toBufferSource(hexToBytes(this.hexKey));
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM', length: this.keyBits() }, false, ['encrypt', 'decrypt']);
  }

  private async encrypt() {
    const iv = toBufferSource(crypto.getRandomValues(new Uint8Array(12)));
    let key: CryptoKey;
    let salt: Uint8Array | null = null;
    if (this.keyMode() === 'passphrase') {
      salt = toBufferSource(crypto.getRandomValues(new Uint8Array(16)));
      key = await this.deriveKey(salt);
      this.keyDetails.set(`PBKDF2 · SHA-256 · 100,000 iterations · Salt: ${bytesToHex(salt)} · IV: ${bytesToHex(iv)}`);
    } else {
      key = await this.importHexKey();
      this.keyDetails.set(`Direct hex key · IV: ${bytesToHex(iv)}`);
    }
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toBufferSource(enc.encode(this.inputText)));
    // Format: [1 byte: has_salt][16 byte salt if present][12 byte IV][ciphertext]
    const hasSalt = salt ? 1 : 0;
    const total = 1 + (salt ? 16 : 0) + 12 + ct.byteLength;
    const out = new Uint8Array(total);
    let off = 0;
    out[off++] = hasSalt;
    if (salt) { out.set(salt, off); off += 16; }
    out.set(iv, off); off += 12;
    out.set(new Uint8Array(ct), off);
    this.outputText.set(bytesToBase64(out));
  }

  private async decrypt() {
    const data = base64ToBytes(this.inputText.trim());
    let off = 0;
    const hasSalt = data[off++];
    let salt: Uint8Array | null = null;
    if (hasSalt) { salt = toBufferSource(data.slice(off, off + 16)); off += 16; }
    const iv = toBufferSource(data.slice(off, off + 12)); off += 12;
    const ct = toBufferSource(data.slice(off));
    let key: CryptoKey;
    if (this.keyMode() === 'passphrase') {
      if (!salt) throw new Error('No salt found in ciphertext. Was this encrypted with a hex key?');
      key = await this.deriveKey(salt);
    } else {
      key = await this.importHexKey();
    }
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    this.outputText.set(new TextDecoder().decode(plain));
  }

  copyOutput() {
    navigator.clipboard.writeText(this.outputText()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
