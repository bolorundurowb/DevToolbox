import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ── Preset definitions ─────────────────────────────────────────────────────────

const PRESETS = ['644', '664', '755', '775', '700', '777', '600', '1755', '4755'];

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'dt-tool-unix-perms',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">

  <dt-topbar [crumbs]="['Utilities', 'Unix Permissions']" [toolId]="'unix-perms'" />

  <!-- Tool header -->
  <div style="display:flex;align-items:center;gap:12px;padding:14px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
      <dt-icon name="lock" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600;color:var(--text);line-height:1.2">Unix Permissions</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:1px">Convert between symbolic, octal, and descriptive permission forms — including sticky, setuid, and setgid bits</div>
    </div>
  </div>

  <!-- Scrollable main content -->
  <div style="flex:1;overflow-y:auto;padding:18px 22px;min-height:0">

    <!-- Preset buttons -->
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px">
      @for (preset of presets; track preset) {
        <button
          (click)="applyOctalString(preset)"
          style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-family:var(--font-mono);font-size:12px;cursor:pointer;transition:background 0.12s"
          (mouseenter)="setHover($event.target, true)"
          (mouseleave)="setHover($event.target, false)"
        >{{ preset }}</button>
      }
    </div>

    <!-- Two-column layout -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">

      <!-- LEFT: Input controls -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Octal input -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Octal Input</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input
              type="text"
              [value]="octalInput()"
              (input)="octalInput.set(getInputValue($event))"
              (focus)="octalInputFocused.set(true)"
              (blur)="onOctalBlur()"
              (keydown.enter)="onOctalEnter()"
              placeholder="e.g. 755 or 1755"
              style="flex:1;padding:7px 10px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:var(--font-mono);font-size:14px;outline:none"
            />
            <button
              (click)="onOctalEnter()"
              style="padding:7px 12px;border-radius:7px;border:1px solid var(--border-strong);background:var(--maroon-soft);color:var(--maroon-ink);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap"
            >Apply</button>
          </div>
          @if (octalError()) {
            <div style="margin-top:6px;font-size:11px;color:#c0392b">{{ octalError() }}</div>
          }
        </div>

        <!-- File type toggle -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">File Type</div>
          <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:7px;overflow:hidden;width:fit-content">
            <button
              (click)="isDirectory.set(false)"
              [style.background]="!isDirectory() ? 'var(--maroon-soft)' : 'var(--surface)'"
              [style.color]="!isDirectory() ? 'var(--maroon-ink)' : 'var(--text-muted)'"
              [style.font-weight]="!isDirectory() ? '600' : '400'"
              style="padding:5px 16px;border:none;cursor:pointer;font-size:13px;font-family:var(--font-ui);transition:background 0.12s"
            >File</button>
            <button
              (click)="isDirectory.set(true)"
              [style.background]="isDirectory() ? 'var(--maroon-soft)' : 'var(--surface)'"
              [style.color]="isDirectory() ? 'var(--maroon-ink)' : 'var(--text-muted)'"
              [style.font-weight]="isDirectory() ? '600' : '400'"
              style="padding:5px 16px;border:none;border-left:1px solid var(--border);cursor:pointer;font-size:13px;font-family:var(--font-ui);transition:background 0.12s"
            >Directory</button>
          </div>
        </div>

        <!-- Permission matrix -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px">Permissions</div>

          <!-- Matrix header -->
          <div style="display:grid;grid-template-columns:72px 1fr 1fr 1fr;gap:4px;margin-bottom:4px">
            <div></div>
            @for (col of ['Read', 'Write', 'Execute']; track col) {
              <div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-muted);padding-bottom:4px">{{ col }}</div>
            }
          </div>

          <!-- Owner row -->
          <div style="display:grid;grid-template-columns:72px 1fr 1fr 1fr;gap:4px;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
            <div style="font-size:12px;font-weight:500;color:var(--text)">Owner</div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="ownerR()" (change)="ownerR.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="ownerW()" (change)="ownerW.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="ownerX()" (change)="ownerX.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
          </div>

          <!-- Group row -->
          <div style="display:grid;grid-template-columns:72px 1fr 1fr 1fr;gap:4px;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
            <div style="font-size:12px;font-weight:500;color:var(--text)">Group</div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="groupR()" (change)="groupR.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="groupW()" (change)="groupW.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="groupX()" (change)="groupX.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
          </div>

          <!-- Other row -->
          <div style="display:grid;grid-template-columns:72px 1fr 1fr 1fr;gap:4px;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
            <div style="font-size:12px;font-weight:500;color:var(--text)">Other</div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="otherR()" (change)="otherR.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="otherW()" (change)="otherW.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
            <div style="display:flex;justify-content:center">
              <input type="checkbox" [checked]="otherX()" (change)="otherX.set(getChecked($event))" style="width:16px;height:16px;cursor:pointer;accent-color:var(--maroon)" />
            </div>
          </div>

          <!-- Special bits -->
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Special Bits</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text)">
                <input type="checkbox" [checked]="setuid()" (change)="setuid.set(getChecked($event))" style="width:15px;height:15px;accent-color:var(--teal);cursor:pointer" />
                <span style="font-weight:500">Setuid</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text)">
                <input type="checkbox" [checked]="setgid()" (change)="setgid.set(getChecked($event))" style="width:15px;height:15px;accent-color:var(--teal);cursor:pointer" />
                <span style="font-weight:500">Setgid</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text)">
                <input type="checkbox" [checked]="sticky()" (change)="sticky.set(getChecked($event))" style="width:15px;height:15px;accent-color:var(--teal);cursor:pointer" />
                <span style="font-weight:500">Sticky</span>
              </label>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT: Output -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Computed outputs -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px">Output</div>

          <!-- Octal output -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:7px;background:var(--bg);border:1px solid var(--border);margin-bottom:8px">
            <div>
              <div style="font-size:10px;color:var(--text-faint);margin-bottom:2px">Octal</div>
              <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--text)">{{ octal() }}</div>
            </div>
            <button (click)="copy('octal', octal())" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap">
              @if (copiedKey() === 'octal') {
                <span style="color:var(--teal)">Copied!</span>
              } @else {
                <dt-icon name="copy" [size]="12" /><span>Copy</span>
              }
            </button>
          </div>

          <!-- Symbolic output -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:7px;background:var(--bg);border:1px solid var(--border);margin-bottom:8px">
            <div>
              <div style="font-size:10px;color:var(--text-faint);margin-bottom:2px">Symbolic</div>
              <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--text)">{{ symbolic() }}</div>
            </div>
            <button (click)="copy('symbolic', symbolic())" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap">
              @if (copiedKey() === 'symbolic') {
                <span style="color:var(--teal)">Copied!</span>
              } @else {
                <dt-icon name="copy" [size]="12" /><span>Copy</span>
              }
            </button>
          </div>

          <!-- chmod command output -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:7px;background:var(--bg);border:1px solid var(--border)">
            <div style="min-width:0;flex:1;margin-right:8px">
              <div style="font-size:10px;color:var(--text-faint);margin-bottom:2px">chmod command</div>
              <div style="font-family:var(--font-mono);font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ chmodCommand() }}</div>
            </div>
            <button (click)="copy('chmod', chmodCommand())" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap">
              @if (copiedKey() === 'chmod') {
                <span style="color:var(--teal)">Copied!</span>
              } @else {
                <dt-icon name="copy" [size]="12" /><span>Copy</span>
              }
            </button>
          </div>
        </div>

        <!-- Descriptions -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">Description</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            @for (desc of descriptions(); track desc) {
              <div style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--text)">
                <span style="color:var(--maroon);flex-shrink:0;margin-top:1px">▸</span>
                <span>{{ desc }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Visual permission blocks -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px">Visual</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">

            <!-- Owner block -->
            <div style="border:1px solid var(--border);border-radius:8px;padding:10px">
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-align:center">Owner</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <div
                  [style.background]="ownerR() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="ownerR() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >r</div>
                <div
                  [style.background]="ownerW() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="ownerW() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >w</div>
                <div
                  [style.background]="ownerXVisual() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="ownerXVisual() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >{{ ownerXLabel() }}</div>
                @if (setuid()) {
                  <div style="background:var(--teal-soft);color:var(--teal-ink);padding:2px 0;border-radius:5px;font-size:10px;font-weight:600;text-align:center">setuid</div>
                }
              </div>
            </div>

            <!-- Group block -->
            <div style="border:1px solid var(--border);border-radius:8px;padding:10px">
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-align:center">Group</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <div
                  [style.background]="groupR() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="groupR() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >r</div>
                <div
                  [style.background]="groupW() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="groupW() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >w</div>
                <div
                  [style.background]="groupXVisual() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="groupXVisual() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >{{ groupXLabel() }}</div>
                @if (setgid()) {
                  <div style="background:var(--teal-soft);color:var(--teal-ink);padding:2px 0;border-radius:5px;font-size:10px;font-weight:600;text-align:center">setgid</div>
                }
              </div>
            </div>

            <!-- Other block -->
            <div style="border:1px solid var(--border);border-radius:8px;padding:10px">
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-align:center">Other</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <div
                  [style.background]="otherR() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="otherR() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >r</div>
                <div
                  [style.background]="otherW() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="otherW() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >w</div>
                <div
                  [style.background]="otherXVisual() ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                  [style.color]="otherXVisual() ? 'var(--maroon-ink)' : 'var(--text-faint)'"
                  style="padding:3px 0;border-radius:5px;font-family:var(--font-mono);font-size:11px;font-weight:600;text-align:center"
                >{{ otherXLabel() }}</div>
                @if (sticky()) {
                  <div style="background:var(--teal-soft);color:var(--teal-ink);padding:2px 0;border-radius:5px;font-size:10px;font-weight:600;text-align:center">sticky</div>
                }
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</div>
  `
})
export class UnixPermsComponent {

  // ── Presets ──────────────────────────────────────────────────────────────────
  readonly presets = PRESETS;

  // ── Permission bit signals ───────────────────────────────────────────────────
  ownerR = signal(true);
  ownerW = signal(true);
  ownerX = signal(true);
  groupR = signal(true);
  groupW = signal(false);
  groupX = signal(true);
  otherR = signal(true);
  otherW = signal(false);
  otherX = signal(false);

  // Special bits
  setuid = signal(false);
  setgid = signal(false);
  sticky = signal(false);

  // File type
  isDirectory = signal(false);

  // Octal input state
  octalInput = signal('');
  octalInputFocused = signal(false);
  octalError = signal('');

  // Copy feedback
  copiedKey = signal('');
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Computed: octal string ───────────────────────────────────────────────────
  octal = computed((): string => {
    const special = (this.setuid() ? 4 : 0) + (this.setgid() ? 2 : 0) + (this.sticky() ? 1 : 0);
    const owner   = (this.ownerR() ? 4 : 0) + (this.ownerW() ? 2 : 0) + (this.ownerX() ? 1 : 0);
    const group   = (this.groupR() ? 4 : 0) + (this.groupW() ? 2 : 0) + (this.groupX() ? 1 : 0);
    const other   = (this.otherR() ? 4 : 0) + (this.otherW() ? 2 : 0) + (this.otherX() ? 1 : 0);
    if (special === 0) {
      return `${owner}${group}${other}`;
    }
    return `${special}${owner}${group}${other}`;
  });

  // ── Computed: symbolic string ────────────────────────────────────────────────
  symbolic = computed((): string => {
    const type = this.isDirectory() ? 'd' : '-';

    const r = (bit: boolean): string => bit ? 'r' : '-';
    const w = (bit: boolean): string => bit ? 'w' : '-';

    // Owner execute: affected by setuid
    let ownerXChar: string;
    if (this.setuid()) {
      ownerXChar = this.ownerX() ? 's' : 'S';
    } else {
      ownerXChar = this.ownerX() ? 'x' : '-';
    }

    // Group execute: affected by setgid
    let groupXChar: string;
    if (this.setgid()) {
      groupXChar = this.groupX() ? 's' : 'S';
    } else {
      groupXChar = this.groupX() ? 'x' : '-';
    }

    // Other execute: affected by sticky
    let otherXChar: string;
    if (this.sticky()) {
      otherXChar = this.otherX() ? 't' : 'T';
    } else {
      otherXChar = this.otherX() ? 'x' : '-';
    }

    return `${type}${r(this.ownerR())}${w(this.ownerW())}${ownerXChar}${r(this.groupR())}${w(this.groupW())}${groupXChar}${r(this.otherR())}${w(this.otherW())}${otherXChar}`;
  });

  // ── Computed: chmod command ──────────────────────────────────────────────────
  chmodCommand = computed((): string => {
    return `chmod ${this.octal()} filename`;
  });

  // ── Computed: descriptions ───────────────────────────────────────────────────
  descriptions = computed((): string[] => {
    const lines: string[] = [];

    // Owner
    const oR = this.ownerR(), oW = this.ownerW(), oX = this.ownerX();
    if (oR || oW || oX) {
      const perms = buildPermList(oR, oW, oX);
      lines.push(`Owner can ${perms}`);
    } else {
      lines.push('Owner has no permissions');
    }

    // Group
    const gR = this.groupR(), gW = this.groupW(), gX = this.groupX();
    if (gR || gW || gX) {
      const perms = buildPermList(gR, gW, gX);
      lines.push(`Group can ${perms}`);
    } else {
      lines.push('Group has no permissions');
    }

    // Other
    const xR = this.otherR(), xW = this.otherW(), xX = this.otherX();
    if (xR || xW || xX) {
      const perms = buildPermList(xR, xW, xX);
      lines.push(`Others can ${perms}`);
    } else {
      lines.push('Others have no permissions');
    }

    // Special bits
    if (this.setuid()) {
      lines.push('Setuid bit: execute as owner (caution!)');
    }
    if (this.setgid()) {
      lines.push('Setgid bit: execute as group / inherit group on directories');
    }
    if (this.sticky()) {
      lines.push('Sticky bit: only owner can delete files in this directory');
    }

    return lines;
  });

  // ── Visual label helpers ─────────────────────────────────────────────────────
  ownerXLabel = computed((): string => {
    if (this.setuid()) return this.ownerX() ? 's' : 'S';
    return this.ownerX() ? 'x' : 'x';
  });
  ownerXVisual = computed((): boolean => this.ownerX() || this.setuid());

  groupXLabel = computed((): string => {
    if (this.setgid()) return this.groupX() ? 's' : 'S';
    return this.groupX() ? 'x' : 'x';
  });
  groupXVisual = computed((): boolean => this.groupX() || this.setgid());

  otherXLabel = computed((): string => {
    if (this.sticky()) return this.otherX() ? 't' : 'T';
    return this.otherX() ? 'x' : 'x';
  });
  otherXVisual = computed((): boolean => this.otherX() || this.sticky());

  // ── Event helpers ────────────────────────────────────────────────────────────
  getChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  setHover(el: EventTarget | null, on: boolean): void {
    if (el && el instanceof HTMLElement) {
      el.style.background = on ? 'var(--surface-muted)' : 'var(--surface)';
    }
  }

  onOctalBlur(): void {
    this.octalInputFocused.set(false);
    if (this.octalInput().trim()) {
      this.onOctalEnter();
    }
  }

  onOctalEnter(): void {
    const raw = this.octalInput().trim();
    if (!raw) return;
    this.applyOctalString(raw);
  }

  applyOctalString(raw: string): void {
    const cleaned = raw.replace(/^0+/, '') || '0';
    if (!/^\d{1,4}$/.test(cleaned) || cleaned.split('').some(c => parseInt(c, 10) > 7)) {
      this.octalError.set(`Invalid octal: "${raw}". Use 3 digits (755) or 4 digits (1755).`);
      return;
    }

    this.octalError.set('');
    this.octalInput.set(raw);

    let special = 0, owner = 0, group = 0, other = 0;

    if (cleaned.length <= 3) {
      const padded = cleaned.padStart(3, '0');
      owner = parseInt(padded[0], 10);
      group = parseInt(padded[1], 10);
      other = parseInt(padded[2], 10);
    } else {
      special = parseInt(cleaned[0], 10);
      owner   = parseInt(cleaned[1], 10);
      group   = parseInt(cleaned[2], 10);
      other   = parseInt(cleaned[3], 10);
    }

    // Apply special bits
    this.setuid.set(!!(special & 4));
    this.setgid.set(!!(special & 2));
    this.sticky.set(!!(special & 1));

    // Apply owner bits
    this.ownerR.set(!!(owner & 4));
    this.ownerW.set(!!(owner & 2));
    this.ownerX.set(!!(owner & 1));

    // Apply group bits
    this.groupR.set(!!(group & 4));
    this.groupW.set(!!(group & 2));
    this.groupX.set(!!(group & 1));

    // Apply other bits
    this.otherR.set(!!(other & 4));
    this.otherW.set(!!(other & 2));
    this.otherX.set(!!(other & 1));
  }

  copy(key: string, value: string): void {
    navigator.clipboard.writeText(value).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    this.copiedKey.set(key);
    if (this.copyTimer !== null) {
      clearTimeout(this.copyTimer);
    }
    this.copyTimer = setTimeout(() => {
      this.copiedKey.set('');
      this.copyTimer = null;
    }, 1500);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPermList(r: boolean, w: boolean, x: boolean): string {
  const parts: string[] = [];
  if (r) parts.push('read');
  if (w) parts.push('write');
  if (x) parts.push('execute');

  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return `${parts[0]} only`;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
}
