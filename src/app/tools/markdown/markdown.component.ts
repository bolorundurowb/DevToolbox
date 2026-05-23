import { Component, signal, computed, effect, inject, SecurityContext } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { marked } from 'marked';

const SAMPLE_MD = `# Hello, Markdown!

A quick overview of **Markdown** syntax.

## Features

- **Bold** and _italic_ text
- \`Inline code\` and code blocks
- [Links](https://example.com)
- > Blockquotes

## Code

\`\`\`js
const greet = name => \`Hello, \${name}!\`;
console.log(greet('World'));
\`\`\`

## Table

| Name    | Role       | Status  |
|---------|------------|---------|
| Alice   | Engineer   | Active  |
| Bob     | Designer   | Active  |
`;

@Component({
    selector: 'dt-tool-markdown',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Markdown Preview']" [toolId]="'md'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="type" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Markdown Preview</div>
          <div style="font-size:12px;color:var(--text-muted)">Live Markdown renderer</div>
        </div>
        <div style="flex:1"></div>

        <button (click)="loadSample()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          Sample
        </button>

        <button (click)="copyHtml()" style="background:transparent;color:var(--text);border:1px solid var(--border);height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          <dt-icon name="copy" [size]="13" />
          {{ copiedHtml() ? 'Copied HTML!' : 'Copy HTML' }}
        </button>

        <button (click)="copyMd()" style="background:var(--teal);color:#fff;height:28px;padding:0 12px;border-radius:7px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:none">
          <dt-icon name="copy" [size]="13" [color]="'#fff'" />
          {{ copiedMd() ? 'Copied!' : 'Copy MD' }}
        </button>
      </div>

      <!-- Two-pane body -->
      <div style="flex:1;min-height:0;display:flex;overflow:hidden">

        <!-- Input pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border)">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">MARKDOWN</span>
          </div>
          <textarea
            style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);min-height:0;line-height:1.6"
            [value]="inputVal()"
            (input)="onInput($event)"
            placeholder="Write or paste Markdown here…"
            spellcheck="false"
          ></textarea>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0;gap:6px">
            @if (inputVal().trim()) {
              <span style="font-size:11.5px;color:var(--text-faint)">{{ wordCount() }} words · {{ inputVal().split('\n').length }} lines</span>
            }
          </div>
        </div>

        <!-- Preview pane -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">PREVIEW</span>
          </div>
          <div
            class="md-preview"
            style="flex:1;overflow:auto;padding:20px 28px;background:var(--surface);color:var(--text);font-size:14px;line-height:1.7"
            [innerHTML]="safeHtml()"
          ></div>
          <div style="height:28px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-top:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11.5px;color:var(--text-faint)">Live preview</span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display:flex; flex-direction:column; flex:1; min-height:0; }
    .md-preview h1,.md-preview h2,.md-preview h3,.md-preview h4 { font-weight:600; letter-spacing:-0.3px; margin:1.2em 0 0.5em; color:var(--text); }
    .md-preview h1 { font-size:1.8em; border-bottom:1px solid var(--border); padding-bottom:0.3em; }
    .md-preview h2 { font-size:1.4em; border-bottom:1px solid var(--border); padding-bottom:0.2em; }
    .md-preview h3 { font-size:1.15em; }
    .md-preview p { margin:0.8em 0; }
    .md-preview code { font-family:var(--font-mono); font-size:0.88em; background:var(--surface-muted); padding:2px 5px; border-radius:4px; border:1px solid var(--border); }
    .md-preview pre { background:var(--surface-muted); border:1px solid var(--border); border-radius:8px; padding:14px 16px; overflow:auto; margin:1em 0; }
    .md-preview pre code { background:none; border:none; padding:0; font-size:0.85em; }
    .md-preview blockquote { border-left:3px solid var(--maroon); margin:1em 0; padding:4px 16px; color:var(--text-muted); background:var(--surface-muted); border-radius:0 6px 6px 0; }
    .md-preview ul,.md-preview ol { padding-left:1.5em; margin:0.8em 0; }
    .md-preview li { margin:0.3em 0; }
    .md-preview a { color:var(--teal); text-decoration:none; }
    .md-preview a:hover { text-decoration:underline; }
    .md-preview table { border-collapse:collapse; width:100%; margin:1em 0; font-size:0.9em; }
    .md-preview th,.md-preview td { border:1px solid var(--border); padding:7px 12px; text-align:left; }
    .md-preview th { background:var(--surface-muted); font-weight:600; }
    .md-preview img { max-width:100%; border-radius:6px; }
    .md-preview hr { border:none; border-top:1px solid var(--border); margin:1.5em 0; }
  `]
})
export class MarkdownComponent {
  private sanitizer = inject(DomSanitizer);
  inputVal = signal('');
  copiedMd = signal(false);
  copiedHtml = signal(false);
  private rawHtml = signal('');

  wordCount = computed(() => {
    const t = this.inputVal().trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  });

  safeHtml = computed(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.rawHtml());
  });

  onInput(e: Event) {
    const val = (e.target as HTMLTextAreaElement).value;
    this.inputVal.set(val);
    this.renderMarkdown(val);
  }

  private async renderMarkdown(md: string) {
    if (!md.trim()) { this.rawHtml.set(''); return; }
    try {
      const result = await marked(md, { async: true });
      this.rawHtml.set(typeof result === 'string' ? result : '');
    } catch {
      this.rawHtml.set('<p style="color:#e05252">Render error</p>');
    }
  }

  loadSample() {
    this.inputVal.set(SAMPLE_MD);
    this.renderMarkdown(SAMPLE_MD);
  }

  async copyMd() {
    await navigator.clipboard.writeText(this.inputVal());
    this.copiedMd.set(true);
    setTimeout(() => this.copiedMd.set(false), 1500);
  }

  async copyHtml() {
    await navigator.clipboard.writeText(this.rawHtml());
    this.copiedHtml.set(true);
    setTimeout(() => this.copiedHtml.set(false), 1500);
  }
}
