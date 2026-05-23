import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface PwdOpts {
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  customSymbols: string;
}

function generatePassword(len: number, opts: PwdOpts): string {
  let chars = '';
  if (opts.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (opts.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (opts.numbers) chars += '0123456789';
  if (opts.symbols) {
    chars += opts.customSymbols || '!@#$%^&*()-_=+[]{}|;:,.<>?';
  }
  if (opts.excludeSimilar) chars = chars.replace(/[0O1lI]/g, '');
  if (opts.excludeAmbiguous) chars = chars.replace(/[{}[\]()/\\'"~,;:.<>]/g, '');
  if (!chars) return '';
  const bytes = crypto.getRandomValues(new Uint8Array(len * 4));
  const usable = Array.from(bytes).filter(b => b < 256 - (256 % chars.length));
  const result: string[] = [];
  for (let i = 0; i < usable.length && result.length < len; i++) {
    result.push(chars[usable[i] % chars.length]);
  }
  // If not enough (unlikely), fill remaining
  while (result.length < len) {
    const extra = crypto.getRandomValues(new Uint8Array(1))[0];
    result.push(chars[extra % chars.length]);
  }
  return result.join('');
}

function strengthScore(pwd: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (pwd.length >= 16) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 2) return { score: s, label: 'Weak', color: '#e74c3c' };
  if (s <= 4) return { score: s, label: 'Fair', color: '#e67e22' };
  if (s <= 5) return { score: s, label: 'Good', color: '#f1c40f' };
  if (s <= 6) return { score: s, label: 'Strong', color: '#2ecc71' };
  return { score: s, label: 'Very Strong', color: '#27ae60' };
}

const QUANTITY_OPTS = [1, 5, 10, 20];

@Component({
    selector: 'dt-tool-password-gen',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Crypto', 'Password Generator']" [toolId]="'pwd'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="shield-check" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Password Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate secure random passwords</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="generateAll()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Generate
    </button>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <!-- Left: settings -->
    <div style="width:240px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;padding:14px 16px">
      <!-- Length -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Length: {{ length }}</div>
        <input type="range" [(ngModel)]="length" min="8" max="128" step="1"
          style="width:100%;accent-color:var(--maroon)" />
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-faint)"><span>8</span><span>128</span></div>
      </div>

      <!-- Character sets -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Character Sets</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.upper" /> Uppercase (A–Z)
          </label>
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.lower" /> Lowercase (a–z)
          </label>
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.numbers" /> Numbers (0–9)
          </label>
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.symbols" /> Symbols
          </label>
        </div>
      </div>

      <!-- Custom symbols -->
      @if (opts.symbols) {
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Custom Symbols</div>
          <input [(ngModel)]="opts.customSymbols" placeholder="!@#$%^&*…"
            style="width:100%;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);outline:none;box-sizing:border-box" />
        </div>
      }

      <!-- Exclusions -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Exclusions</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.excludeSimilar" /> Similar chars (0, O, 1, l, I)
          </label>
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="opts.excludeAmbiguous" /> Ambiguous (&#123;, &#125;, [, ], …)
          </label>
        </div>
      </div>

      <!-- Quantity -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Quantity</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          @for (q of quantities; track q) {
            <button (click)="qty.set(q)"
              [style.background]="qty()===q?'var(--maroon)':'var(--surface)'"
              [style.color]="qty()===q?'#fff':'var(--text-muted)'"
              [style.border]="qty()===q?'1px solid var(--maroon)':'1px solid var(--border)'"
              style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer">{{ q }}</button>
          }
        </div>
      </div>
    </div>

    <!-- Right: output -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:8px">
        Passwords ({{ passwords().length }})
        <div style="flex:1"></div>
        @if (passwords().length > 0) {
          <button (click)="copyAll()" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copiedAll()?'check':'clipboard-document'" [size]="11" color="var(--text-muted)" /> {{ copiedAll()?'All Copied!':'Copy All' }}
          </button>
        }
      </div>
      <div style="flex:1;overflow-y:auto;padding:8px 0">
        @for (item of passwords(); track item.id; let i = $index) {
          <div style="display:flex;align-items:center;padding:6px 14px;gap:10px" [style.background]="i%2===0?'transparent':'rgba(128,128,128,.03)'">
            <span style="font-size:11px;color:var(--text-faint);min-width:24px;text-align:right">{{ i+1 }}</span>
            <span style="font-family:var(--font-mono);font-size:13px;flex:1;user-select:all;word-break:break-all">{{ item.val }}</span>
            <!-- Strength bar -->
            <div style="width:48px;flex-shrink:0">
              <div style="height:3px;border-radius:2px;background:var(--border)">
                <div [style.width]="(item.strength.score/7*100)+'%'" [style.background]="item.strength.color" style="height:100%;border-radius:2px;transition:width .2s"></div>
              </div>
              <div [style.color]="item.strength.color" style="font-size:10px;text-align:center">{{ item.strength.label }}</div>
            </div>
            <button (click)="copyOne(item)" style="background:transparent;border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;color:var(--text-faint);flex-shrink:0">
              {{ item.copied ? '✓' : 'Copy' }}
            </button>
          </div>
        }
        @if (passwords().length === 0) {
          <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-faint);font-size:13px;flex-direction:column;gap:8px">
            <dt-icon name="shield-check" [size]="36" color="var(--text-faint)" />
            <div>Click Generate to create passwords</div>
          </div>
        }
      </div>
    </div>
  </div>
</div>
`
})
export class PasswordGenComponent {
  length = 16;
  opts: PwdOpts = {
    upper: true, lower: true, numbers: true, symbols: true,
    excludeSimilar: false, excludeAmbiguous: false, customSymbols: ''
  };
  qty = signal(5);
  quantities = QUANTITY_OPTS;
  passwords = signal<{ id: string; val: string; copied: boolean; strength: { score: number; label: string; color: string } }[]>([]);
  copiedAll = signal(false);

  generateAll() {
    const items = Array.from({ length: this.qty() }, (_, i) => {
      const val = generatePassword(this.length, this.opts);
      return { id: i.toString(), val, copied: false, strength: strengthScore(val) };
    });
    this.passwords.set(items);
  }

  copyOne(item: { id: string; val: string; copied: boolean; strength: any }) {
    navigator.clipboard.writeText(item.val).then(() => {
      this.passwords.update(list => list.map(x => x.id === item.id ? { ...x, copied: true } : x));
      setTimeout(() => this.passwords.update(list => list.map(x => x.id === item.id ? { ...x, copied: false } : x)), 1200);
    });
  }

  copyAll() {
    const text = this.passwords().map(x => x.val).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedAll.set(true);
      setTimeout(() => this.copiedAll.set(false), 1500);
    });
  }
}
