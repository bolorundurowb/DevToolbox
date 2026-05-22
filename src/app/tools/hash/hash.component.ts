import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

function md5(str: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    return ((x >> 16) + (y >> 16) + (lsw >> 16)) << 16 | lsw & 0xFFFF;
  }
  function rol(n: number, c: number): number { return n << c | n >>> 32 - c; }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b&c|~b&d,a,b,x,s,t)}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b&d|c&~d,a,b,x,s,t)}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t)}
  const utf8 = unescape(encodeURIComponent(str));
  const msg: number[] = [];
  for (let i = 0; i < utf8.length; i++) msg.push(utf8.charCodeAt(i));
  msg.push(128);
  while (msg.length % 64 !== 56) msg.push(0);
  const msgLen = utf8.length * 8;
  msg.push(msgLen & 0xFF,(msgLen>>8)&0xFF,(msgLen>>16)&0xFF,(msgLen>>24)&0xFF,0,0,0,0);
  const words: number[] = [];
  for (let i = 0; i < msg.length; i += 4)
    words.push(msg[i]|msg[i+1]<<8|msg[i+2]<<16|msg[i+3]<<24);
  let [a,b,c,d] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
  for (let i = 0; i < words.length; i += 16) {
    const [a0,b0,c0,d0] = [a,b,c,d];
    const w = words.slice(i, i+16);
    a=ff(a,b,c,d,w[0],7,-680876936);d=ff(d,a,b,c,w[1],12,-389564586);c=ff(c,d,a,b,w[2],17,606105819);b=ff(b,c,d,a,w[3],22,-1044525330);
    a=ff(a,b,c,d,w[4],7,-176418897);d=ff(d,a,b,c,w[5],12,1200080426);c=ff(c,d,a,b,w[6],17,-1473231341);b=ff(b,c,d,a,w[7],22,-45705983);
    a=ff(a,b,c,d,w[8],7,1770035416);d=ff(d,a,b,c,w[9],12,-1958414417);c=ff(c,d,a,b,w[10],17,-42063);b=ff(b,c,d,a,w[11],22,-1990404162);
    a=ff(a,b,c,d,w[12],7,1804603682);d=ff(d,a,b,c,w[13],12,-40341101);c=ff(c,d,a,b,w[14],17,-1502002290);b=ff(b,c,d,a,w[15],22,1236535329);
    a=gg(a,b,c,d,w[1],5,-165796510);d=gg(d,a,b,c,w[6],9,-1069501632);c=gg(c,d,a,b,w[11],14,643717713);b=gg(b,c,d,a,w[0],20,-373897302);
    a=gg(a,b,c,d,w[5],5,-701558691);d=gg(d,a,b,c,w[10],9,38016083);c=gg(c,d,a,b,w[15],14,-660478335);b=gg(b,c,d,a,w[4],20,-405537848);
    a=gg(a,b,c,d,w[9],5,568446438);d=gg(d,a,b,c,w[14],9,-1019803690);c=gg(c,d,a,b,w[3],14,-187363961);b=gg(b,c,d,a,w[8],20,1163531501);
    a=gg(a,b,c,d,w[13],5,-1444681467);d=gg(d,a,b,c,w[2],9,-51403784);c=gg(c,d,a,b,w[7],14,1735328473);b=gg(b,c,d,a,w[12],20,-1926607734);
    a=hh(a,b,c,d,w[5],4,-378558);d=hh(d,a,b,c,w[8],11,-2022574463);c=hh(c,d,a,b,w[11],16,1839030562);b=hh(b,c,d,a,w[14],23,-35309556);
    a=hh(a,b,c,d,w[1],4,-1530992060);d=hh(d,a,b,c,w[4],11,1272893353);c=hh(c,d,a,b,w[7],16,-155497632);b=hh(b,c,d,a,w[10],23,-1094730640);
    a=hh(a,b,c,d,w[13],4,681279174);d=hh(d,a,b,c,w[0],11,-358537222);c=hh(c,d,a,b,w[3],16,-722521979);b=hh(b,c,d,a,w[6],23,76029189);
    a=hh(a,b,c,d,w[9],4,-640364487);d=hh(d,a,b,c,w[12],11,-421815835);c=hh(c,d,a,b,w[15],16,530742520);b=hh(b,c,d,a,w[2],23,-995338651);
    a=ii(a,b,c,d,w[0],6,-198630844);d=ii(d,a,b,c,w[7],10,1126891415);c=ii(c,d,a,b,w[14],15,-1416354905);b=ii(b,c,d,a,w[5],21,-57434055);
    a=ii(a,b,c,d,w[12],6,1700485571);d=ii(d,a,b,c,w[3],10,-1894986606);c=ii(c,d,a,b,w[10],15,-1051523);b=ii(b,c,d,a,w[1],21,-2054922799);
    a=ii(a,b,c,d,w[8],6,1873313359);d=ii(d,a,b,c,w[15],10,-30611744);c=ii(c,d,a,b,w[6],15,-1560198380);b=ii(b,c,d,a,w[13],21,1309151649);
    a=ii(a,b,c,d,w[4],6,-145523070);d=ii(d,a,b,c,w[11],10,-1120210379);c=ii(c,d,a,b,w[2],15,718787259);b=ii(b,c,d,a,w[9],21,-343485551);
    [a,b,c,d]=[safeAdd(a,a0),safeAdd(b,b0),safeAdd(c,c0),safeAdd(d,d0)];
  }
  return [a,b,c,d].map(n=>[n&0xFF,(n>>8)&0xFF,(n>>16)&0xFF,(n>>24)&0xFF].map(b=>b.toString(16).padStart(2,'0')).join('')).join('');
}

