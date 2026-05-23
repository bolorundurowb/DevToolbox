import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import * as Diff from 'diff';

interface DiffLine {
  text: string;
  type: 'added' | 'removed' | 'equal';
  lineNumLeft: number | null;
  lineNumRight: number | null;
}

function buildSideBySide(before: string, after: string): DiffLine[] {
  const changes = Diff.diffLines(before, after, { newlineIsToken: false });
  const lines: DiffLine[] = [];
  let leftNum = 1;
  let rightNum = 1;

  for (const change of changes) {
    const parts = change.value.split('\n');
    // Remove trailing empty string from split
    if (parts[parts.length - 1] === '') parts.pop();

    for (const part of parts) {
      if (change.added) {
        lines.push({ text: part, type: 'added', lineNumLeft: null, lineNumRight: rightNum++ });
      } else if (change.removed) {
        lines.push({ text: part, type: 'removed', lineNumLeft: leftNum++, lineNumRight: null });
      } else {
        lines.push({ text: part, type: 'equal', lineNumLeft: leftNum++, lineNumRight: rightNum++ });
      }
    }
  }
  return lines;
}

function buildInline(before: string, after: string): DiffLine[] {
  const changes = Diff.diffLines(before, after);
  const lines: DiffLine[] = [];
  let leftNum = 1;
  let rightNum = 1;

  for (const change of changes) {
    const parts = change.value.split('\n');
    if (parts[parts.length - 1] === '') parts.pop();

    for (const part of parts) {
      if (change.added) {
        lines.push({ text: part, type: 'added', lineNumLeft: null, lineNumRight: rightNum++ });
      } else if (change.removed) {
        lines.push({ text: part, type: 'removed', lineNumLeft: leftNum++, lineNumRight: null });
      } else {
        lines.push({ text: part, type: 'equal', lineNumLeft: leftNum++, lineNumRight: rightNum++ });
      }
    }
  }
  return lines;
}

