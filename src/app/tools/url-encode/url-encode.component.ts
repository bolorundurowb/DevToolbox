import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
  selector: 'dt-tool-url-encode',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding', 'URL Encode']" [toolId]="'url'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="link" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">URL Encode / Decode</div>
      <div style="font-size:12px;color:var(--text-muted)">Percent-encode and decode URL components</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="process()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Run
    </button>
  </div>
  <!-- Toolbar -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      <button (click)="setMode('encode')" [style.background]="mode()==='encode'?'var(--maroon)':'transparent'" [style.color]="mode()==='encode'?'#fff':'var(--text-muted)'" style="padding:4px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer">Encode</button>
      <button (click)="setMode('decode')" [style.background]="mode()==='decode'?'var(--maroon)':'transparent'" [style.color]="mode()==='decode'?'#fff':'var(--text-muted)'" style="padding:4px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer">Decode</button>
    </div>
    @if (mode()==='encode') {
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" [(ngModel)]="encodeAll" (change)="process()" /> Encode all chars (including safe)
      </label>
    }
  </div>
  <!-- Body -->
  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <!-- Input -->
    <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border);min-width:0">
      <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0">Input</div>
      <textarea [(ngModel)]="input" (ngModelChange)="process()"
        [placeholder]="mode()==='encode'?'Enter text or URL to encode…':'Enter percent-encoded string to decode…'"
        style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:13px;background:transparent;color:var(--text);line-height:1.6"></textarea>
    </div>
    <!-- Output -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:8px">
        Output
        <div style="flex:1"></div>
        @if (output()) {
          <button (click)="copyOutput()" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied()?'check':'clipboard'" [size]="11" color="var(--text-muted)" /> {{ copied()?'Copied!':'Copy' }}
          </button>
        }
      </div>
      @if (error()) {
        <div style="margin:14px;padding:10px 12px;background:rgba(180,30,30,.1);border:1px solid rgba(180,30,30,.25);border-radius:7px;color:#c0392b;font-size:12.5px">{{ error() }}</div>
      }
      <pre style="flex:1;padding:14px;font-family:var(--font-mono);font-size:13px;color:var(--text);overflow:auto;margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.6">{{ output() }}</pre>
    </div>
  </div>
  <!-- Footer -->
  <div style="padding:6px 22px;border-top:1px solid var(--border);display:flex;gap:20px;font-size:11px;color:var(--text-faint);flex-shrink:0">
    <span>Input: {{ input.length }} chars</span>
    <span>Output: {{ output().length }} chars</span>
    @if (mode()==='encode' && encodedCount() > 0) {
      <span style="color:var(--teal)">{{ encodedCount() }} chars percent-encoded</span>
    }
  </div>
</div>
`,
})
export class UrlEncodeComponent {
  mode = signal<'encode'|'decode'>('encode');
  input = '';
  encodeAll = false;
  output = signal('');
  error = signal('');
  copied = signal(false);
  encodedCount = signal(0);

  setMode(m: 'encode'|'decode') { this.mode.set(m); this.process(); }

  process() {
    this.error.set('');
    if (!this.input) { this.output.set(''); this.encodedCount.set(0); return; }
    try {
      if (this.mode() === 'encode') {
        let result: string;
        if (this.encodeAll) {
          result = Array.from(this.input).map(ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')).join('');
        } else {
          result = encodeURIComponent(this.input);
        }
        const count = (result.match(/%[0-9A-Fa-f]{2}/g) || []).length;
        this.encodedCount.set(count);
        this.output.set(result);
      } else {
        this.encodedCount.set(0);
        this.output.set(decodeURIComponent(this.input));
      }
    } catch (e: any) {
      this.error.set('Error: ' + (e.message || 'Invalid input'));
      this.output.set('');
    }
  }

  copyOutput() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
