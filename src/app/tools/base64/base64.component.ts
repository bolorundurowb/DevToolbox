import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
    selector: 'dt-tool-base64',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding', 'Base64']" [toolId]="'base64'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="code-bracket" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Base64</div>
      <div style="font-size:12px;color:var(--text-muted)">Encode and decode Base64 strings and files</div>
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
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="urlSafe" (change)="process()" /> URL-safe (-_)
    </label>
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
      <input type="checkbox" [(ngModel)]="wrap76" (change)="process()" /> Wrap at 76 chars
    </label>
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;margin-left:auto">
      <input type="checkbox" [(ngModel)]="fileMode" (change)="onFileModeToggle()" /> File mode
    </label>
  </div>
  <!-- Body -->
  <div style="flex:1;min-height:0;display:flex;overflow:hidden">
    <!-- Input -->
    <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border);min-width:0">
      <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:8px">
        Input
        @if (fileMode) {
          <label style="margin-left:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted)">
            <input type="file" style="display:none" (change)="onFileSelected($event)" /> Choose file
          </label>
        }
      </div>
      @if (!fileMode) {
        <textarea [(ngModel)]="input" (ngModelChange)="process()"
          [placeholder]="mode()==='encode'?'Enter text to encode…':'Enter Base64 to decode…'"
          style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:13px;background:transparent;color:var(--text);line-height:1.6"></textarea>
      } @else {
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-muted);font-size:13px;padding:20px">
          @if (fileName()) {
            <dt-icon name="document" [size]="32" color="var(--teal)" />
            <div style="font-weight:500">{{ fileName() }}</div>
            <div style="font-size:11px;color:var(--text-faint)">{{ fileSize() }}</div>
          } @else {
            <dt-icon name="arrow-up-tray" [size]="32" color="var(--text-faint)" />
            <div>Drop a file or click "Choose file"</div>
          }
        </div>
      }
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
    @if (mode()==='encode' && output()) {
      <span>Padding: {{ paddingInfo() }}</span>
    }
    @if (urlSafe) { <span style="color:var(--teal)">URL-safe mode</span> }
  </div>
</div>
`
})
export class Base64Component {
  mode = signal<'encode'|'decode'>('encode');
  input = '';
  urlSafe = false;
  wrap76 = false;
  fileMode = false;
  output = signal('');
  error = signal('');
  copied = signal(false);
  fileName = signal('');
  fileSize = signal('');

  paddingInfo = computed(() => {
    const pads = (this.output().match(/=/g) || []).length;
    return pads === 0 ? 'No padding' : `${pads} padding char${pads > 1 ? 's' : ''}`;
  });

  setMode(m: 'encode'|'decode') { this.mode.set(m); this.process(); }

  encode(s: string, urlSafe: boolean): string {
    const b = btoa(unescape(encodeURIComponent(s)));
    return urlSafe ? b.replace(/\+/g, '-').replace(/\//g, '_') : b;
  }

  decode(s: string): string {
    const normal = s.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(normal)));
  }

  wrapText(s: string, width: number): string {
    const lines: string[] = [];
    for (let i = 0; i < s.length; i += width) lines.push(s.slice(i, i + width));
    return lines.join('\n');
  }

  process() {
    this.error.set('');
    if (!this.input.trim()) { this.output.set(''); return; }
    try {
      if (this.mode() === 'encode') {
        let result = this.encode(this.input, this.urlSafe);
        if (this.wrap76) result = this.wrapText(result, 76);
        this.output.set(result);
      } else {
        this.output.set(this.decode(this.input));
      }
    } catch (e: any) {
      this.error.set('Error: ' + (e.message || 'Invalid input'));
      this.output.set('');
    }
  }

  onFileModeToggle() {
    if (!this.fileMode) { this.fileName.set(''); this.fileSize.set(''); this.output.set(''); }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    const b = file.size;
    this.fileSize.set(b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(2) + ' MB');
    const reader = new FileReader();
    reader.onload = () => { this.output.set(reader.result as string); };
    reader.readAsDataURL(file);
  }

  copyOutput() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
