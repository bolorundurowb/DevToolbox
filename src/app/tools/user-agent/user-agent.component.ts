import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { UAParser } from 'ua-parser-js';

interface UaCard {
  section: string;
  icon: string;
  color: string;
  rows: { label: string; value: string }[];
}

const PRESET_UAS: { label: string; ua: string }[] = [
  {
    label: 'Chrome 120 (Win)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    label: 'Firefox 121 (Mac)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:121.0) Gecko/20100101 Firefox/121.0',
  },
  {
    label: 'Safari 17 (iPhone)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Edge 120 (Win)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  },
  {
    label: 'Chrome (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  },
  {
    label: 'Googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
];

function browserEmoji(name?: string): string {
  if (!name) return '🌐';
  const n = name.toLowerCase();
  if (n.includes('chrome')) return '🟡';
  if (n.includes('firefox')) return '🦊';
  if (n.includes('safari')) return '🧭';
  if (n.includes('edge')) return '🔵';
  if (n.includes('opera')) return '🔴';
  if (n.includes('bot') || n.includes('crawl')) return '🤖';
  return '🌐';
}

function osEmoji(name?: string): string {
  if (!name) return '💻';
  const n = name.toLowerCase();
  if (n.includes('windows')) return '🪟';
  if (n.includes('mac') || n.includes('ios')) return '🍎';
  if (n.includes('android')) return '🤖';
  if (n.includes('linux')) return '🐧';
  return '💻';
}

function deviceEmoji(type?: string): string {
  if (!type) return '🖥️';
  const t = type.toLowerCase();
  if (t === 'mobile') return '📱';
  if (t === 'tablet') return '📱';
  if (t === 'smarttv') return '📺';
  if (t === 'console') return '🎮';
  return '🖥️';
}

@Component({
  selector: 'dt-tool-user-agent',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Tools', 'User-Agent Parser']" [toolId]="'ua'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="globe" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">User-Agent Parser</div>
      <div style="font-size:12px;color:var(--text-muted)">Parse browser, OS, device and engine from UA strings</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="useCurrentUA()"
      style="background:var(--maroon);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <dt-icon name="fingerprint" [size]="12" color="#fff" /> My UA
    </button>
  </div>

  <!-- UA input -->
  <div style="padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--surface)">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">User-Agent String</div>
    <textarea [(ngModel)]="uaInput" (ngModelChange)="parseUA()"
      rows="3" placeholder="Paste a User-Agent string here…"
      style="width:100%;border:2px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;font-family:var(--font-mono);background:var(--bg);color:var(--text);box-sizing:border-box;outline:none;resize:vertical;line-height:1.5"></textarea>
    <!-- Presets -->
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      @for (p of presets; track p.label) {
        <button (click)="applyPreset(p.ua)"
          [style.border-color]="uaInput === p.ua ? 'var(--maroon)' : 'var(--border)'"
          [style.color]="uaInput === p.ua ? 'var(--maroon-ink)' : 'var(--text-muted)'"
          style="font-size:11.5px;padding:3px 10px;border-radius:5px;border:1px solid;background:var(--surface-muted);cursor:pointer">
          {{ p.label }}
        </button>
      }
    </div>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Cards -->
    <div style="flex:1;min-width:0;overflow-y:auto;padding:16px 20px">
      @if (cards().length) {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:16px">
          @for (card of cards(); track card.section) {
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:18px">{{ card.icon }}</span>
                <span style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">{{ card.section }}</span>
              </div>
              @for (row of card.rows; track row.label) {
                <div style="display:flex;flex-direction:column;gap:1px;margin-bottom:7px">
                  <span style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em">{{ row.label }}</span>
                  <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text)">{{ row.value || '—' }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Full JSON -->
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:8px">
            Full Parsed Object
            <button (click)="copyJson()" style="font-size:11px;background:transparent;border:1px solid var(--border);border-radius:4px;padding:1px 8px;cursor:pointer;color:var(--text-muted);margin-left:auto;display:inline-flex;align-items:center;gap:4px">
              <dt-icon [name]="jsonCopied() ? 'check' : 'copy'" [size]="11" color="var(--text-muted)" />
              {{ jsonCopied() ? 'Copied!' : 'Copy JSON' }}
            </button>
          </div>
          <pre style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;font-family:var(--font-mono);font-size:12px;color:var(--text);overflow-x:auto;margin:0;line-height:1.6">{{ jsonResult() }}</pre>
        </div>
      } @else {
        <div style="text-align:center;padding:48px 0;font-size:13px;color:var(--text-faint)">Enter a User-Agent string above to parse it</div>
      }
    </div>
  </div>
</div>
`,
})
export class UserAgentComponent {
  uaInput = '';
  presets = PRESET_UAS;
  cards = signal<UaCard[]>([]);
  jsonResult = signal('');
  jsonCopied = signal(false);

  useCurrentUA() {
    this.uaInput = navigator.userAgent;
    this.parseUA();
  }

  applyPreset(ua: string) { this.uaInput = ua; this.parseUA(); }

  parseUA() {
    const ua = this.uaInput.trim();
    if (!ua) { this.cards.set([]); this.jsonResult.set(''); return; }

    const parser = new UAParser(ua);
    const result = parser.getResult();

    const cards: UaCard[] = [
      {
        section: 'Browser',
        icon: browserEmoji(result.browser.name),
        color: 'var(--maroon)',
        rows: [
          { label: 'Name', value: result.browser.name ?? '' },
          { label: 'Version', value: result.browser.version ?? '' },
          { label: 'Major', value: result.browser.major ?? '' },
        ],
      },
      {
        section: 'Engine',
        icon: '⚙️',
        color: 'var(--teal)',
        rows: [
          { label: 'Name', value: result.engine.name ?? '' },
          { label: 'Version', value: result.engine.version ?? '' },
        ],
      },
      {
        section: 'OS',
        icon: osEmoji(result.os.name),
        color: 'var(--teal)',
        rows: [
          { label: 'Name', value: result.os.name ?? '' },
          { label: 'Version', value: result.os.version ?? '' },
        ],
      },
      {
        section: 'Device',
        icon: deviceEmoji(result.device.type),
        color: 'var(--maroon)',
        rows: [
          { label: 'Vendor', value: result.device.vendor ?? '' },
          { label: 'Model', value: result.device.model ?? '' },
          { label: 'Type', value: result.device.type ?? 'desktop' },
        ],
      },
      {
        section: 'CPU',
        icon: '🧠',
        color: 'var(--teal)',
        rows: [
          { label: 'Architecture', value: result.cpu.architecture ?? '' },
        ],
      },
    ];

    this.cards.set(cards);
    this.jsonResult.set(JSON.stringify(result, null, 2));
  }

  copyJson() {
    navigator.clipboard.writeText(this.jsonResult()).then(() => {
      this.jsonCopied.set(true);
      setTimeout(() => this.jsonCopied.set(false), 1500);
    });
  }
}
