import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// DER/ASN.1 minimal parser
function readLength(buf: Uint8Array, off: number): [number, number] {
  if (buf[off] < 0x80) return [buf[off], off + 1];
  const numBytes = buf[off] & 0x7f;
  let len = 0;
  for (let i = 0; i < numBytes; i++) len = (len << 8) | buf[off + 1 + i];
  return [len, off + 1 + numBytes];
}

function readTLV(buf: Uint8Array, off: number): [number, number, number] {
  const tag = buf[off];
  const [len, dataOff] = readLength(buf, off + 1);
  return [tag, len, dataOff];
}

function parseOid(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const parts: number[] = [];
  const first = bytes[0];
  parts.push(Math.floor(first / 40));
  parts.push(first % 40);
  let val = 0;
  for (let i = 1; i < bytes.length; i++) {
    val = (val << 7) | (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) { parts.push(val); val = 0; }
  }
  return parts.join('.');
}

const OID_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST',
  '2.5.4.10': 'O', '2.5.4.11': 'OU',
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10040.4.3': 'dsaWithSHA1',
  '1.2.840.10045.4.3.2': 'ecdsaWithSHA256',
  '1.2.840.10045.4.3.4': 'ecdsaWithSHA512',
};

function parseString(tag: number, bytes: Uint8Array): string {
  if (tag === 0x13 || tag === 0x16 || tag === 0x0C || tag === 0x1e || tag === 0x14 || tag === 0x15) {
    return new TextDecoder().decode(bytes);
  }
  return new TextDecoder().decode(bytes);
}

function parseUtcTime(bytes: Uint8Array): Date {
  const s = new TextDecoder().decode(bytes);
  // YYMMDDHHMMSSZ
  let year = parseInt(s.slice(0, 2));
  year += year >= 50 ? 1900 : 2000;
  const month = parseInt(s.slice(2, 4)) - 1;
  const day = parseInt(s.slice(4, 6));
  const hour = parseInt(s.slice(6, 8));
  const min = parseInt(s.slice(8, 10));
  const sec = parseInt(s.slice(10, 12));
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}

function parseGenTime(bytes: Uint8Array): Date {
  const s = new TextDecoder().decode(bytes);
  const year = parseInt(s.slice(0, 4));
  const month = parseInt(s.slice(4, 6)) - 1;
  const day = parseInt(s.slice(6, 8));
  const hour = parseInt(s.slice(8, 10));
  const min = parseInt(s.slice(10, 12));
  const sec = parseInt(s.slice(12, 14));
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}

interface RdnAttr { type: string; value: string; }

function parseRdn(buf: Uint8Array, off: number, end: number): RdnAttr[] {
  const attrs: RdnAttr[] = [];
  while (off < end) {
    const [setTag, setLen, setData] = readTLV(buf, off);
    if (setTag !== 0x31) { off += 2; continue; }
    let sOff = setData;
    const sEnd = setData + setLen;
    while (sOff < sEnd) {
      const [seqTag, seqLen, seqData] = readTLV(buf, sOff);
      if (seqTag !== 0x30) { sOff = seqData + seqLen; continue; }
      const seqEnd = seqData + seqLen;
      const [oidTag, oidLen, oidData] = readTLV(buf, seqData);
      const oidBytes = buf.slice(oidData, oidData + oidLen);
      const oid = parseOid(oidBytes);
      const name = OID_NAMES[oid] ?? oid;
      let vOff = oidData + oidLen;
      if (vOff < seqEnd) {
        const [vTag, vLen, vData] = readTLV(buf, vOff);
        const val = parseString(vTag, buf.slice(vData, vData + vLen));
        attrs.push({ type: name, value: val });
        vOff = vData + vLen;
      }
      sOff = seqEnd;
    }
    off = setData + setLen;
  }
  return attrs;
}

function formatRdn(attrs: RdnAttr[]): string {
  return attrs.map(a => `${a.type}=${a.value}`).join(', ');
}

interface CertInfo {
  pemType: string;
  serialNumber: string;
  subject: string;
  issuer: string;
  notBefore: Date | null;
  notAfter: Date | null;
  sigAlg: string;
  pubKeyType: string;
  pubKeyBits: number;
  rawBase64: string;
}

