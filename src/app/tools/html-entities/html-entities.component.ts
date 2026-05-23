import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  '©': '&copy;', '®': '&reg;', '™': '&trade;', '°': '&deg;', '±': '&plusmn;',
  '×': '&times;', '÷': '&divide;', '€': '&euro;', '£': '&pound;', '¥': '&yen;',
  '¢': '&cent;', '½': '&frac12;', '¼': '&frac14;', '¾': '&frac34;', '…': '&hellip;',
  '—': '&mdash;', '–': '&ndash;', '\u201C': '&ldquo;', '\u201D': '&rdquo;', ' ': '&nbsp;',
};

const REVERSE_MAP: Record<string, string> = Object.fromEntries(Object.entries(ENTITY_MAP).map(([k,v]) => [v,k]));

const REFERENCE_ENTITIES = [
  { char: '&', entity: '&amp;', desc: 'Ampersand' },
  { char: '<', entity: '&lt;', desc: 'Less-than' },
  { char: '>', entity: '&gt;', desc: 'Greater-than' },
  { char: '"', entity: '&quot;', desc: 'Double quote' },
  { char: "'", entity: '&#39;', desc: 'Single quote' },
  { char: '©', entity: '&copy;', desc: 'Copyright' },
  { char: '®', entity: '&reg;', desc: 'Registered' },
  { char: '™', entity: '&trade;', desc: 'Trademark' },
  { char: '°', entity: '&deg;', desc: 'Degree' },
  { char: '±', entity: '&plusmn;', desc: 'Plus-minus' },
  { char: '×', entity: '&times;', desc: 'Multiply' },
  { char: '÷', entity: '&divide;', desc: 'Divide' },
  { char: '€', entity: '&euro;', desc: 'Euro' },
  { char: '£', entity: '&pound;', desc: 'Pound' },
  { char: '¥', entity: '&yen;', desc: 'Yen' },
  { char: '…', entity: '&hellip;', desc: 'Ellipsis' },
  { char: '—', entity: '&mdash;', desc: 'Em dash' },
  { char: '–', entity: '&ndash;', desc: 'En dash' },
  { char: ' ', entity: '&nbsp;', desc: 'Non-breaking space' },
];

@Component({
    selector: 'dt-tool-html-entities',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Encoding & Decoding', 'HTML Entities Encoder/Decoder']" [toolId]="'html'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="code-bracket-square" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">HTML Entities</div>
      <div style="font-size:12px;color:var(--text-muted)">Encode and decode HTML character entities</div>
    </div>
    <div style="flex:1"></div>
    <button (click)="process()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer">
      <dt-icon name="play" [size]="12" color="#fff" /> Run
    </button>
  </div>
  <!-- Toolbar -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px 22px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="display:flex;border:1px solid var(--border);border-radius:7px;overflow:hidden">
      <button (click)="setMode('encode')" [style.background]="mode()==='encode'?'var(--maroon)':'transparent'" [style.color]="mode()==='encode'?'#fff':'var(--text-muted)'" style="padding:4px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer">Encode → entities</button>
      <button (click)="setMode('decode')" [style.background]="mode()==='decode'?'var(--maroon)':'transparent'" [style.color]="mode()==='decode'?'#fff':'var(--text-muted)'" style="padding:4px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer">Decode ← entities</button>
    </div>
  </div>
  <!-- Body -->
  <div style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">
    <div style="flex:1;min-height:0;display:flex;overflow:hidden">
      <!-- Input -->
      <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border);min-width:0">
        <div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);flex-shrink:0">Input</div>
        <textarea [(ngModel)]="input" (ngModelChange)="process()"
          [placeholder]="mode()==='encode'?'Enter HTML or plain text to encode…':'Enter HTML with entities to decode…'"
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
        <pre style="flex:1;padding:14px;font-family:var(--font-mono);font-size:13px;color:var(--text);overflow:auto;margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.6">{{ output() }}</pre>
      </div>
    </div>
    <!-- Reference table -->
    <div style="flex-shrink:0;border-top:1px solid var(--border);padding:12px 22px;max-height:180px;overflow-y:auto">
      <div style="font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Common Entities Reference</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px">
        @for (e of refEntities; track e.entity) {
          <div style="display:flex;align-items:center;gap:8px;padding:3px 8px;background:var(--surface);border-radius:5px;font-size:11.5px">
            <span style="font-family:var(--font-mono);color:var(--maroon);min-width:18px;text-align:center">{{ e.char }}</span>
            <span style="font-family:var(--font-mono);color:var(--teal);flex:1">{{ e.entity }}</span>
            <span style="color:var(--text-faint)">{{ e.desc }}</span>
          </div>
        }
      </div>
    </div>
  </div>
</div>
`
})
export class HtmlEntitiesComponent {
  mode = signal<'encode'|'decode'>('encode');
  input = '';
  output = signal('');
  copied = signal(false);
  refEntities = REFERENCE_ENTITIES;

  setMode(m: 'encode'|'decode') { this.mode.set(m); this.process(); }

  encodeEntities(s: string): string {
    return s.replace(/[&<>"'©®™°±×÷€£¥¢½¼¾…—–"" ]/g, ch => ENTITY_MAP[ch] || ch);
  }

  decodeEntities(s: string): string {
    // decode named entities
    let result = s.replace(/&[a-zA-Z]+;/g, ent => REVERSE_MAP[ent] ?? ent);
    // decode numeric entities &#NNN; and &#xHHH;
    result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    result = result.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
    return result;
  }

  process() {
    if (!this.input) { this.output.set(''); return; }
    if (this.mode() === 'encode') {
      this.output.set(this.encodeEntities(this.input));
    } else {
      this.output.set(this.decodeEntities(this.input));
    }
  }

  copyOutput() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
