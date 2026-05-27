import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface CidrResult {
  type: 'ipv4';
  input: string;
  prefix: number;
  ipAddress: string;
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  binaryIp: string;
  binaryMask: string;
  ipClass: string;
  scope: string;
  cidrNotation: string;
  reverseNotation: string;
}

function numToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function toBinary(n: number, bits = 32): string {
  return (n >>> 0).toString(2).padStart(bits, '0').replace(/(.{8})/g, '$1 ').trim();
}

function getIpClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function getScope(ip: string, firstOctet: number, prefix: number): string {
  if (ip.startsWith('10.')) return 'Private (Class A)';
  if (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31) return 'Private (Class B)';
  if (ip.startsWith('192.168.')) return 'Private (Class C)';
  if (ip.startsWith('127.')) return 'Loopback';
  if (ip.startsWith('169.254.')) return 'Link-local';
  if (ip.startsWith('224.') || (firstOctet >= 224 && firstOctet < 240)) return 'Multicast';
  if (ip.startsWith('255.255.255.255')) return 'Broadcast';
  return 'Public';
}

function parseCidr(cidr: string): CidrResult | null {
  const [ipPart, prefixPart] = cidr.includes('/') ? cidr.split('/') : [cidr, '32'];
  const prefix = parseInt(prefixPart);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

  const parts = ipPart.split('.');
  if (parts.length !== 4 || parts.some(p => isNaN(+p) || +p < 0 || +p > 255)) return null;

  const ipNum = ipToNum(ipPart);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;
  const totalHosts = broadcast - network + 1;
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);
  const firstOctet = (ipNum >>> 24) & 255;

  const octets = ipPart.split('.').map(Number);
  const revOctets = octets.slice(0, Math.ceil(prefix / 8)).reverse();

  return {
    type: 'ipv4',
    input: cidr,
    prefix,
    ipAddress: ipPart,
    networkAddress: numToIp(network),
    broadcastAddress: numToIp(broadcast),
    subnetMask: numToIp(mask),
    wildcardMask: numToIp(~mask >>> 0),
    firstHost: numToIp(firstHost),
    lastHost: numToIp(lastHost),
    totalHosts,
    usableHosts,
    binaryIp: toBinary(ipNum),
    binaryMask: toBinary(mask),
    ipClass: getIpClass(firstOctet),
    scope: getScope(ipPart, firstOctet, prefix),
    cidrNotation: `${numToIp(network)}/${prefix}`,
    reverseNotation: `${revOctets.join('.')}.in-addr.arpa`,
  };
}

function isValidIpv6(addr: string): boolean {
  // Basic check
  try {
    const parts = addr.split(':');
    if (parts.length < 2 || parts.length > 8) return false;
    return parts.every(p => p === '' || /^[0-9a-fA-F]{1,4}$/.test(p));
  } catch { return false; }
}

function expandIpv6(addr: string): string {
  const full = addr.includes('::')
    ? (() => {
        const sides = addr.split('::');
        const left = sides[0] ? sides[0].split(':') : [];
        const right = sides[1] ? sides[1].split(':') : [];
        const fill = 8 - left.length - right.length;
        return [...left, ...Array(fill).fill('0'), ...right];
      })()
    : addr.split(':');
  return full.map(g => g.padStart(4, '0')).join(':');
}

function compressIpv6(addr: string): string {
  return addr.replace(/\b0+([0-9a-fA-F])/g, '$1').replace(/(:0)+:/, '::');
}