function decodeCert(der: Uint8Array): CertInfo {
  const info: CertInfo = {
    pemType: 'CERTIFICATE',
    serialNumber: '',
    subject: '',
    issuer: '',
    notBefore: null,
    notAfter: null,
    sigAlg: '',
    pubKeyType: '',
    pubKeyBits: 0,
    rawBase64: '',
  };

  // TBSCertificate is at tbsCert offset
  // outer SEQUENCE
  const [outerTag, outerLen, outerData] = readTLV(der, 0);
  if (outerTag !== 0x30) return info;

  // tbsCertificate SEQUENCE
  const [tbsTag, tbsLen, tbsData] = readTLV(der, outerData);
  if (tbsTag !== 0x30) return info;
  const tbsEnd = tbsData + tbsLen;

  let off = tbsData;

  // version [0] EXPLICIT optional
  if (der[off] === 0xa0) {
    const [, vLen, vData] = readTLV(der, off);
    off = vData + vLen;
  }

  // serialNumber INTEGER
  const [snTag, snLen, snData] = readTLV(der, off);
  if (snTag === 0x02) {
    const snBytes = der.slice(snData, snData + snLen);
    info.serialNumber = Array.from(snBytes).map(b => b.toString(16).padStart(2, '0')).join(':');
    off = snData + snLen;
  }

  // signature AlgorithmIdentifier SEQUENCE
  const [sigSeqTag, sigSeqLen, sigSeqData] = readTLV(der, off);
  if (sigSeqTag === 0x30) {
    const [oidTag, oidLen, oidData] = readTLV(der, sigSeqData);
    if (oidTag === 0x06) {
      const oid = parseOid(der.slice(oidData, oidData + oidLen));
      info.sigAlg = OID_NAMES[oid] ?? oid;
    }
    off = sigSeqData + sigSeqLen;
  }

  // issuer Name
  const [issTag, issLen, issData] = readTLV(der, off);
  if (issTag === 0x30) {
    info.issuer = formatRdn(parseRdn(der, issData, issData + issLen));
    off = issData + issLen;
  }

  // validity SEQUENCE
  const [valTag, valLen, valData] = readTLV(der, off);
  if (valTag === 0x30) {
    let vOff = valData;
    const [t1Tag, t1Len, t1Data] = readTLV(der, vOff);
    if (t1Tag === 0x17) info.notBefore = parseUtcTime(der.slice(t1Data, t1Data + t1Len));
    else if (t1Tag === 0x18) info.notBefore = parseGenTime(der.slice(t1Data, t1Data + t1Len));
    vOff = t1Data + t1Len;
    const [t2Tag, t2Len, t2Data] = readTLV(der, vOff);
    if (t2Tag === 0x17) info.notAfter = parseUtcTime(der.slice(t2Data, t2Data + t2Len));
    else if (t2Tag === 0x18) info.notAfter = parseGenTime(der.slice(t2Data, t2Data + t2Len));
    off = valData + valLen;
  }

  // subject Name
  const [subTag, subLen, subData] = readTLV(der, off);
  if (subTag === 0x30) {
    info.subject = formatRdn(parseRdn(der, subData, subData + subLen));
    off = subData + subLen;
  }

  // subjectPublicKeyInfo SEQUENCE
  const [spkiTag, spkiLen, spkiData] = readTLV(der, off);
  if (spkiTag === 0x30) {
    const [algTag, algLen, algData] = readTLV(der, spkiData);
    if (algTag === 0x30) {
      const [oidTag, oidLen, oidData] = readTLV(der, algData);
      if (oidTag === 0x06) {
        const oid = parseOid(der.slice(oidData, oidData + oidLen));
        const algName = OID_NAMES[oid] ?? oid;
        if (algName === 'rsaEncryption' || algName.includes('rsa')) {
          info.pubKeyType = 'RSA';
          // Find the BIT STRING then SEQUENCE then INTEGER for modulus length
          const bsOff = algData + algLen;
          const [bsTag, bsLen, bsData] = readTLV(der, bsOff);
          if (bsTag === 0x03) {
            const innerOff = bsData + 1; // skip padding byte
            const [rsaSeqTag, , rsaSeqData] = readTLV(der, innerOff);
            if (rsaSeqTag === 0x30) {
              const [modTag, modLen] = readTLV(der, rsaSeqData);
              if (modTag === 0x02) {
                const actualLen = (modLen > 0 && der[rsaSeqData + /* dataOff */ 2] === 0) ? modLen - 1 : modLen;
                info.pubKeyBits = actualLen * 8;
              }
            }
          }
        } else if (algName.includes('ec') || oid.startsWith('1.2.840.10045')) {
          info.pubKeyType = 'EC';
        } else {
          info.pubKeyType = algName;
        }
      }
    }
  }

  return info;
}