function crc32(str: string): string {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i; for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) crc = table[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

async function hashSha(algo: string, data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest(algo, encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(hex: string): string {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i+2), 16));
  return btoa(String.fromCharCode(...bytes));
}

interface HashResult {
  algo: string;
  bits: number;
  hex: string;
  base64: string;
  loading: boolean;
  copiedHex: boolean;
  copiedB64: boolean;
}

@Component({
  selector: 'dt-tool-hash',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Crypto', 'Hash']" [toolId]="'hash'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="finger-print" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Hash Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">MD5, SHA-1, SHA-256, SHA-512, CRC-32</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="computeAll()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Hash
    </button>
  </div>
  <!-- Toolbar -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="autoHash" /> Auto-hash on input
    </label>
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;margin-left:auto">
      <input type="file" style="display:none" (change)="onFileSelected($event)" #fileInput />
      <button (click)="fileInput.click()" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11.5px;cursor:pointer;color:var(--text-muted)">Hash file</button>
    </label>
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      <button (click)="outputFormat.set('hex')" [style.background]="outputFormat()==='hex'?'var(--maroon)':'transparent'" [style.color]="outputFormat()==='hex'?'#fff':'var(--text-muted)'" style="padding:4px 10px;font-size:12px;font-weight:500;border:none;cursor:pointer">Hex</button>
      <button (click)="outputFormat.set('base64')" [style.background]="outputFormat()==='base64'?'var(--maroon)':'transparent'" [style.color]="outputFormat()==='base64'?'#fff':'var(--text-muted)'" style="padding:4px 10px;font-size:12px;font-weight:500;border:none;cursor:pointer">Base64</button>
    </div>
  </div>
  <!-- Input -->
  <div style="padding:14px 22px;border-bottom:1px solid var(--border);flex-shrink:0">
    <textarea [(ngModel)]="input" (ngModelChange)="onInputChange()"
      placeholder="Enter text to hash…"
      rows="3"
      style="width:100%;resize:vertical;border:1px solid var(--border);border-radius:7px;outline:none;padding:10px 12px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);line-height:1.5;box-sizing:border-box"></textarea>
    @if (fileInfo()) {
      <div style="margin-top:6px;font-size:11.5px;color:var(--teal)">File: {{ fileInfo() }}</div>
    }
  </div>
  <!-- Hash cards -->
  <div style="flex:1;min-height:0;overflow-y:auto;padding:16px 22px;display:flex;flex-direction:column;gap:10px">
    @for (r of results(); track r.algo) {
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:12.5px;font-weight:700;color:var(--maroon)">{{ r.algo }}</span>
          <span style="font-size:11px;color:var(--text-faint);background:var(--surface-muted);padding:1px 7px;border-radius:10px">{{ r.bits }}-bit</span>
          <div style="flex:1"></div>
          @if (!r.loading && r.hex) {
            <button (click)="copyHash(r)" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
              <dt-icon [name]="(outputFormat()==='hex'?r.copiedHex:r.copiedB64)?'check':'clipboard'" [size]="11" color="var(--text-muted)" />
              {{ (outputFormat()==='hex'?r.copiedHex:r.copiedB64)?'Copied!':'Copy' }}
            </button>
          }
        </div>
        @if (r.loading) {
          <div style="font-size:12px;color:var(--text-faint)">Computing…</div>
        } @else if (r.hex) {
          <div style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);word-break:break-all;line-height:1.5">{{ outputFormat()==='hex' ? r.hex : r.base64 }}</div>
        } @else {
          <div style="font-size:12px;color:var(--text-faint)">—</div>
        }
      </div>
    }
  </div>
</div>
`,
})
export class HashComponent {
  input = '';
  autoHash = true;
  outputFormat = signal<'hex'|'base64'>('hex');
  fileInfo = signal('');
  results = signal<HashResult[]>([
    { algo: 'MD5', bits: 128, hex: '', base64: '', loading: false, copiedHex: false, copiedB64: false },
    { algo: 'SHA-1', bits: 160, hex: '', base64: '', loading: false, copiedHex: false, copiedB64: false },
    { algo: 'SHA-256', bits: 256, hex: '', base64: '', loading: false, copiedHex: false, copiedB64: false },
    { algo: 'SHA-512', bits: 512, hex: '', base64: '', loading: false, copiedHex: false, copiedB64: false },
    { algo: 'CRC-32', bits: 32, hex: '', base64: '', loading: false, copiedHex: false, copiedB64: false },
  ]);

  onInputChange() { if (this.autoHash) this.computeAll(); }

  async computeAll(data?: string) {
    const text = data ?? this.input;
    if (!text) {
      this.results.update(rs => rs.map(r => ({ ...r, hex: '', base64: '' })));
      return;
    }
    this.results.update(rs => rs.map(r => ({ ...r, loading: true })));
    const md5Hex = md5(text);
    const crc32Hex = crc32(text);
    const [sha1Hex, sha256Hex, sha512Hex] = await Promise.all([
      hashSha('SHA-1', text),
      hashSha('SHA-256', text),
      hashSha('SHA-512', text),
    ]);
    const map: Record<string, string> = {
      'MD5': md5Hex, 'SHA-1': sha1Hex, 'SHA-256': sha256Hex, 'SHA-512': sha512Hex, 'CRC-32': crc32Hex
    };
    this.results.update(rs => rs.map(r => ({
      ...r, loading: false,
      hex: map[r.algo],
      base64: toBase64(map[r.algo]),
    })));
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const b = file.size;
    this.fileInfo.set(`${file.name} (${b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(2) + ' MB'})`);
    const reader = new FileReader();
    reader.onload = () => {
      this.computeAll(reader.result as string);
    };
    reader.readAsText(file);
  }

  copyHash(r: HashResult) {
    const val = this.outputFormat() === 'hex' ? r.hex : r.base64;
    navigator.clipboard.writeText(val).then(() => {
      this.results.update(rs => rs.map(x => x.algo === r.algo
        ? { ...x, copiedHex: this.outputFormat()==='hex', copiedB64: this.outputFormat()==='base64' }
        : x
      ));
      setTimeout(() => {
        this.results.update(rs => rs.map(x => x.algo === r.algo ? { ...x, copiedHex: false, copiedB64: false } : x));
      }, 1500);
    });
  }
}
