import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function wrapPem(b64: string, type: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) lines.push(b64.slice(i, i + 64));
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

@Component({
    selector: 'dt-tool-rsa-keygen',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Hashing & Crypto', 'RSA Key Generator']" [toolId]="'rsa'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="key" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">RSA Key Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate RSA public/private key pairs (PKCS#8 / SPKI)</div>
    </div>
  </div>

  <div style="padding:16px 22px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12.5px;color:var(--text-muted)">Key size:</span>
      <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
        @for (sz of keySizes; track sz) {
          <button (click)="selectedSize.set(sz)"
            [style.background]="selectedSize()===sz ? 'var(--maroon)' : 'transparent'"
            [style.color]="selectedSize()===sz ? '#fff' : 'var(--text-muted)'"
            style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">
            {{ sz }}
          </button>
        }
      </div>
    </div>
    <button (click)="generate()"
      [disabled]="generating()"
      style="background:var(--teal);color:#fff;height:32px;padding:0 18px;border-radius:7px;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="key" [size]="13" color="#fff" />
      {{ generating() ? 'Generating…' : 'Generate Keys' }}
    </button>
    @if (genTime()) {
      <span style="font-size:11.5px;color:var(--text-faint)">Generated in {{ genTime() }}ms</span>
    }
  </div>

  @if (error()) {
    <div style="margin:14px 22px;padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;color:#b91c1c;font-size:13px">{{ error() }}</div>
  }

  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:0;overflow:hidden">
    <!-- Private Key -->
    <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0">
        <dt-icon name="lock-closed" [size]="14" color="var(--maroon)" />
        <span style="font-size:13px;font-weight:600">Private Key</span>
        <span style="font-size:11px;color:var(--text-faint);background:var(--surface);border:1px solid var(--border);padding:1px 7px;border-radius:10px">PKCS#8</span>
        <div style="flex:1"></div>
        @if (privateKey()) {
          <button (click)="copyKey('private')"
            style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11.5px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copiedPrivate() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copiedPrivate() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      <textarea readonly [value]="privateKey()"
        placeholder="Private key will appear here after generation…"
        style="flex:1;resize:none;border:none;outline:none;padding:14px 16px;font-family:var(--font-mono);font-size:11px;background:var(--surface);color:var(--text);line-height:1.6;min-height:0"></textarea>
    </div>
    <!-- Public Key -->
    <div style="display:flex;flex-direction:column;min-height:0">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0">
        <dt-icon name="key" [size]="14" color="var(--teal)" />
        <span style="font-size:13px;font-weight:600">Public Key</span>
        <span style="font-size:11px;color:var(--text-faint);background:var(--surface);border:1px solid var(--border);padding:1px 7px;border-radius:10px">SPKI</span>
        <div style="flex:1"></div>
        @if (publicKey()) {
          <button (click)="copyKey('public')"
            style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11.5px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copiedPublic() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copiedPublic() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      <textarea readonly [value]="publicKey()"
        placeholder="Public key will appear here after generation…"
        style="flex:1;resize:none;border:none;outline:none;padding:14px 16px;font-family:var(--font-mono);font-size:11px;background:var(--surface);color:var(--text);line-height:1.6;min-height:0"></textarea>
    </div>
  </div>
</div>
`
})
export class RsaKeygenComponent {
  keySizes = [1024, 2048, 4096];
  selectedSize = signal(2048);
  generating = signal(false);
  privateKey = signal('');
  publicKey = signal('');
  genTime = signal(0);
  error = signal('');
  copiedPrivate = signal(false);
  copiedPublic = signal(false);

  async generate() {
    this.generating.set(true);
    this.error.set('');
    const t0 = performance.now();
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: this.selectedSize(),
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['sign', 'verify']
      );
      const [privBuf, pubBuf] = await Promise.all([
        crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
        crypto.subtle.exportKey('spki', keyPair.publicKey),
      ]);
      this.privateKey.set(wrapPem(arrayBufferToBase64(privBuf), 'PRIVATE KEY'));
      this.publicKey.set(wrapPem(arrayBufferToBase64(pubBuf), 'PUBLIC KEY'));
      this.genTime.set(Math.round(performance.now() - t0));
    } catch (e: any) {
      this.error.set('Key generation failed: ' + (e?.message ?? String(e)));
    } finally {
      this.generating.set(false);
    }
  }

  copyKey(which: 'private' | 'public') {
    const val = which === 'private' ? this.privateKey() : this.publicKey();
    navigator.clipboard.writeText(val).then(() => {
      if (which === 'private') {
        this.copiedPrivate.set(true);
        setTimeout(() => this.copiedPrivate.set(false), 1500);
      } else {
        this.copiedPublic.set(true);
        setTimeout(() => this.copiedPublic.set(false), 1500);
      }
    });
  }
}
