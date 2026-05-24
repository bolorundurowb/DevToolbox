import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { CodeEditorComponent } from '../../core/components/code-editor/code-editor.component';

type Alg = 'HS256' | 'HS384' | 'HS512';

const ALG_HASH: Record<Alg, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

function toBase64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function jsonToBase64Url(obj: object): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

function buildSamplePayload(): string {
  const now = nowSecs();
  return JSON.stringify(
    {
      sub: '1234567890',
      name: 'Jane Developer',
      iat: now,
      exp: now + 3600,
    },
    null,
    2
  );
}

@Component({
  selector: 'dt-tool-jwt-builder',
  imports: [FormsModule, TopbarComponent, IconComponent, CodeEditorComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding & Decoding', 'JWT Builder']" [toolId]="'jwt-builder'" />

  <!-- Header bar -->
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="key" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">JWT Builder</div>
      <div style="font-size:12px;color:var(--text-muted)">Encode and sign JSON Web Tokens with WebCrypto</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="sign()" style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="play" [size]="12" color="#fff" /> Sign Token
    </button>
  </div>

  <!-- Two-pane body -->
  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left pane: config (~55%) -->
    <div style="width:55%;min-width:300px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow-y:auto">

      <!-- Algorithm -->
      <div style="padding:14px 18px 0">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Algorithm</div>
        <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden;width:fit-content">
          @for (a of algorithms; track a) {
            <button (click)="setAlg(a)"
              [style.background]="alg() === a ? 'var(--maroon)' : 'transparent'"
              [style.color]="alg() === a ? '#fff' : 'var(--text-muted)'"
              style="padding:6px 16px;font-size:12.5px;font-weight:500;border:none;cursor:pointer">{{ a }}</button>
          }
        </div>
      </div>

      <!-- Payload editor -->
      <div style="padding:14px 18px 0;display:flex;flex-direction:column;flex:1;min-height:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em">Payload</div>
          <!-- Quick-claim buttons -->
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button (click)="addClaim('sub')"
              style="height:20px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer">+ sub</button>
            <button (click)="addClaim('iat')"
              style="height:20px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer">+ iat (now)</button>
            <button (click)="addClaim('exp')"
              style="height:20px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer">+ exp (+1h)</button>
            <button (click)="addClaim('nbf')"
              style="height:20px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer">+ nbf (now)</button>
            <button (click)="addClaim('jti')"
              style="height:20px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer">+ jti (uuid)</button>
          </div>
        </div>
        <div style="flex:1;min-height:200px;display:flex;flex-direction:column">
          <dt-code-editor language="json" style="flex:1;min-height:0" [value]="payloadJson()" (valueChange)="payloadJson.set($event)" />
        </div>
      </div>

      <!-- Secret -->
      <div style="padding:14px 18px 18px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Secret</div>
        <div style="position:relative">
          <input [type]="secretVisible() ? 'text' : 'password'" [ngModel]="secret()" (ngModelChange)="secret.set($event)"
            placeholder="your-256-bit-secret"
            style="width:100%;border:1px solid var(--border);border-radius:7px;padding:9px 40px 9px 12px;font-size:13px;font-family:var(--font-mono);background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
          <button (click)="secretVisible.set(!secretVisible())"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center">
            <dt-icon [name]="secretVisible() ? 'eye-slash' : 'eye'" [size]="15" color="var(--text-faint)" />
          </button>
        </div>
      </div>
    </div>

    <!-- Right pane: output (~45%) -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;overflow-y:auto">

      <!-- Error banner -->
      @if (errorMsg()) {
        <div style="margin:14px;padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px;flex-shrink:0">
          {{ errorMsg() }}
        </div>
      }

      @if (token()) {
        <!-- Token output -->
        <div style="padding:14px 18px 0;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em">Signed Token</div>
            <div style="flex:1"></div>
            <button (click)="copyToken()"
              style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11.5px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
              <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
              {{ copied() ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;font-family:var(--font-mono);font-size:12px;word-break:break-all;line-height:1.7">
            <span style="color:var(--maroon)">{{ tokenParts()[0] }}</span>.<span style="color:var(--teal)">{{ tokenParts()[1] }}</span>.<span style="color:var(--text-faint)">{{ tokenParts()[2] }}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;font-size:11px">
            <span style="background:var(--maroon-soft);color:var(--maroon);padding:2px 8px;border-radius:20px">Header</span>
            <span style="background:var(--teal-soft);color:var(--teal);padding:2px 8px;border-radius:20px">Payload</span>
            <span style="background:var(--surface);border:1px solid var(--border);color:var(--text-faint);padding:2px 8px;border-radius:20px">Signature</span>
          </div>
        </div>

        <!-- Decoded sections -->
        <div style="padding:14px 18px 0;flex-shrink:0">
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
            <span style="color:var(--maroon)">Header</span>
          </div>
          <pre style="margin:0;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:12px;font-family:var(--font-mono);font-size:12px;color:var(--text);line-height:1.6;overflow-x:auto">{{ headerJson() }}</pre>
        </div>

        <div style="padding:14px 18px 18px;flex-shrink:0">
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
            <span style="color:var(--teal)">Payload</span>
          </div>
          <pre style="margin:0;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:12px;font-family:var(--font-mono);font-size:12px;color:var(--text);line-height:1.6;overflow-x:auto">{{ prettyPayload() }}</pre>
        </div>

      } @else if (!errorMsg()) {
        <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--text-faint);font-size:13px;padding:40px">
          <dt-icon name="key" [size]="40" color="var(--text-faint)" />
          <div>Fill in the payload and click <strong>Sign Token</strong></div>
        </div>
      }
    </div>
  </div>
</div>
`
})
export class JwtBuilderComponent {
  readonly algorithms: Alg[] = ['HS256', 'HS384', 'HS512'];

  alg = signal<Alg>('HS256');
  payloadJson = signal(buildSamplePayload());
  secret = signal('your-256-bit-secret');
  secretVisible = signal(false);
  token = signal('');
  errorMsg = signal('');
  copied = signal(false);

  tokenParts(): string[] {
    const t = this.token();
    if (!t) return ['', '', ''];
    const parts = t.split('.');
    return parts.length === 3 ? parts : ['', '', ''];
  }

  headerJson(): string {
    return JSON.stringify({ alg: this.alg(), typ: 'JWT' }, null, 2);
  }

  prettyPayload(): string {
    try {
      return JSON.stringify(JSON.parse(this.payloadJson()), null, 2);
    } catch {
      return this.payloadJson();
    }
  }

  setAlg(a: Alg): void {
    this.alg.set(a);
    this.sign();
  }

  addClaim(claim: string): void {
    let obj: Record<string, unknown> = {};
    try {
      obj = JSON.parse(this.payloadJson());
    } catch {
      // start fresh if invalid
    }
    const now = nowSecs();
    switch (claim) {
      case 'sub':
        obj['sub'] = obj['sub'] ?? '1234567890';
        break;
      case 'iat':
        obj['iat'] = now;
        break;
      case 'exp':
        obj['exp'] = now + 3600;
        break;
      case 'nbf':
        obj['nbf'] = now;
        break;
      case 'jti':
        obj['jti'] = generateUuid();
        break;
    }
    this.payloadJson.set(JSON.stringify(obj, null, 2));
  }

  async sign(): Promise<void> {
    this.errorMsg.set('');
    this.token.set('');

    const secretVal = this.secret();
    const payloadStr = this.payloadJson();

    let payloadObj: unknown;
    try {
      payloadObj = JSON.parse(payloadStr);
    } catch {
      this.errorMsg.set('Invalid JSON in payload');
      return;
    }

    if (typeof payloadObj !== 'object' || payloadObj === null || Array.isArray(payloadObj)) {
      this.errorMsg.set('Payload must be a JSON object');
      return;
    }

    if (!secretVal) {
      this.errorMsg.set('Please enter a secret');
      return;
    }

    try {
      const header = { alg: this.alg(), typ: 'JWT' };
      const headerB64 = jsonToBase64Url(header);
      const payloadB64 = jsonToBase64Url(payloadObj as object);
      const signingInput = `${headerB64}.${payloadB64}`;

      const hash = ALG_HASH[this.alg()];
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secretVal),
        { name: 'HMAC', hash },
        false,
        ['sign']
      );
      const sigBytes = await crypto.subtle.sign(
        'HMAC',
        keyMaterial,
        new TextEncoder().encode(signingInput)
      );
      const sigB64 = toBase64Url(new Uint8Array(sigBytes));
      this.token.set(`${signingInput}.${sigB64}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Signing failed';
      this.errorMsg.set('Error: ' + msg);
    }
  }

  copyToken(): void {
    const t = this.token();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