@Component({
    selector: 'dt-tool-diff',
    imports: [TopbarComponent, IconComponent, FormsModule],
    template: `
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">
      <dt-topbar [crumbs]="['Text & Code', 'Diff Viewer']" [toolId]="'diff'" />

      <!-- Header bar -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px 8px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
          <dt-icon name="diff" [size]="16" [color]="'var(--maroon)'" />
        </div>
        <div>
          <div style="font-size:15.5px;font-weight:600;letter-spacing:-0.2px;color:var(--text)">Diff Viewer</div>
          <div style="font-size:12px;color:var(--text-muted)">Compare two texts and highlight changes</div>
        </div>
        <div style="flex:1"></div>

        <!-- Mode toggle -->
        <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button (click)="viewMode.set('split')"
            [style.background]="viewMode() === 'split' ? 'var(--maroon)' : 'var(--surface)'"
            [style.color]="viewMode() === 'split' ? '#fff' : 'var(--text-muted)'"
            style="height:28px;padding:0 12px;border:none;font-size:12.5px;font-weight:500;cursor:pointer">
            Split
          </button>
          <button (click)="viewMode.set('inline')"
            [style.background]="viewMode() === 'inline' ? 'var(--maroon)' : 'var(--surface)'"
            [style.color]="viewMode() === 'inline' ? '#fff' : 'var(--text-muted)'"
            style="height:28px;padding:0 12px;border:none;font-size:12.5px;font-weight:500;cursor:pointer">
            Inline
          </button>
        </div>

        <div style="font-size:12.5px;color:var(--text-muted)">
          <span style="color:#4caf81">+{{ addedCount() }}</span>
          <span style="margin:0 4px">·</span>
          <span style="color:#e05252">-{{ removedCount() }}</span>
        </div>
      </div>

      <!-- Body -->
      @if (viewMode() === 'split') {
        <!-- Split view: two input textareas top, diff bottom -->
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">
          <!-- Input row -->
          <div style="display:flex;height:200px;border-bottom:1px solid var(--border);flex-shrink:0">
            <!-- Before -->
            <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border)">
              <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:#e05252;flex-shrink:0"></div>
                <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">BEFORE</span>
              </div>
              <textarea
                style="flex:1;resize:none;border:none;outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5"
                [value]="beforeVal()"
                (input)="onBeforeInput($event)"
                placeholder="Paste original text…"
                spellcheck="false"
              ></textarea>
            </div>
            <!-- After -->
            <div style="flex:1;display:flex;flex-direction:column">
              <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:#4caf81;flex-shrink:0"></div>
                <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">AFTER</span>
              </div>
              <textarea
                style="flex:1;resize:none;border:none;outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5"
                [value]="afterVal()"
                (input)="onAfterInput($event)"
                placeholder="Paste modified text…"
                spellcheck="false"
              ></textarea>
            </div>
          </div>

          <!-- Diff output (split) -->
          <div style="flex:1;min-height:0;overflow:auto;font-family:var(--font-mono);font-size:12.5px;background:var(--surface)">
            @for (line of diffLines(); track $index) {
              <div style="display:flex;line-height:1.5"
                [style.background]="line.type === 'added' ? 'rgba(76,175,129,0.12)' : line.type === 'removed' ? 'rgba(224,82,82,0.10)' : 'transparent'">
                <!-- Left num -->
                <div style="width:36px;flex-shrink:0;text-align:right;padding:0 8px;color:var(--text-faint);user-select:none;border-right:1px solid var(--border)"
                  [style.background]="line.type === 'removed' ? 'rgba(224,82,82,0.15)' : 'var(--surface-muted)'">
                  {{ line.lineNumLeft ?? '' }}
                </div>
                <!-- Right num -->
                <div style="width:36px;flex-shrink:0;text-align:right;padding:0 8px;color:var(--text-faint);user-select:none;border-right:1px solid var(--border)"
                  [style.background]="line.type === 'added' ? 'rgba(76,175,129,0.15)' : 'var(--surface-muted)'">
                  {{ line.lineNumRight ?? '' }}
                </div>
                <!-- Marker -->
                <div style="width:20px;flex-shrink:0;text-align:center;user-select:none"
                  [style.color]="line.type === 'added' ? '#4caf81' : line.type === 'removed' ? '#e05252' : 'var(--text-faint)'">
                  {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                </div>
                <!-- Content -->
                <div style="flex:1;padding:0 10px;overflow:hidden;white-space:pre;color:var(--text)">{{ line.text }}</div>
              </div>
            }
            @if (!diffLines().length && (beforeVal() || afterVal())) {
              <div style="padding:24px;color:var(--text-muted);font-size:13px">No differences found.</div>
            }
          </div>
        </div>
      } @else {
        <!-- Inline view: two inputs side by side, then inline diff below -->
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">
          <div style="display:flex;height:180px;border-bottom:1px solid var(--border);flex-shrink:0">
            <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--border)">
              <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:#e05252;flex-shrink:0"></div>
                <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">BEFORE</span>
              </div>
              <textarea
                style="flex:1;resize:none;border:none;outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5"
                [value]="beforeVal()"
                (input)="onBeforeInput($event)"
                placeholder="Paste original text…"
                spellcheck="false"
              ></textarea>
            </div>
            <div style="flex:1;display:flex;flex-direction:column">
              <div style="height:34px;padding:0 14px;display:flex;align-items:center;background:var(--surface-muted);border-bottom:1px solid var(--border);flex-shrink:0;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:#4caf81;flex-shrink:0"></div>
                <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px">AFTER</span>
              </div>
              <textarea
                style="flex:1;resize:none;border:none;outline:none;padding:10px 14px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5"
                [value]="afterVal()"
                (input)="onAfterInput($event)"
                placeholder="Paste modified text…"
                spellcheck="false"
              ></textarea>
            </div>
          </div>
          <!-- Inline diff output -->
          <div style="flex:1;min-height:0;overflow:auto;font-family:var(--font-mono);font-size:12.5px;background:var(--surface)">
            @for (line of diffLines(); track $index) {
              <div style="display:flex;line-height:1.5"
                [style.background]="line.type === 'added' ? 'rgba(76,175,129,0.12)' : line.type === 'removed' ? 'rgba(224,82,82,0.10)' : 'transparent'">
                <div style="width:36px;flex-shrink:0;text-align:right;padding:0 8px;color:var(--text-faint);user-select:none;border-right:1px solid var(--border);background:var(--surface-muted)">
                  {{ line.lineNumLeft ?? line.lineNumRight ?? '' }}
                </div>
                <div style="width:20px;flex-shrink:0;text-align:center;user-select:none"
                  [style.color]="line.type === 'added' ? '#4caf81' : line.type === 'removed' ? '#e05252' : 'var(--text-faint)'">
                  {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                </div>
                <div style="flex:1;padding:0 10px;overflow:hidden;white-space:pre;color:var(--text)">{{ line.text }}</div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
    styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0; }`]
})
export class DiffComponent {
  beforeVal = signal('');
  afterVal = signal('');
  viewMode = signal<'split' | 'inline'>('split');

  diffLines = computed(() => {
    const b = this.beforeVal();
    const a = this.afterVal();
    if (!b && !a) return [] as DiffLine[];
    return this.viewMode() === 'split'
      ? buildSideBySide(b, a)
      : buildInline(b, a);
  });

  addedCount = computed(() => this.diffLines().filter(l => l.type === 'added').length);
  removedCount = computed(() => this.diffLines().filter(l => l.type === 'removed').length);

  onBeforeInput(e: Event) {
    this.beforeVal.set((e.target as HTMLTextAreaElement).value);
  }
  onAfterInput(e: Event) {
    this.afterVal.set((e.target as HTMLTextAreaElement).value);
  }
}