@Component({
    selector: 'dt-tool-ip-cidr',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Web & Network', 'IP / CIDR Calculator']" [toolId]="'cidr'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);display:grid;place-items:center">
      <dt-icon name="network" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">IP / CIDR Calculator</div>
      <div style="font-size:12px;color:var(--text-muted)">Analyse IP addresses, subnets, and CIDR ranges</div>
    </div>
  </div>

  <!-- Input -->
  <div style="padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--surface)">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">
      IP Address or CIDR
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <input type="text" [(ngModel)]="inputValue" (ngModelChange)="analyse()"
        placeholder="e.g. 192.168.1.0/24 or 10.0.0.1 or 2001:db8::1"
        style="flex:1;border:2px solid var(--border);border-radius:8px;padding:10px 14px;font-size:15px;font-family:var(--font-mono);background:var(--bg);color:var(--text);box-sizing:border-box;outline:none"
        [style.border-color]="errorMsg() ? '#e05' : 'var(--border)'" />
    </div>
    @if (errorMsg()) {
      <div style="font-size:12px;color:#e05;margin-top:4px">{{ errorMsg() }}</div>
    }
    <!-- Quick presets -->
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      @for (p of presets; track p.label) {
        <button (click)="setInput(p.value)"
          style="font-size:11.5px;padding:3px 10px;border-radius:5px;border:1px solid var(--border);background:var(--surface-muted);cursor:pointer;color:var(--text);font-family:var(--font-mono)">
          {{ p.label }}
        </button>
      }
    </div>
  </div>

  <!-- Results -->
  <div style="flex:1;min-height:0;overflow-y:auto;padding:16px 20px">

    @if (result()) {
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <!-- Network info -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Network Information</div>
          <div style="display:flex;flex-direction:column;gap:7px">
            @for (row of networkRows(); track row.label) {
              <div style="display:flex;align-items:flex-start;gap:10px">
                <span style="font-size:11.5px;color:var(--text-muted);width:130px;flex-shrink:0">{{ row.label }}</span>
                <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);flex:1">{{ row.value }}</span>
                <button (click)="copyValue(row.value, row.label)" style="background:transparent;border:none;cursor:pointer;padding:0 2px;flex-shrink:0">
                  <dt-icon [name]="copiedKey() === row.label ? 'check' : 'copy'" [size]="12" color="var(--text-faint)" />
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Host info -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Host Range</div>
          <div style="display:flex;flex-direction:column;gap:7px">
            @for (row of hostRows(); track row.label) {
              <div style="display:flex;align-items:flex-start;gap:10px">
                <span style="font-size:11.5px;color:var(--text-muted);width:130px;flex-shrink:0">{{ row.label }}</span>
                <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);flex:1">{{ row.value }}</span>
                <button (click)="copyValue(row.value, row.label)" style="background:transparent;border:none;cursor:pointer;padding:0 2px;flex-shrink:0">
                  <dt-icon [name]="copiedKey() === row.label ? 'check' : 'copy'" [size]="12" color="var(--text-faint)" />
                </button>
              </div>
            }
          </div>
          <!-- Scope badge -->
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            <span [style.background]="result()!.scope.startsWith('Private') ? 'var(--maroon-soft)' : result()!.scope === 'Public' ? 'var(--teal-soft)' : 'var(--surface-muted)'"
              [style.color]="result()!.scope.startsWith('Private') ? 'var(--maroon)' : result()!.scope === 'Public' ? 'var(--teal-ink)' : 'var(--text-muted)'"
              style="padding:3px 12px;border-radius:10px;font-size:12px;font-weight:600">
              {{ result()!.scope }}
            </span>
            <span style="background:var(--surface-muted);color:var(--text-muted);padding:3px 12px;border-radius:10px;font-size:12px;font-weight:600">
              Class {{ result()!.ipClass }}
            </span>
          </div>
        </div>

        <!-- Binary representation -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;grid-column:1/-1">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Binary Representation</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;gap:10px;align-items:center">
              <span style="font-size:11.5px;color:var(--text-muted);width:100px;flex-shrink:0">IP Address</span>
              <code style="font-size:12px;color:var(--text);font-family:var(--font-mono);letter-spacing:.08em">{{ result()!.binaryIp }}</code>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span style="font-size:11.5px;color:var(--text-muted);width:100px;flex-shrink:0">Subnet Mask</span>
              <code style="font-size:12px;color:var(--maroon);font-family:var(--font-mono);letter-spacing:.08em">{{ result()!.binaryMask }}</code>
            </div>
          </div>
        </div>

      </div>
    } @else if (ipv6Result()) {
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;max-width:600px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">IPv6 Analysis</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (row of ipv6Rows(); track row.label) {
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="font-size:11.5px;color:var(--text-muted);width:140px;flex-shrink:0">{{ row.label }}</span>
              <code style="font-family:var(--font-mono);font-size:12.5px;color:var(--text)">{{ row.value }}</code>
            </div>
          }
        </div>
      </div>
    } @else if (!errorMsg()) {
      <div style="text-align:center;padding:48px 0;font-size:13px;color:var(--text-faint)">Enter an IP address or CIDR notation above</div>
    }
  </div>
