import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

type Direction = 'escape' | 'unescape';
type Language = 'java' | 'csharp' | 'python' | 'javascript' | 'go' | 'sql';

function escapeJava(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/[-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
}

function unescapeJava(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function escapeCsharp(s: string): string { return escapeJava(s); }
function unescapeCsharp(s: string): string { return unescapeJava(s); }

function escapePython(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\x00')
    .replace(/[-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
}
function unescapePython(s: string): string { return unescapeJava(s); }

function escapeJs(s: string): string { return escapeJava(s); }
function unescapeJs(s: string): string { return unescapeJava(s); }

function escapeGo(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\000')
    .replace(/[-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
}
function unescapeGo(s: string): string { return unescapeJava(s); }

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}
function unescapeSql(s: string): string {
  return s.replace(/''/g, "'");
}

function doEscape(lang: Language, s: string): string {
  switch (lang) {
    case 'java':       return escapeJava(s);
    case 'csharp':     return escapeCsharp(s);
    case 'python':     return escapePython(s);
    case 'javascript': return escapeJs(s);
    case 'go':         return escapeGo(s);
    case 'sql':        return escapeSql(s);
  }
}

function doUnescape(lang: Language, s: string): string {
  switch (lang) {
    case 'java':       return unescapeJava(s);
    case 'csharp':     return unescapeCsharp(s);
    case 'python':     return unescapePython(s);
    case 'javascript': return unescapeJs(s);
    case 'go':         return unescapeGo(s);
    case 'sql':        return unescapeSql(s);
  }
}

@Component({
  selector: 'dt-tool-string-escaper',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Utilities', 'String Escaper']" [toolId]="'str-escape'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="code-bracket" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">String Escaper / Unescaper</div>
      <div style="font-size:12px;color:var(--text-muted)">Escape/unescape for Java, C#, Python, JavaScript, Go, SQL</div>
    </div>
  </div>

  <!-- Controls -->
  <div style="display:flex;align-items:center;gap:14px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <!-- Language -->
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      @for (l of languages; track l.key) {
        <button (click)="lang.set(l.key)"
          [style.background]="lang()===l.key ? 'var(--maroon)' : 'transparent'"
          [style.color]="lang()===l.key ? '#fff' : 'var(--text-muted)'"
          style="padding:4px 11px;font-size:12px;font-weight:500;border:none;cursor:pointer">
          {{ l.label }}
        </button>
      }
    </div>
    <!-- Direction -->
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      <button (click)="dir.set('escape')"
        [style.background]="dir()==='escape' ? 'var(--teal)' : 'transparent'"
        [style.color]="dir()==='escape' ? '#fff' : 'var(--text-muted)'"
        style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">
        Escape
      </button>
      <button (click)="dir.set('unescape')"
        [style.background]="dir()==='unescape' ? 'var(--teal)' : 'transparent'"
        [style.color]="dir()==='unescape' ? '#fff' : 'var(--text-muted)'"
        style="padding:4px 12px;font-size:12px;font-weight:500;border:none;cursor:pointer">
        Unescape
      </button>
    </div>
  </div>

  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0;overflow:hidden">
    <!-- Input -->
    <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0">
        {{ dir() === 'escape' ? 'Raw String' : 'Escaped String' }}
      </div>
      <textarea [(ngModel)]="input" (ngModelChange)="process()"
        [placeholder]="dir() === 'escape' ? 'Enter raw string with newlines, tabs, etc.' : 'Enter escaped string like: Hello\\nWorld'"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
    <!-- Output -->
    <div style="display:flex;flex-direction:column;min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;gap:6px">
        {{ dir() === 'escape' ? 'Escaped Output' : 'Unescaped Output' }}
        <div style="flex:1"></div>
        @if (output()) {
          <button (click)="copyOut()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        }
      </div>
      @if (error()) {
        <div style="margin:10px;padding:8px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:12px">{{ error() }}</div>
      }
      <textarea readonly [value]="output()"
        style="flex:1;resize:none;border:none;outline:none;padding:12px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
  </div>

  <!-- Reference panel -->
  <div style="border-top:1px solid var(--border);padding:10px 22px;flex-shrink:0;background:var(--surface)">
    <div style="font-size:11.5px;color:var(--text-faint);display:flex;flex-wrap:wrap;gap:12px">
      @for (r of reference(); track r) {
        <span style="font-family:var(--font-mono)">{{ r }}</span>
      }
    </div>
  </div>
</div>
`,
})
export class StringEscaperComponent {
  languages: Array<{ key: Language; label: string }> = [
    { key: 'java',       label: 'Java/Kotlin' },
    { key: 'csharp',     label: 'C#' },
    { key: 'python',     label: 'Python' },
    { key: 'javascript', label: 'JavaScript' },
    { key: 'go',         label: 'Go' },
    { key: 'sql',        label: 'SQL' },
  ];
  lang = signal<Language>('java');
  dir = signal<Direction>('escape');
  input = '';
  output = signal('');
  error = signal('');
  copied = signal(false);

  reference = computed(() => {
    const l = this.lang();
    if (l === 'sql') return ["'' = single quote", '(SQL uses double single-quotes)'];
    return ['\\n = newline', '\\r = carriage return', '\\t = tab', '\\\\ = backslash', '\\" = double quote', "\\' = single quote", '\\0 = null', '\\uXXXX = unicode'];
  });

  process() {
    this.error.set('');
    if (!this.input) { this.output.set(''); return; }
    try {
      const result = this.dir() === 'escape'
        ? doEscape(this.lang(), this.input)
        : doUnescape(this.lang(), this.input);
      this.output.set(result);
    } catch (e: any) {
      this.error.set('Error: ' + (e?.message ?? String(e)));
    }
  }

  copyOut() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
