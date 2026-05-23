import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface RegexMatch {
  index: number;
  value: string;
  groups: (string | undefined)[];
  namedGroups: Record<string, string | undefined>;
}

interface RegexToken {
  text: string;
  meaning: string;
}

function explainRegex(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '^') { tokens.push({ text: '^', meaning: 'Start of string/line' }); i++; }
    else if (ch === '$') { tokens.push({ text: '$', meaning: 'End of string/line' }); i++; }
    else if (ch === '.') { tokens.push({ text: '.', meaning: 'Any character (except newline)' }); i++; }
    else if (ch === '*') { tokens.push({ text: '*', meaning: 'Zero or more of previous' }); i++; }
    else if (ch === '+') { tokens.push({ text: '+', meaning: 'One or more of previous' }); i++; }
    else if (ch === '?') { tokens.push({ text: '?', meaning: 'Zero or one of previous (optional)' }); i++; }
    else if (ch === '|') { tokens.push({ text: '|', meaning: 'OR — match either side' }); i++; }
    else if (ch === '\\') {
      const next = pattern[i + 1] ?? '';
      const combo = '\\' + next;
      const meanings: Record<string, string> = {
        'd': 'Any digit (0–9)', 'D': 'Any non-digit',
        'w': 'Word character (a-z, A-Z, 0-9, _)', 'W': 'Non-word character',
        's': 'Whitespace', 'S': 'Non-whitespace',
        'b': 'Word boundary', 'B': 'Non-word boundary',
        'n': 'Newline', 't': 'Tab', 'r': 'Carriage return',
        '0': 'Null character',
      };
      tokens.push({ text: combo, meaning: meanings[next] || `Escaped character "${next}"` });
      i += 2;
    }
    else if (ch === '[') {
      let j = i + 1;
      let cls = '[';
      while (j < pattern.length && pattern[j] !== ']') { cls += pattern[j]; j++; }
      cls += ']';
      const negate = cls[1] === '^';
      const inner = negate ? cls.slice(2, -1) : cls.slice(1, -1);
      tokens.push({ text: cls, meaning: (negate ? 'Any character NOT in: ' : 'Any character in: ') + inner });
      i = j + 1;
    }
    else if (ch === '(') {
      // Find matching paren
      let j = i + 1;
      let depth = 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '(') depth++;
        else if (pattern[j] === ')') depth--;
        j++;
      }
      const inner = pattern.slice(i + 1, j - 1);
      let meaning = 'Capture group';
      if (inner.startsWith('?:')) meaning = 'Non-capturing group';
      else if (inner.startsWith('?=')) meaning = 'Positive lookahead';
      else if (inner.startsWith('?!')) meaning = 'Negative lookahead';
      else if (inner.startsWith('?<=')) meaning = 'Positive lookbehind';
      else if (inner.startsWith('?<!')) meaning = 'Negative lookbehind';
      else if (inner.startsWith('?<')) meaning = `Named capture group "${inner.slice(2, inner.indexOf('>'))}"`;
      tokens.push({ text: '(' + inner + ')', meaning });
      i = j;
    }
    else if (ch === '{') {
      let j = i;
      while (j < pattern.length && pattern[j] !== '}') j++;
      const quant = pattern.slice(i, j + 1);
      const [min, max] = quant.slice(1, -1).split(',');
      const meaning = max === undefined
        ? `Exactly ${min} times`
        : max === ''
          ? `${min} or more times`
          : `Between ${min} and ${max} times`;
      tokens.push({ text: quant, meaning });
      i = j + 1;
    }
    else {
      tokens.push({ text: ch, meaning: `Literal "${ch}"` });
      i++;
    }
  }
  return tokens;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