</div>
`
})
export class IpCidrComponent {
  inputValue = '192.168.1.0/24';
  copiedKey = signal('');
  errorMsg = signal('');
  result = signal<CidrResult | null>(null);
  ipv6Result = signal<string | null>(null);

  presets = [
    { label: '192.168.1.0/24', value: '192.168.1.0/24' },
    { label: '10.0.0.0/8', value: '10.0.0.0/8' },
    { label: '172.16.0.0/12', value: '172.16.0.0/12' },
    { label: '10.1.2.3', value: '10.1.2.3' },
    { label: '0.0.0.0/0', value: '0.0.0.0/0' },
    { label: '::1', value: '::1' },
  ];

  constructor() { this.analyse(); }

  setInput(v: string) { this.inputValue = v; this.analyse(); }

  analyse() {
    this.errorMsg.set('');
    this.result.set(null);
    this.ipv6Result.set(null);
    const raw = this.inputValue.trim();
    if (!raw) return;

    // Try IPv6
    if (raw.includes(':')) {
      const addr = raw.split('/')[0];
      if (isValidIpv6(addr)) {
        this.ipv6Result.set(addr);
      } else {
        this.errorMsg.set('Invalid IPv6 address');
      }
      return;
    }

    // Try IPv4 / CIDR
    const res = parseCidr(raw);
    if (!res) {
      this.errorMsg.set('Invalid IP address or CIDR notation');
      return;
    }
    this.result.set(res);
  }

  networkRows(): { label: string; value: string }[] {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'IP Address', value: r.ipAddress },
      { label: 'Network Address', value: r.networkAddress },
      { label: 'Broadcast', value: r.broadcastAddress },
      { label: 'Subnet Mask', value: r.subnetMask },
      { label: 'Wildcard Mask', value: r.wildcardMask },
      { label: 'CIDR Notation', value: r.cidrNotation },
      { label: 'Reverse DNS', value: r.reverseNotation },
    ];
  }

  hostRows(): { label: string; value: string }[] {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'First Host', value: r.firstHost },
      { label: 'Last Host', value: r.lastHost },
      { label: 'Total Hosts', value: r.totalHosts.toLocaleString() },
      { label: 'Usable Hosts', value: r.usableHosts.toLocaleString() },
      { label: 'Prefix Length', value: '/' + r.prefix },
    ];
  }

  ipv6Rows(): { label: string; value: string }[] {
    const addr = this.ipv6Result();
    if (!addr) return [];
    const expanded = expandIpv6(addr);
    const compressed = compressIpv6(expanded);
    const isLL = addr.toLowerCase().startsWith('fe80');
    const isLoop = addr === '::1';
    return [
      { label: 'Input', value: addr },
      { label: 'Expanded', value: expanded },
      { label: 'Compressed', value: compressed },
      { label: 'Type', value: isLoop ? 'Loopback' : isLL ? 'Link-local' : 'Global unicast' },
    ];
  }

  copyValue(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(''), 1500);
    });
  }
}
