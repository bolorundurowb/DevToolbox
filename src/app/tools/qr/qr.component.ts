import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import QRCode from 'qrcode';

type ContentTab = 'URL' | 'Text' | 'WiFi' | 'vCard' | 'SMS';
type ECLevel = 'L' | 'M' | 'Q' | 'H';

interface QROptions {
  ecLevel: ECLevel;
  foreground: string;
  background: string;
  width: number;
  margin: number;
}

@Component({
    selector: 'dt-tool-qr',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Web & Network', 'QR Code Generator']" [toolId]="'qr'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="qr" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">QR Code Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate QR codes for URLs, Wi-Fi, vCards, and more</div>
    </div>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Left: input panel -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden">

      <!-- Content type tabs -->
      <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
        @for (tab of contentTabs; track tab) {
          <button (click)="activeTab.set(tab)"
            [style.border-bottom]="activeTab() === tab ? '2px solid var(--maroon)' : '2px solid transparent'"
            [style.color]="activeTab() === tab ? 'var(--maroon)' : 'var(--text-muted)'"
            [style.font-weight]="activeTab() === tab ? '600' : '400'"
            style="padding:10px 16px;font-size:13px;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer">
            {{ tab }}
          </button>
        }
      </div>

      <!-- Input form -->
      <div style="flex:1;overflow-y:auto;padding:16px">

        @if (activeTab() === 'URL') {
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">URL</label>
              <input type="url" [(ngModel)]="urlInput" (ngModelChange)="generateDebounced()"
                placeholder="https://example.com"
                style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
            </div>
          </div>
        }

        @if (activeTab() === 'Text') {
          <div>
            <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">Text content</label>
            <textarea [(ngModel)]="textInput" (ngModelChange)="generateDebounced()"
              rows="5" placeholder="Enter any text…"
              style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box;resize:vertical"></textarea>
          </div>
        }

        @if (activeTab() === 'WiFi') {
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">SSID (Network name)</label>
              <input type="text" [(ngModel)]="wifiSsid" (ngModelChange)="generateDebounced()" placeholder="MyNetwork"
                style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
            </div>
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">Password</label>
              <input [type]="showWifiPass ? 'text' : 'password'" [(ngModel)]="wifiPassword" (ngModelChange)="generateDebounced()"
                style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
            </div>
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">Encryption</label>
              <div style="display:flex;gap:8px">
                @for (enc of ['WPA', 'WEP', 'nopass']; track enc) {
                  <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;cursor:pointer">
                    <input type="radio" [(ngModel)]="wifiEncryption" [value]="enc" (ngModelChange)="generateDebounced()" /> {{ enc }}
                  </label>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'vCard') {
          <div style="display:flex;flex-direction:column;gap:10px">
            @for (f of vcardFields; track f.key) {
              <div>
                <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">{{ f.label }}</label>
                <input type="text" [(ngModel)]="vcardData[f.key]" (ngModelChange)="generateDebounced()" [placeholder]="f.placeholder"
                  style="width:100%;border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
              </div>
            }
          </div>
        }

        @if (activeTab() === 'SMS') {
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">Phone number</label>
              <input type="tel" [(ngModel)]="smsPhone" (ngModelChange)="generateDebounced()" placeholder="+1234567890"
                style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box" />
            </div>
            <div>
              <label style="font-size:11.5px;color:var(--text-muted);display:block;margin-bottom:4px">Message (optional)</label>
              <textarea [(ngModel)]="smsMessage" (ngModelChange)="generateDebounced()" rows="3"
                style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box;resize:vertical"></textarea>
            </div>
          </div>
        }

        <!-- QR data preview -->
        @if (qrData()) {
          <div style="margin-top:14px;background:var(--surface-muted);border-radius:6px;padding:10px;font-family:var(--font-mono);font-size:11px;color:var(--text-muted);word-break:break-all">
            {{ qrData() }}
          </div>
        }
      </div>
    </div>

    <!-- Right: QR preview + options -->
    <div style="width:300px;flex-shrink:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px">

      <!-- QR Preview -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        @if (qrDataUrl()) {
          <img [src]="qrDataUrl()" alt="QR Code"
            style="width:200px;height:200px;border-radius:10px;border:1px solid var(--border)" />
          <div style="display:flex;gap:8px">
            <button (click)="downloadQR('png')"
              style="padding:5px 14px;border-radius:6px;border:1px solid var(--border);font-size:12px;background:var(--surface);cursor:pointer;color:var(--text);display:inline-flex;align-items:center;gap:5px">
              <dt-icon name="download" [size]="12" color="var(--text-muted)" /> PNG
            </button>
            <button (click)="downloadQR('svg')"
              style="padding:5px 14px;border-radius:6px;border:1px solid var(--border);font-size:12px;background:var(--surface);cursor:pointer;color:var(--text);display:inline-flex;align-items:center;gap:5px">
              <dt-icon name="download" [size]="12" color="var(--text-muted)" /> SVG
            </button>
          </div>
          <!-- Stats -->
          @if (qrStats()) {
            <div style="width:100%;background:var(--surface-muted);border-radius:8px;padding:10px;font-size:11.5px;color:var(--text-muted);display:flex;flex-direction:column;gap:3px">
              @for (s of qrStats()!; track s.label) {
                <div style="display:flex;justify-content:space-between">
                  <span>{{ s.label }}</span><span style="color:var(--text);font-weight:500">{{ s.value }}</span>
                </div>
              }
            </div>
          }
        } @else {
          <div style="width:200px;height:200px;border-radius:10px;border:2px dashed var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
            <dt-icon name="qr" [size]="32" color="var(--text-faint)" />
            <div style="font-size:12px;color:var(--text-faint)">QR preview</div>
          </div>
        }
      </div>

      <!-- EC Level -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Error Correction</div>
        <div style="display:flex;gap:5px">
          @for (lv of ecLevels; track lv.value) {
            <button (click)="ecLevel.set(lv.value); generateDebounced()"
              [style.background]="ecLevel() === lv.value ? 'var(--maroon)' : 'var(--surface)'"
              [style.color]="ecLevel() === lv.value ? '#fff' : 'var(--text)'"
              [style.border-color]="ecLevel() === lv.value ? 'var(--maroon)' : 'var(--border)'"
              style="flex:1;padding:5px 4px;border-radius:6px;border:1px solid;font-size:12px;font-weight:700;cursor:pointer"
              [title]="lv.desc">
              {{ lv.value }}
            </button>
          }
        </div>
        <div style="font-size:11px;color:var(--text-faint);margin-top:4px">{{ selectedEcDesc() }}</div>
      </div>

      <!-- Colours -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Colours</div>
        <div style="display:flex;gap:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Foreground</div>
            <input type="color" [value]="fgColor()" (input)="fgColor.set($any($event.target).value); generateDebounced()"
              style="width:100%;height:32px;border-radius:6px;border:1px solid var(--border);cursor:pointer;padding:2px" />
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Background</div>
            <input type="color" [value]="bgColor()" (input)="bgColor.set($any($event.target).value); generateDebounced()"
              style="width:100%;height:32px;border-radius:6px;border:1px solid var(--border);cursor:pointer;padding:2px" />
          </div>
        </div>
      </div>

      <!-- Size -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Size: {{ qrSize() }}px</div>
        <input type="range" min="128" max="1024" step="64" [value]="qrSize()" (input)="qrSize.set(+$any($event.target).value); generateDebounced()"
          style="width:100%;accent-color:var(--maroon)" />
      </div>

      <!-- Margin -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Margin: {{ qrMargin() }}</div>
        <input type="range" min="0" max="10" [value]="qrMargin()" (input)="qrMargin.set(+$any($event.target).value); generateDebounced()"
          style="width:100%;accent-color:var(--maroon)" />
      </div>

    </div>
  </div>
</div>
`
})
export class QrComponent {
  contentTabs: ContentTab[] = ['URL', 'Text', 'WiFi', 'vCard', 'SMS'];
  activeTab = signal<ContentTab>('URL');

  // Inputs
  urlInput = 'https://example.com';
  textInput = '';
  wifiSsid = '';
  wifiPassword = '';
  wifiEncryption = 'WPA';
  showWifiPass = false;
  smsPhone = '';
  smsMessage = '';
  vcardData: Record<string, string> = { name: '', phone: '', email: '', org: '', url: '' };

  vcardFields = [
    { key: 'name', label: 'Full name', placeholder: 'Jane Doe' },
    { key: 'phone', label: 'Phone', placeholder: '+1 555 0100' },
    { key: 'email', label: 'Email', placeholder: 'jane@example.com' },
    { key: 'org', label: 'Organisation', placeholder: 'Acme Corp' },
    { key: 'url', label: 'Website', placeholder: 'https://example.com' },
  ];

  ecLevels: { value: ECLevel; desc: string }[] = [
    { value: 'L', desc: '~7% recovery' },
    { value: 'M', desc: '~15% recovery' },
    { value: 'Q', desc: '~25% recovery' },
    { value: 'H', desc: '~30% recovery' },
  ];

  ecLevel = signal<ECLevel>('M');
  selectedEcDesc = computed(() => this.ecLevels.find(l => l.value === this.ecLevel())?.desc ?? '');
  fgColor = signal('#000000');
  bgColor = signal('#ffffff');
  qrSize = signal(512);
  qrMargin = signal(2);

  qrDataUrl = signal<string>('');
  qrStats = signal<{ label: string; value: string }[] | null>(null);

  private _debounce: ReturnType<typeof setTimeout> | null = null;

  qrData = computed(() => {
    const tab = this.activeTab();
    if (tab === 'URL') return this.urlInput;
    if (tab === 'Text') return this.textInput;
    if (tab === 'WiFi') return `WIFI:T:${this.wifiEncryption};S:${this.wifiSsid};P:${this.wifiPassword};;`;
    if (tab === 'vCard') {
      const v = this.vcardData;
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${v['name']}\nTEL:${v['phone']}\nEMAIL:${v['email']}\nORG:${v['org']}\nURL:${v['url']}\nEND:VCARD`;
    }
    if (tab === 'SMS') return `smsto:${this.smsPhone}:${this.smsMessage}`;
    return '';
  });

  constructor() { this.generateDebounced(); }

  generateDebounced() {
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this.generate(), 300);
  }

  generate() {
    const data = this.qrData();
    if (!data?.trim()) { this.qrDataUrl.set(''); this.qrStats.set(null); return; }

    QRCode.toDataURL(data, {
      errorCorrectionLevel: this.ecLevel(),
      width: this.qrSize(),
      margin: this.qrMargin(),
      color: { dark: this.fgColor(), light: this.bgColor() },
    }).then(url => {
      this.qrDataUrl.set(url);
      const byteLen = new Blob([data]).size;
      this.qrStats.set([
        { label: 'Data length', value: byteLen + ' bytes' },
        { label: 'Characters', value: data.length.toString() },
        { label: 'EC level', value: this.ecLevel() },
        { label: 'Size', value: this.qrSize() + 'px' },
      ]);
    }).catch(err => {
      console.error('QR generation failed:', err);
      this.qrDataUrl.set('');
    });
  }

  downloadQR(format: 'png' | 'svg') {
    const data = this.qrData();
    if (!data?.trim()) return;

    if (format === 'png') {
      const a = document.createElement('a');
      a.href = this.qrDataUrl();
      a.download = 'qr-code.png';
      a.click();
    } else {
      QRCode.toString(data, {
        type: 'svg',
        errorCorrectionLevel: this.ecLevel(),
        margin: this.qrMargin(),
        color: { dark: this.fgColor(), light: this.bgColor() },
      }).then(svg => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'qr-code.svg'; a.click();
        URL.revokeObjectURL(url);
      });
    }
  }
}
