import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ── Case conversion functions ──────────────────────────────────────────────

function tokenize(s: string): string[] {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_./\s]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
}

function toCamel(s: string): string {
  const tokens = tokenize(s);
  return tokens.map((t, i) => i === 0 ? t : t[0].toUpperCase() + t.slice(1)).join('');
}
function toPascal(s: string): string {
  return tokenize(s).map(t => t[0].toUpperCase() + t.slice(1)).join('');
}
function toSnake(s: string): string { return tokenize(s).join('_'); }
function toKebab(s: string): string { return tokenize(s).join('-'); }
function toScreaming(s: string): string { return tokenize(s).join('_').toUpperCase(); }
function toTitle(s: string): string {
  return tokenize(s).map(t => t[0].toUpperCase() + t.slice(1)).join(' ');
}
function toUpper(s: string): string { return s.toUpperCase(); }
function toLower(s: string): string { return s.toLowerCase(); }
function toDot(s: string): string { return tokenize(s).join('.'); }
function toPath(s: string): string { return tokenize(s).join('/'); }
function toSentence(s: string): string {
  const flat = tokenize(s).join(' ');
  return flat ? flat[0].toUpperCase() + flat.slice(1) : '';
}
function toConstant(s: string): string { return toScreaming(s); }

interface CaseEntry {
  id: string;
  label: string;
  example: string;
  fn: (s: string) => string;
}

const CASES: CaseEntry[] = [
  { id: 'camel',     label: 'camelCase',        example: 'helloWorld',       fn: toCamel },
  { id: 'pascal',    label: 'PascalCase',        example: 'HelloWorld',       fn: toPascal },
  { id: 'snake',     label: 'snake_case',        example: 'hello_world',      fn: toSnake },
  { id: 'kebab',     label: 'kebab-case',        example: 'hello-world',      fn: toKebab },
  { id: 'screaming', label: 'SCREAMING_SNAKE',   example: 'HELLO_WORLD',      fn: toScreaming },
  { id: 'title',     label: 'Title Case',        example: 'Hello World',      fn: toTitle },
  { id: 'upper',     label: 'UPPER CASE',        example: 'HELLO WORLD',      fn: toUpper },
  { id: 'lower',     label: 'lower case',        example: 'hello world',      fn: toLower },
  { id: 'dot',       label: 'dot.case',          example: 'hello.world',      fn: toDot },
  { id: 'path',      label: 'path/case',         example: 'hello/world',      fn: toPath },
  { id: 'sentence',  label: 'Sentence case',     example: 'Hello world',      fn: toSentence },
];

@Component({
    selector: 'dt-tool-text-case',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Text Case']" [toolId]="'case'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="type" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Text Case</div>
          <div style="font-size:12px;color:var(--text-muted)">Convert between naming conventions</div>
        </div>
        <div style="flex:1"></div>
        <button (click)="clear()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          Clear
        </button>
      </div>

      <!-- Body -->
      <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column">

        <!-- Input area -->
        <div style="padding:18px 22px 0;flex-shrink:0">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">INPUT TEXT</div>
          <textarea
            style="width:100%;box-sizing:border-box;height:80px;resize:vertical;border:1px solid var(--border);outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);border-radius:8px;line-height:1.5"
            [value]="inputVal()"
            (input)="onInput($event)"
            placeholder="Type or paste text to convert…"
            spellcheck="false"
          ></textarea>
          @if (inputVal().trim()) {
            <div style="font-size:11.5px;color:var(--text-faint);margin-top:4px">{{ tokenCount() }} token{{ tokenCount() === 1 ? '' : 's' }} detected</div>
          }
        </div>

        <!-- Conversions grid -->
        <div style="padding:16px 22px 22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          @for (c of cases; track c.id) {
            <div style="border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface)">
              <!-- Case label header -->
              <div style="padding:7px 12px;display:flex;align-items:center;justify-content:space-between;background:var(--surface-muted);border-bottom:1px solid var(--border)">
                <span style="font-size:11.5px;font-weight:600;color:var(--text-muted)">{{ c.label }}</span>
                <button (click)="copyCase(c.id)" style="background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:5px;font-size:11px;color:var(--text-faint);display:flex;align-items:center;gap:4px"
                  [style.color]="copiedId() === c.id ? 'var(--teal)' : 'var(--text-faint)'">
                  <dt-icon [name]="copiedId() === c.id ? 'check' : 'copy'" [size]="11" />
                  {{ copiedId() === c.id ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <!-- Result -->
              <div style="padding:10px 12px;font-family:var(--font-mono);font-size:13px;color:var(--text);word-break:break-all;min-height:38px">
                @if (inputVal().trim()) {
                  <span>{{ convert(c.id) }}</span>
                } @else {
                  <span style="color:var(--text-faint)">{{ c.example }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
    styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`]
})
export class TextCaseComponent {
  inputVal = signal('');
  copiedId = signal('');
  cases = CASES;

  tokenCount = computed(() => {
    const s = this.inputVal().trim();
    if (!s) return 0;
    return tokenize(s).length;
  });

  onInput(e: Event) {
    this.inputVal.set((e.target as HTMLTextAreaElement).value);
  }

  convert(id: string): string {
    const s = this.inputVal().trim();
    if (!s) return '';
    const entry = CASES.find(c => c.id === id);
    if (!entry) return s;
    try { return entry.fn(s); } catch { return s; }
  }

  async copyCase(id: string) {
    const result = this.convert(id);
    if (!result) return;
    await navigator.clipboard.writeText(result);
    this.copiedId.set(id);
    setTimeout(() => this.copiedId.set(''), 1500);
  }

  clear() {
    this.inputVal.set('');
  }
}
