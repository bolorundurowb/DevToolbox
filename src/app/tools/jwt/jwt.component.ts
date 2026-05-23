import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface JwtParsed {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  rawParts: string[];
}

@Component({
    selector: 'dt-tool-jwt',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding & Decoding', 'JWT Decoder']" [toolId]="'jwt'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="key" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">JWT Decoder</div>
      <div style="font-size:12px;color:var(--text-muted)">Decode and verify JSON Web Tokens</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="parseToken()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Decode
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <!-- Left: input + colored token + verify -->
    <div style="width:42%;min-width:280px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow-y:auto">
      <!-- Token input -->
      <div style="padding:12px 14px 0">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">JWT Token</div>
        <textarea [(ngModel)]="tokenInput" (ngModelChange)="parseToken()"
          placeholder="Paste your JWT token here…"
          style="width:100%;height:120px;resize:none;border:1px solid var(--border);border-radius:7px;outline:none;padding:10px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;box-sizing:border-box"></textarea>
      </div>
      <!-- Color-coded token display -->
      @if (parsed()) {
        <div style="margin:10px 14px;padding:10px 12px;background:var(--surface);border-radius:7px;font-family:var(--font-mono);font-size:11.5px;word-break:break-all;line-height:1.6;border:1px solid var(--border)">
          <span style="color:var(--maroon)">{{ parsed()!.rawParts[0] }}</span>.<span style="color:var(--teal)">{{ parsed()!.rawParts[1] }}</span>.<span style="color:var(--text-faint)">{{ parsed()!.rawParts[2] }}</span>
        </div>
        <div style="padding:0 14px;display:flex;gap:6px;flex-wrap:wrap;font-size:11px">
          <span style="background:var(--maroon-soft);color:var(--maroon);padding:2px 8px;border-radius:20px">Header</span>
          <span style="background:var(--teal-soft);color:var(--teal);padding:2px 8px;border-radius:20px">Payload</span>
          <span style="background:var(--surface-muted);color:var(--text-faint);padding:2px 8px;border-radius:20px">Signature</span>
        </div>
      }
      <!-- Signature verification -->
      <div style="padding:12px 14px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Verify Signature (HMAC-SHA256)</div>
        <input [(ngModel)]="secretKey" placeholder="Enter secret key…"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
        <button (click)="verifySignature()" style="margin-top:6px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;color:var(--text);width:100%">Verify</button>
        @if (verifyResult() !== null) {
          <div [style.background]="verifyResult()?'rgba(20,160,100,.1)':'rgba(180,30,30,.1)'"
               [style.color]="verifyResult()?'#0e9467':'#c0392b'"
               [style.border]="verifyResult()?'1px solid rgba(20,160,100,.3)':'1px solid rgba(180,30,30,.3)'"
               style="margin-top:6px;padding:7px 12px;border-radius:6px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px">
            <dt-icon [name]="verifyResult()?'check-circle':'x-circle'" [size]="14" [color]="verifyResult()?'#0e9467':'#c0392b'" />
            {{ verifyResult() ? 'Signature valid' : 'Signature invalid' }}
          </div>
        }
      </div>
    </div>

    <!-- Right: decoded claims -->
    <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;min-width:0">
      @if (error()) {
        <div style="margin:14px;padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px">{{ error() }}</div>
      }
      @if (parsed()) {
        <!-- Header -->
        <div style="padding:12px 14px 0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="background:var(--maroon-soft);color:var(--maroon);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">HEADER</span>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:10px;font-family:var(--font-mono);font-size:12.5px;line-height:1.7">
            @for (kv of headerEntries(); track kv[0]) {
              <div><span style="color:var(--maroon)">{{ kv[0] }}</span><span style="color:var(--text-faint)">: </span><span style="color:var(--text)">{{ formatValue(kv[1]) }}</span></div>
            }
          </div>
        </div>
        <!-- Payload -->
        <div style="padding:12px 14px 0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="background:var(--teal-soft);color:var(--teal);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">PAYLOAD</span>
            @if (expiryText()) {
              <span [style.background]="isExpired()?'rgba(180,30,30,.1)':'rgba(20,160,100,.1)'"
                    [style.color]="isExpired()?'#c0392b':'#0e9467'"
                    style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500">{{ expiryText() }}</span>
            }
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:10px;font-family:var(--font-mono);font-size:12.5px;line-height:1.7">
            @for (kv of payloadEntries(); track kv[0]) {
              <div>
                <span style="color:var(--teal)">{{ kv[0] }}</span><span style="color:var(--text-faint)">: </span>
                <span style="color:var(--text)">{{ formatClaimValue(kv[0], kv[1]) }}</span>
                @if (isTimeClaim(kv[0])) {
                  <span style="color:var(--text-faint);font-size:11px"> ({{ formatDate(kv[1]) }})</span>
                }
              </div>
            }
          </div>
        </div>
        <!-- Signature -->
        <div style="padding:12px 14px">
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Signature</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:10px;font-family:var(--font-mono);font-size:11.5px;color:var(--text-faint);word-break:break-all">{{ parsed()!.signature }}</div>
        </div>
      } @else if (!error()) {
        <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-faint);font-size:13px;padding:40px">
          <dt-icon name="key" [size]="40" color="var(--text-faint)" />
          <div>Paste a JWT token on the left to decode it</div>
        </div>
      }
    </div>
  </div>
</div>
`
})
export class JwtComponent {
  tokenInput = '';
  secretKey = '';
  parsed = signal<JwtParsed | null>(null);
  error = signal('');
  verifyResult = signal<boolean | null>(null);

  headerEntries = computed(() => {
    const p = this.parsed();
    return p ? Object.entries(p.header) : [];
  });
  payloadEntries = computed(() => {
    const p = this.parsed();
    return p ? Object.entries(p.payload) : [];
  });
  expiryText = computed(() => {
    const p = this.parsed();
    if (!p || !p.payload['exp']) return '';
    const exp = p.payload['exp'] as number;
    const now = Math.floor(Date.now() / 1000);
    const diff = exp - now;
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `expires in ${h}h ${m}m`;
  });
  isExpired = computed(() => {
    const p = this.parsed();
    if (!p || !p.payload['exp']) return false;
    return (p.payload['exp'] as number) < Math.floor(Date.now() / 1000);
  });

  parseJwt(token: string): JwtParsed {
    const parts = token.trim().split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 parts separated by dots');
    const decode = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2], rawParts: parts };
  }

  parseToken() {
    this.error.set('');
    this.verifyResult.set(null);
    if (!this.tokenInput.trim()) { this.parsed.set(null); return; }
    try {
      this.parsed.set(this.parseJwt(this.tokenInput));
    } catch (e: any) {
      this.error.set(e.message || 'Failed to parse JWT');
      this.parsed.set(null);
    }
  }

  async verifySignature() {
    const p = this.parsed();
    if (!p || !this.secretKey) return;
    try {
      const parts = this.tokenInput.trim().split('.');
      const signingInput = parts[0] + '.' + parts[1];
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(this.secretKey),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      this.verifyResult.set(sigB64 === parts[2]);
    } catch {
      this.verifyResult.set(false);
    }
  }

  isTimeClaim(key: string): boolean {
    return ['iat', 'exp', 'nbf'].includes(key);
  }

  formatDate(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
  }

  formatValue(v: any): string {
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  formatClaimValue(key: string, v: any): string {
    return this.formatValue(v);
  }
}
