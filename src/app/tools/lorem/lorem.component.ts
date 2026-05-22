import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit',
  'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
  'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
  'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab',
  'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
  'explicabo', 'aspernatur', 'aut', 'odit', 'fugit', 'consequuntur', 'magni',
  'dolores', 'eos', 'ratione', 'sequi', 'nesciunt', 'neque', 'porro', 'quisquam',
  'nihil', 'molestiae', 'quod', 'maxime', 'placeat', 'facere', 'possimus', 'assumenda',
  'repellendus', 'temporibus', 'autem', 'quibusdam', 'officiis', 'debitis', 'rerum',
  'necessitatibus', 'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae',
];

let seedIndex = 0;
function nextWord(skipFirst = false): string {
  const w = WORDS[seedIndex % WORDS.length];
  seedIndex++;
  return w;
}

function generateWords(count: number): string {
  seedIndex = 0;
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDS[i % WORDS.length]);
  }
  if (words.length > 0) {
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  }
  return words.join(' ') + '.';
}

function generateSentence(wordCount: number = 0): string {
  const len = wordCount || 8 + Math.floor((seedIndex * 7) % 10);
  const words: string[] = [];
  for (let i = 0; i < len; i++) {
    words.push(WORDS[(seedIndex + i) % WORDS.length]);
  }
  seedIndex += len;
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function generateSentences(count: number): string {
  seedIndex = 0;
  const sentences: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 7 + (i * 3 + 5) % 9;
    sentences.push(generateSentence(len));
  }
  return sentences.join(' ');
}

function generateParagraphs(count: number): string {
  seedIndex = 0;
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentCount = 3 + (p % 3);
    const sentences: string[] = [];
    for (let s = 0; s < sentCount; s++) {
      const len = 8 + (p * 4 + s * 3) % 8;
      sentences.push(generateSentence(len));
    }
    paragraphs.push(sentences.join(' '));
  }
  return paragraphs.join('\n\n');
}

function generateLorem(count: number, unit: 'words' | 'sentences' | 'paragraphs'): string {
  if (unit === 'words') return generateWords(count);
  if (unit === 'sentences') return generateSentences(count);
  return generateParagraphs(count);
}

@Component({
  selector: 'dt-tool-lorem',
  standalone: true,
  imports: [TopbarComponent, IconComponent, FormsModule],
  template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Lorem Ipsum']" [toolId]="'lorem'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="type" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Lorem Ipsum</div>
          <div style="font-size:12px;color:var(--text-muted)">Generate placeholder text</div>
        </div>
        <div style="flex:1"></div>

        <!-- Controls -->
        <input
          type="number"
          [(ngModel)]="count"
          min="1"
          max="500"
          style="width:72px;height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;outline:none;text-align:center"
        />

        <select [(ngModel)]="unit" style="height:28px;padding:0 8px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12.5px;cursor:pointer;outline:none">
          <option value="words">Words</option>
          <option value="sentences">Sentences</option>
          <option value="paragraphs">Paragraphs</option>
        </select>

        <button (click)="generate()" style="background:var(--maroon);color:#fff;height:28px;padding:0 14px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none">
          <dt-icon name="play" [size]="13" [color]="'#fff'" />
          Generate
        </button>

        <button (click)="copy()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none"
          [disabled]="!output()">
          <dt-icon name="copy" [size]="13" [color]="'#fff'" />
          {{ copied() ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- Output area -->
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">
        <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">OUTPUT</span>
        </div>

        @if (!output()) {
          <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:var(--surface)">
            <div style="font-size:32px;opacity:0.2">Aa</div>
            <div style="font-size:13px;color:var(--text-muted)">Set options and click Generate</div>
          </div>
        } @else {
          <pre style="flex:1;overflow:auto;margin:0;padding:20px 24px;font-family:var(--font-ui);font-size:14px;line-height:1.75;background:var(--surface);color:var(--text);white-space:pre-wrap;word-break:break-word">{{ output() }}</pre>
        }

        <!-- Footer -->
        <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:8px">
          @if (output()) {
            <span style="font-size:11.5px;color:var(--text-faint)">{{ wordCount() }} words · {{ paragraphCount() }} paragraph{{ paragraphCount() === 1 ? '' : 's' }} · {{ output().length }} chars</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`],
})
export class LoremComponent {
  count = 3;
  unit: 'words' | 'sentences' | 'paragraphs' = 'paragraphs';
  output = signal('');
  copied = signal(false);

  wordCount = computed(() => {
    const o = this.output();
    if (!o) return 0;
    return o.split(/\s+/).filter(Boolean).length;
  });

  paragraphCount = computed(() => {
    const o = this.output();
    if (!o) return 0;
    return o.split('\n\n').filter(Boolean).length;
  });

  generate() {
    const n = Math.max(1, Math.min(500, this.count || 1));
    this.output.set(generateLorem(n, this.unit));
  }

  async copy() {
    const o = this.output();
    if (!o) return;
    await navigator.clipboard.writeText(o);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