function pemDecode(pem: string): { type: string; der: Uint8Array } | null {
  const m = pem.match(/-----BEGIN ([^-]+)-----\s*([\s\S]+?)\s*-----END [^-]+-----/);
  if (!m) return null;
  const type = m[1].trim();
  const b64 = m[2].replace(/\s/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return { type, der };
}

@Component({
    selector: 'dt-tool-cert-decoder',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Hashing & Crypto', 'Certificate Decoder']" [toolId]="'cert'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="identification" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Certificate / PEM Decoder</div>
      <div style="font-size:12px;color:var(--text-muted)">Decode X.509 certificates, CSRs, and keys</div>
    </div>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">
    <div style="display:flex;flex:1;min-height:0;gap:0">
      <!-- Input -->
      <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">PEM Input</div>
        <textarea [(ngModel)]="input" (ngModelChange)="decode()"
          placeholder="Paste PEM here (-----BEGIN CERTIFICATE-----, etc.)"
          style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:11.5px;background:var(--surface);color:var(--text);line-height:1.6;min-height:0"></textarea>
      </div>
      <!-- Output -->
      <div style="flex:1.2;display:flex;flex-direction:column;min-height:0;overflow-y:auto">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">Decoded Fields</div>
        @if (!info()) {
          <div style="padding:24px;color:var(--text-faint);font-size:13px">Paste a PEM-encoded certificate or key to decode it.</div>
        }
        @if (error()) {
          <div style="margin:14px;padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;color:#b91c1c;font-size:12.5px">{{ error() }}</div>
        }
        @if (info()) {
          <div style="padding:14px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:12px;font-weight:700;color:var(--maroon);margin-bottom:6px">{{ info()!.pemType }}</div>

            @if (info()!.pemType === 'CERTIFICATE') {
              <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Serial Number</span>
                <span style="font-family:var(--font-mono);font-size:11.5px;color:var(--text);word-break:break-all">{{ info()!.serialNumber }}</span>
              </div>
              <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Subject</span>
                <span style="font-size:11.5px;color:var(--text);word-break:break-all">{{ info()!.subject }}</span>
              </div>
              <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Issuer</span>
                <span style="font-size:11.5px;color:var(--text);word-break:break-all">{{ info()!.issuer }}</span>
              </div>
              <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Not Before</span>
                <span style="font-size:11.5px;color:var(--text)">{{ info()!.notBefore?.toUTCString() ?? '—' }}</span>
              </div>
              <div [style.border]="expiryBorder()" style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Not After</span>
                <span [style.color]="expiryColor()" style="font-size:11.5px;font-weight:600">{{ info()!.notAfter?.toUTCString() ?? '—' }}</span>
                <span [style.color]="expiryColor()" style="font-size:11px">{{ expiryLabel() }}</span>
              </div>
              <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Signature Alg</span>
                <span style="font-size:11.5px;color:var(--text)">{{ info()!.sigAlg }}</span>
              </div>
              @if (info()!.pubKeyType) {
                <div style="display:flex;gap:8px;padding:7px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border)">
                  <span style="min-width:120px;font-size:11.5px;color:var(--text-muted)">Public Key</span>
                  <span style="font-size:11.5px;color:var(--text)">{{ info()!.pubKeyType }} {{ info()!.pubKeyBits > 0 ? info()!.pubKeyBits + ' bits' : '' }}</span>
                </div>
              }
            } @else {
              <div style="padding:10px;color:var(--text-muted);font-size:12.5px">PEM type: <strong>{{ info()!.pemType }}</strong></div>
            }

            <div style="margin-top:12px;font-size:11.5px;font-weight:600;color:var(--text-muted)">Raw Base64</div>
            <div style="max-height:120px;overflow-y:auto;font-family:var(--font-mono);font-size:10.5px;color:var(--text-faint);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px;word-break:break-all;line-height:1.5">{{ rawB64() }}</div>
          </div>
        }
      </div>
    </div>
  </div>
</div>
`
})
export class CertDecoderComponent {
  input = '';
  info = signal<CertInfo | null>(null);
  rawB64 = signal('');
  error = signal('');

  decode() {
    if (!this.input.trim()) { this.info.set(null); this.error.set(''); return; }
    try {
      const decoded = pemDecode(this.input.trim());
      if (!decoded) { this.error.set('Invalid PEM: could not find BEGIN/END markers.'); this.info.set(null); return; }
      this.error.set('');
      const b64 = btoa(String.fromCharCode(...decoded.der));
      this.rawB64.set(b64);
      if (decoded.type === 'CERTIFICATE') {
        const certInfo = decodeCert(decoded.der);
        certInfo.pemType = decoded.type;
        this.info.set(certInfo);
      } else {
        this.info.set({ pemType: decoded.type, serialNumber: '', subject: '', issuer: '', notBefore: null, notAfter: null, sigAlg: '', pubKeyType: '', pubKeyBits: 0, rawBase64: b64 });
      }
    } catch (e: any) {
      this.error.set('Parse error: ' + (e?.message ?? String(e)));
      this.info.set(null);
    }
  }

  expiryColor = computed(() => {
    const d = this.info()?.notAfter;
    if (!d) return 'var(--text)';
    const now = Date.now();
    const diff = d.getTime() - now;
    if (diff < 0) return '#ef4444';
    if (diff < 30 * 24 * 3600 * 1000) return '#f59e0b';
    return '#22c55e';
  });

  expiryBorder = computed(() => {
    const d = this.info()?.notAfter;
    if (!d) return '1px solid var(--border)';
    const now = Date.now();
    const diff = d.getTime() - now;
    if (diff < 0) return '1px solid #fca5a5';
    if (diff < 30 * 24 * 3600 * 1000) return '1px solid #fcd34d';
    return '1px solid #86efac';
  });

  expiryLabel = computed(() => {
    const d = this.info()?.notAfter;
    if (!d) return '';
    const now = Date.now();
    const diff = d.getTime() - now;
    if (diff < 0) return '(EXPIRED)';
    const days = Math.floor(diff / (24 * 3600 * 1000));
    if (days < 30) return `(expires in ${days} days)`;
    return '(valid)';
  });
}