@Component({
    selector: 'dt-tool-regex',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Regex Tester']" [toolId]="'regex'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="regex" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Regex Tester</div>
          <div style="font-size:12px;color:var(--text-muted)">Test and explain regular expressions</div>
        </div>
      </div>

      <!-- Pattern input row -->
      <div style="padding:14px 18px 10px;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <!-- Pattern -->
          <div style="flex:1;min-width:240px;display:flex;align-items:center;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--surface)">
            <span style="padding:0 10px;font-family:var(--font-mono);font-size:16px;color:var(--text-muted);user-select:none">/</span>
            <input
              type="text"
              [value]="pattern()"
              (input)="onPatternInput($event)"
              placeholder="Enter regex pattern…"
              style="flex:1;height:36px;border:none;outline:none;font-family:var(--font-mono);font-size:13.5px;background:transparent;color:var(--text);padding:0"
              spellcheck="false"
            />
            <span style="padding:0 10px;font-family:var(--font-mono);font-size:16px;color:var(--text-muted);user-select:none">/</span>
          </div>

          <!-- Flags -->
          <div style="display:flex;gap:4px">
            @for (f of allFlags; track f) {
              <button (click)="toggleFlag(f)"
                [style.background]="hasFlag(f) ? 'var(--maroon)' : 'var(--surface)'"
                [style.color]="hasFlag(f) ? '#fff' : 'var(--text-muted)'"
                [style.border]="'1px solid ' + (hasFlag(f) ? 'var(--maroon)' : 'var(--border)')"
                style="width:28px;height:28px;border-radius:6px;font-family:var(--font-mono);font-size:13px;font-weight:600;cursor:pointer;display:grid;place-items:center"
                [title]="flagMeanings[f]">
                {{ f }}
              </button>
            }
          </div>

          @if (regexError()) {
            <span style="font-size:12px;color:#e05252">{{ regexError() }}</span>
          } @else if (pattern() && testStr()) {
            <span style="font-size:12.5px;font-weight:600"
              [style.color]="matches().length > 0 ? 'var(--teal)' : '#e05252'">
              {{ matches().length }} match{{ matches().length === 1 ? '' : 'es' }}
            </span>
          }
        </div>

        <!-- Substitution -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <span style="font-size:12px;color:var(--text-muted);min-width:80px">Replace with</span>
          <input
            type="text"
            [value]="replacement()"
            (input)="onReplacementInput($event)"
            placeholder="Replacement string… ($1, $2 for groups)"
            style="flex:1;height:30px;padding:0 10px;border:1px solid var(--border);border-radius:7px;outline:none;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text)"
            spellcheck="false"
          />
          @if (replaced()) {
            <button (click)="copyReplaced()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none;white-space:nowrap">
              <dt-icon name="copy" [size]="13" [color]="'#fff'" />
              {{ copiedReplaced() ? 'Copied!' : 'Copy result' }}
            </button>
          }
        </div>
      </div>

      <!-- Main body -->
      <div style="flex:1;min-height:0;display:flex;overflow:hidden">

        <!-- Left: test string + highlighted output + matches -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border)">

          <!-- Test string -->
          <div style="border-bottom:1px solid var(--border);flex-shrink:0">
            <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted)">
              <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">TEST STRING</span>
            </div>
            <textarea
              style="width:100%;box-sizing:border-box;height:100px;resize:none;border:none;outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5"
              [value]="testStr()"
              (input)="onTestInput($event)"
              placeholder="Enter test string here…"
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Highlighted view -->
          <div style="border-bottom:1px solid var(--border);flex-shrink:0">
            <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted)">
              <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">HIGHLIGHTED</span>
            </div>
            <div
              style="min-height:52px;max-height:100px;overflow:auto;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-all"
              [innerHTML]="highlightedHtml()"
            ></div>
          </div>

          <!-- Replacement result -->
          @if (replacement() && testStr()) {
            <div style="border-bottom:1px solid var(--border);flex-shrink:0">
              <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted)">
                <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">REPLACED</span>
              </div>
              <div style="min-height:40px;max-height:80px;overflow:auto;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--teal);line-height:1.5;white-space:pre-wrap;word-break:break-all">
                {{ replaced() }}
              </div>
            </div>
          }

          <!-- Matches list -->
          <div style="flex:1;overflow:auto;padding:12px 14px">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">MATCHES</div>
            @if (!pattern()) {
              <div style="color:var(--text-faint);font-size:12.5px">Enter a pattern above to see matches.</div>
            } @else if (regexError()) {
              <div style="color:#e05252;font-size:12.5px">{{ regexError() }}</div>
            } @else if (!matches().length) {
              <div style="color:var(--text-faint);font-size:12.5px">No matches found.</div>
            } @else {
              @for (m of matches(); track $index) {
                <div style="margin-bottom:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden;font-size:12.5px">
                  <div style="padding:6px 12px;background:var(--surface-muted);display:flex;gap:10px;font-family:var(--font-mono)">
                    <span style="color:var(--text-muted)">Match {{ $index + 1 }}</span>
                    <span style="color:var(--teal);font-weight:600">{{ m.value }}</span>
                    <span style="color:var(--text-faint)">&#64; index {{ m.index }}</span>
                  </div>
                  @if (m.groups.length > 0 || objectKeys(m.namedGroups).length > 0) {
                    <div style="padding:6px 12px;background:var(--surface);font-family:var(--font-mono)">
                      @for (g of m.groups; track $index) {
                        <div style="color:var(--text-muted)"><span style="color:var(--text-faint)">Group {{ $index + 1 }}:</span> {{ g ?? 'undefined' }}</div>
                      }
                      @for (key of objectKeys(m.namedGroups); track key) {
                        <div style="color:var(--text-muted)"><span style="color:var(--text-faint)">&#x3C;{{ key }}&#x3E;:</span> {{ m.namedGroups[key] ?? 'undefined' }}</div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>

        <!-- Right: Explain panel -->
        <div style="width:280px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">EXPLAIN</span>
          </div>
          <div style="flex:1;overflow:auto;padding:12px 14px">
            @if (!pattern()) {
              <div style="color:var(--text-faint);font-size:12.5px;line-height:1.6">
                Enter a pattern to see what each part means.
              </div>
            } @else if (regexError()) {
              <div style="color:#e05252;font-size:12.5px">{{ regexError() }}</div>
            } @else {
              @for (token of explainTokens(); track $index) {
                <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start">
                  <code style="font-family:var(--font-mono);font-size:13px;background:var(--maroon-soft);color:var(--maroon);padding:1px 6px;border-radius:4px;flex-shrink:0;line-height:1.6">{{ token.text }}</code>
                  <span style="font-size:12px;color:var(--text-muted);line-height:1.6">{{ token.meaning }}</span>
                </div>
              }
            }

            <!-- Flags legend -->
            @if (flags()) {
              <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">ACTIVE FLAGS</div>
                @for (f of activeFlags(); track f) {
                  <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
                    <code style="font-family:var(--font-mono);font-size:13px;background:var(--maroon-soft);color:var(--maroon);padding:1px 6px;border-radius:4px;min-width:18px;text-align:center">{{ f }}</code>
                    <span style="font-size:12px;color:var(--text-muted)">{{ flagMeanings[f] }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display:flex; flex-direction:column; flex:1; min-height:0; }
    .match-highlight { background: rgba(var(--teal-rgb, 56,178,172), 0.25); border-radius: 2px; outline: 1.5px solid var(--teal); }
  `]
})
export class RegexComponent {
  private sanitizer = inject(DomSanitizer);

  pattern = signal('');
  flags = signal('g');
  testStr = signal('');
  replacement = signal('');
  copiedReplaced = signal(false);

  allFlags = ['g', 'i', 'm', 's', 'u'];
  flagMeanings: Record<string, string> = {
    g: 'Global — find all matches',
    i: 'Case-insensitive',
    m: 'Multiline — ^ and $ match line boundaries',
    s: 'Dot-all — . matches newline',
    u: 'Unicode mode',
  };

  hasFlag(f: string): boolean { return this.flags().includes(f); }

  activeFlags = computed(() => this.allFlags.filter(f => this.flags().includes(f)));

  toggleFlag(f: string) {
    const cur = this.flags();
    if (cur.includes(f)) {
      this.flags.set(cur.replace(f, ''));
    } else {
      this.flags.set(cur + f);
    }
  }

  regexError = computed(() => {
    const p = this.pattern();
    if (!p) return '';
    try { new RegExp(p, this.flags()); return ''; }
    catch (e: unknown) { return e instanceof Error ? e.message : 'Invalid regex'; }
  });

  private getRegex(): RegExp | null {
    const p = this.pattern();
    if (!p || this.regexError()) return null;
    try { return new RegExp(p, this.flags()); } catch { return null; }
  }

  matches = computed((): RegexMatch[] => {
    const re = this.getRegex();
    if (!re || !this.testStr()) return [];
    const results: RegexMatch[] = [];
    const str = this.testStr();
    try {
      if (re.global || re.sticky) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(str)) !== null) {
          results.push({
            index: m.index,
            value: m[0],
            groups: Array.from(m).slice(1),
            namedGroups: (m.groups as Record<string, string | undefined>) ?? {},
          });
          if (!re.global && !re.sticky) break;
          if (m[0].length === 0) re.lastIndex++;
        }
      } else {
        const m = re.exec(str);
        if (m) {
          results.push({
            index: m.index,
            value: m[0],
            groups: Array.from(m).slice(1),
            namedGroups: (m.groups as Record<string, string | undefined>) ?? {},
          });
        }
      }
    } catch { /* ignore */ }
    return results;
  });

  highlightedHtml = computed(() => {
    const str = this.testStr();
    if (!str) return '';
    const ms = this.matches();
    if (!ms.length) return escapeHtml(str);

    let result = '';
    let lastIdx = 0;
    for (const m of ms) {
      if (m.index > lastIdx) {
        result += escapeHtml(str.slice(lastIdx, m.index));
      }
      result += `<mark style="background:rgba(56,178,172,0.25);border-radius:2px;outline:1.5px solid var(--teal);color:inherit">${escapeHtml(m.value)}</mark>`;
      lastIdx = m.index + m.value.length;
    }
    result += escapeHtml(str.slice(lastIdx));
    return result;
  });

  replaced = computed(() => {
    const re = this.getRegex();
    const repl = this.replacement();
    const str = this.testStr();
    if (!re || !repl || !str) return '';
    try { return str.replace(re, repl); } catch { return ''; }
  });

  explainTokens = computed(() => {
    const p = this.pattern();
    if (!p || this.regexError()) return [] as RegexToken[];
    try { return explainRegex(p); } catch { return []; }
  });

  onPatternInput(e: Event) {
    this.pattern.set((e.target as HTMLInputElement).value);
  }
  onTestInput(e: Event) {
    this.testStr.set((e.target as HTMLTextAreaElement).value);
  }
  onReplacementInput(e: Event) {
    this.replacement.set((e.target as HTMLInputElement).value);
  }

  objectKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj);
  }

  async copyReplaced() {
    const r = this.replaced();
    if (!r) return;
    await navigator.clipboard.writeText(r);
    this.copiedReplaced.set(true);
    setTimeout(() => this.copiedReplaced.set(false), 1500);
  }
}
