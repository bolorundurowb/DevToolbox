import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ── Constants ──────────────────────────────────────────────────────────────────

const MASKS: Record<number, bigint> = {
  8:  0xFFn,
  16: 0xFFFFn,
  32: 0xFFFFFFFFn,
  64: 0xFFFFFFFFFFFFFFFFn,
};

type Base      = 'BIN' | 'OCT' | 'DEC' | 'HEX';
type Operation = 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'NOT' | 'SHL' | 'SHR';

const BIT_WIDTHS: number[]   = [8, 16, 32, 64];
const BASES: Base[]          = ['BIN', 'OCT', 'DEC', 'HEX'];
const BINARY_OPS: Operation[]  = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'];
const ALL_OPS: Operation[]     = ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR', 'SHL', 'SHR'];

// ── Parse helpers ──────────────────────────────────────────────────────────────

function stripPrefix(raw: string, base: Base): string {
  const s = raw.trim();
  if (base === 'BIN') return s.replace(/^0b/i, '');
  if (base === 'OCT') return s.replace(/^0o/i, '');
  if (base === 'HEX') return s.replace(/^0x/i, '');
  return s;
}

function parseBigInt(raw: string, base: Base): { ok: true; value: bigint } | { ok: false; error: string } {
  const s = stripPrefix(raw, base);
  if (s === '' || s === '-') return { ok: true, value: 0n };
  try {
    let v: bigint;
    if      (base === 'BIN') v = BigInt('0b' + s);
    else if (base === 'OCT') v = BigInt('0o' + s);
    else if (base === 'DEC') v = BigInt(s);
    else                     v = BigInt('0x' + s);
    if (v < 0n) return { ok: false, error: 'Negative values not supported' };
    return { ok: true, value: v };
  } catch {
    const labels: Record<Base, string> = { BIN: 'binary', OCT: 'octal', DEC: 'decimal', HEX: 'hexadecimal' };
    return { ok: false, error: `Invalid ${labels[base]} value` };
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatBin(value: bigint, bitWidth: number): string {
  const raw = value.toString(2).padStart(bitWidth, '0');
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += 4) groups.push(raw.slice(i, i + 4));
  return groups.join(' ');
}

function formatOct(value: bigint): string {
  return '0o' + value.toString(8);
}

function formatDec(value: bigint): string {
  return value.toString(10);
}

function formatHex(value: bigint, bitWidth: number): string {
  return '0x' + value.toString(16).toUpperCase().padStart(bitWidth / 4, '0');
}

function displayBase(value: bigint, base: Base, bitWidth: number): string {
  if (base === 'BIN') return '0b' + value.toString(2).padStart(bitWidth, '0');
  if (base === 'OCT') return '0o' + value.toString(8);
  if (base === 'DEC') return value.toString(10);
  return '0x' + value.toString(16).toUpperCase().padStart(bitWidth / 4, '0');
}

// ── Result type ────────────────────────────────────────────────────────────────

interface CalcResult {
  valid: boolean;
  value: bigint;
  errorMsg: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'dt-tool-bitwise',
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg);font-family:var(--font-ui)">

  <dt-topbar [crumbs]="['Utilities', 'Bitwise Calculator']" [toolId]="'bitwise'" />

  <!-- Header row -->
  <div style="display:flex;align-items:center;gap:12px;padding:14px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center;flex-shrink:0">
      <dt-icon name="cpu" [size]="16" color="var(--maroon)" />
    </div>
    <div style="flex:1">
      <div style="font-size:15.5px;font-weight:600;color:var(--text)">Bitwise Calculator</div>
      <div style="font-size:12px;color:var(--text-muted)">AND · OR · XOR · NOT · Shifts — up to 64-bit</div>
    </div>
    <!-- Bit-width selector -->
    <div style="display:flex;gap:4px;flex-shrink:0">
      @for (w of bitWidths; track w) {
        <button
          (click)="bitWidth.set(w)"
          [style.background]="bitWidth() === w ? 'var(--maroon)' : 'var(--surface)'"
          [style.color]="bitWidth() === w ? '#fff' : 'var(--text-muted)'"
          [style.border]="bitWidth() === w ? '1px solid var(--maroon)' : '1px solid var(--border)'"
          style="height:28px;padding:0 12px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-mono);transition:background 0.12s,color 0.12s">
          {{ w }}
        </button>
      }
    </div>
  </div>

  <!-- Body -->
  <div style="flex:1;overflow-y:auto;display:flex;gap:0;min-height:0">

    <!-- ── LEFT PANE ── -->
    <div style="width:320px;flex-shrink:0;padding:18px 20px;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:14px;overflow-y:auto">

      <!-- Input A -->
      <div>
        <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Operand A</div>
        <!-- Base pills -->
        <div style="display:flex;gap:4px;margin-bottom:6px">
          @for (b of bases; track b) {
            <button
              (click)="baseA.set(b)"
              [style.background]="baseA() === b ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
              [style.color]="baseA() === b ? 'var(--maroon)' : 'var(--text-faint)'"
              [style.border]="baseA() === b ? '1px solid var(--maroon)' : '1px solid var(--border)'"
              [style.fontWeight]="baseA() === b ? '700' : '500'"
              style="height:22px;padding:0 9px;border-radius:5px;font-size:11px;cursor:pointer;font-family:var(--font-ui);transition:all 0.1s">
              {{ b }}
            </button>
          }
        </div>
        <input
          type="text"
          [value]="inputA()"
          (input)="inputA.set($any($event.target).value)"
          [placeholder]="placeholderFor(baseA())"
          [style.borderColor]="result().valid === false && inputAHasError() ? '#ef4444' : 'var(--border)'"
          style="width:100%;box-sizing:border-box;border-radius:7px;border:1px solid var(--border);padding:8px 10px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);outline:none" />
        @if (inputAHasError()) {
          <div style="font-size:11px;color:#ef4444;margin-top:3px">{{ inputAError() }}</div>
        }
      </div>

      <!-- Input B (hidden for NOT) -->
      @if (operation() !== 'NOT') {
        <div [style.opacity]="isShiftOp() ? '0.45' : '1'" [style.pointerEvents]="isShiftOp() ? 'none' : 'auto'">
          <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Operand B</div>
          <div style="display:flex;gap:4px;margin-bottom:6px">
            @for (b of bases; track b) {
              <button
                (click)="baseB.set(b)"
                [style.background]="baseB() === b ? 'var(--maroon-soft)' : 'var(--surface-muted)'"
                [style.color]="baseB() === b ? 'var(--maroon)' : 'var(--text-faint)'"
                [style.border]="baseB() === b ? '1px solid var(--maroon)' : '1px solid var(--border)'"
                [style.fontWeight]="baseB() === b ? '700' : '500'"
                style="height:22px;padding:0 9px;border-radius:5px;font-size:11px;cursor:pointer;font-family:var(--font-ui);transition:all 0.1s">
                {{ b }}
              </button>
            }
          </div>
          <input
            type="text"
            [value]="inputB()"
            (input)="inputB.set($any($event.target).value)"
            [placeholder]="placeholderFor(baseB())"
            [style.borderColor]="result().valid === false && inputBHasError() ? '#ef4444' : 'var(--border)'"
            style="width:100%;box-sizing:border-box;border-radius:7px;border:1px solid var(--border);padding:8px 10px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);outline:none" />
          @if (inputBHasError()) {
            <div style="font-size:11px;color:#ef4444;margin-top:3px">{{ inputBError() }}</div>
          }
        </div>
      }

      <!-- Shift N -->
      @if (isShiftOp()) {
        <div>
          <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Shift amount (N)</div>
          <input
            type="number"
            min="0"
            max="63"
            [value]="shiftN()"
            (input)="shiftN.set(clampShift($any($event.target).value))"
            style="width:80px;box-sizing:border-box;border-radius:7px;border:1px solid var(--border);padding:8px 10px;font-family:var(--font-mono);font-size:13px;background:var(--surface);color:var(--text);outline:none" />
        </div>
      }

      <!-- Operation buttons -->
      <div>
        <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Operation</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">
          @for (op of allOps; track op) {
            <button
              (click)="operation.set(op)"
              [style.background]="operation() === op ? 'var(--maroon)' : 'var(--surface)'"
              [style.color]="operation() === op ? '#fff' : 'var(--text)'"
              [style.border]="operation() === op ? '1px solid var(--maroon)' : '1px solid var(--border)'"
              [style.fontWeight]="operation() === op ? '700' : '500'"
              style="height:30px;border-radius:7px;font-size:12px;cursor:pointer;font-family:var(--font-mono);transition:all 0.12s;padding:0 4px">
              {{ op }}
            </button>
          }
        </div>
      </div>

    </div>

    <!-- ── RIGHT PANE ── -->
    <div style="flex:1;padding:18px 22px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;min-width:0">

      <!-- Expression -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Expression</div>
        <div style="font-family:var(--font-mono);font-size:13.5px;color:var(--text);word-break:break-all;line-height:1.6">
          {{ expressionDisplay() }}
        </div>
      </div>

      <!-- Result in 4 bases -->
      @if (result().valid) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em">Result</div>
          @for (row of resultRows(); track row.label) {
            <div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--border)">
              <span style="font-size:11px;font-weight:700;color:var(--text-muted);font-family:var(--font-mono);width:32px;flex-shrink:0">{{ row.label }}</span>
              <span style="flex:1;font-family:var(--font-mono);font-size:13px;color:var(--text);word-break:break-all;letter-spacing:.5px">{{ row.value }}</span>
              <button
                (click)="copyText(row.value)"
                [style.color]="copiedKey() === row.label ? 'var(--teal)' : 'var(--text-faint)'"
                style="background:none;border:none;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;flex-shrink:0;font-family:var(--font-ui);transition:color 0.15s">
                {{ copiedKey() === row.label ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          }
        </div>
      } @else {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px 16px;display:flex;align-items:center;gap:8px;color:#ef4444;font-size:13px">
          @if (result().errorMsg) {
            <span>{{ result().errorMsg }}</span>
          } @else {
            <span style="color:var(--text-faint)">Enter values above to see the result.</span>
          }
        </div>
      }

      <!-- Bit grid visualization -->
      @if (result().valid) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
          <div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Bit Visualization — Result (MSB → LSB)</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            @for (group of bitGroups(); track group.groupIndex) {
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="display:flex;gap:2px">
                  @for (bit of group.bits; track bit.index) {
                    <div
                      [title]="'Bit ' + bit.index + ': ' + bit.bit"
                      [style.background]="bit.bit === 1 ? 'var(--maroon)' : 'var(--surface-muted)'"
                      [style.border]="bit.bit === 1 ? '1px solid var(--maroon)' : '1px solid var(--border)'"
                      style="width:12px;height:12px;border-radius:2px;transition:background 0.1s;flex-shrink:0">
                    </div>
                  }
                </div>
                <span style="font-size:9.5px;font-family:var(--font-mono);color:var(--text-faint)">{{ group.label }}</span>
              </div>
            }
          </div>
          <!-- Legend -->
          <div style="display:flex;gap:12px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:5px">
              <div style="width:10px;height:10px;border-radius:2px;background:var(--maroon)"></div>
              <span style="font-size:11px;color:var(--text-muted)">1</span>
            </div>
            <div style="display:flex;align-items:center;gap:5px">
              <div style="width:10px;height:10px;border-radius:2px;background:var(--surface-muted);border:1px solid var(--border)"></div>
              <span style="font-size:11px;color:var(--text-muted)">0</span>
            </div>
            <span style="font-size:11px;color:var(--text-faint);margin-left:4px">
              {{ oneBitCount() }} of {{ bitWidth() }} bits set
            </span>
          </div>
        </div>
      }

    </div>
  </div>
</div>
`,
})
export class BitwiseComponent {

  // ── State signals ────────────────────────────────────────────────────────────

  readonly inputA    = signal<string>('');
  readonly inputB    = signal<string>('');
  readonly baseA     = signal<Base>('DEC');
  readonly baseB     = signal<Base>('DEC');
  readonly bitWidth  = signal<number>(32);
  readonly operation = signal<Operation>('AND');
  readonly shiftN    = signal<number>(1);
  readonly copiedKey = signal<string>('');

  // ── Static data for template ─────────────────────────────────────────────────

  readonly bitWidths = BIT_WIDTHS;
  readonly bases     = BASES;
  readonly allOps    = ALL_OPS;

  // ── Derived ──────────────────────────────────────────────────────────────────

  readonly isShiftOp = computed(() => this.operation() === 'SHL' || this.operation() === 'SHR');

  // ── Parse A ──────────────────────────────────────────────────────────────────

  private readonly parsedA = computed(() => parseBigInt(this.inputA(), this.baseA()));
  private readonly parsedB = computed(() => parseBigInt(this.inputB(), this.baseB()));

  readonly inputAHasError = computed(() => !this.parsedA().ok);
  readonly inputBHasError = computed(() => !this.parsedB().ok);
  readonly inputAError    = computed(() => this.parsedA().ok ? '' : (this.parsedA() as { ok: false; error: string }).error);
  readonly inputBError    = computed(() => this.parsedB().ok ? '' : (this.parsedB() as { ok: false; error: string }).error);

  // ── Core result ──────────────────────────────────────────────────────────────

  readonly result = computed<CalcResult>(() => {
    const op    = this.operation();
    const mask  = MASKS[this.bitWidth()];
    const pA    = this.parsedA();

    if (!pA.ok) return { valid: false, value: 0n, errorMsg: pA.error };

    const a = pA.value & mask;

    if (op === 'NOT') {
      return { valid: true, value: (~a) & mask, errorMsg: '' };
    }

    if (op === 'SHL') {
      const n = BigInt(this.shiftN());
      return { valid: true, value: (a << n) & mask, errorMsg: '' };
    }

    if (op === 'SHR') {
      const n = BigInt(this.shiftN());
      return { valid: true, value: (a >> n) & mask, errorMsg: '' };
    }

    const pB = this.parsedB();
    if (!pB.ok) return { valid: false, value: 0n, errorMsg: pB.error };
    const b = pB.value & mask;

    switch (op) {
      case 'AND':  return { valid: true, value: (a & b) & mask,       errorMsg: '' };
      case 'OR':   return { valid: true, value: (a | b) & mask,       errorMsg: '' };
      case 'XOR':  return { valid: true, value: (a ^ b) & mask,       errorMsg: '' };
      case 'NAND': return { valid: true, value: (~(a & b)) & mask,    errorMsg: '' };
      case 'NOR':  return { valid: true, value: (~(a | b)) & mask,    errorMsg: '' };
      case 'XNOR': return { valid: true, value: (~(a ^ b)) & mask,    errorMsg: '' };
      default:     return { valid: false, value: 0n,                  errorMsg: 'Unknown operation' };
    }
  });

  // ── Expression display ───────────────────────────────────────────────────────

  readonly expressionDisplay = computed(() => {
    const op      = this.operation();
    const bw      = this.bitWidth();
    const pA      = this.parsedA();
    const mask    = MASKS[bw];
    const aStr    = pA.ok ? displayBase(pA.value & mask, this.baseA(), bw) : (this.inputA() || '?');

    if (op === 'NOT') {
      const resStr = this.result().valid ? displayBase(this.result().value, 'HEX', bw) : '?';
      return `NOT  ${aStr}  =  ${resStr}`;
    }

    if (op === 'SHL' || op === 'SHR') {
      const resStr = this.result().valid ? displayBase(this.result().value, 'HEX', bw) : '?';
      return `${aStr}  ${op}  ${this.shiftN()}  =  ${resStr}`;
    }

    const pB   = this.parsedB();
    const bStr = pB.ok ? displayBase(pB.value & mask, this.baseB(), bw) : (this.inputB() || '?');
    const resStr = this.result().valid ? displayBase(this.result().value, 'HEX', bw) : '?';
    return `${aStr}  ${op}  ${bStr}  =  ${resStr}`;
  });

  // ── Result rows ──────────────────────────────────────────────────────────────

  readonly resultRows = computed(() => {
    const r  = this.result();
    const bw = this.bitWidth();
    if (!r.valid) return [];
    return [
      { label: 'BIN', value: formatBin(r.value, bw) },
      { label: 'OCT', value: formatOct(r.value)     },
      { label: 'DEC', value: formatDec(r.value)      },
      { label: 'HEX', value: formatHex(r.value, bw) },
    ];
  });

  // ── Bit array (for visualization) ───────────────────────────────────────────

  readonly bitArray = computed<{ bit: 0 | 1; index: number }[]>(() => {
    const r  = this.result();
    const bw = this.bitWidth();
    const arr: { bit: 0 | 1; index: number }[] = [];
    for (let i = bw - 1; i >= 0; i--) {
      arr.push({ bit: ((r.value >> BigInt(i)) & 1n) === 1n ? 1 : 0, index: i });
    }
    return arr;
  });

  // ── Bit groups (8 bits per group, with group label = MSB position) ──────────

  readonly bitGroups = computed(() => {
    const bits = this.bitArray();
    const groups: { bits: { bit: 0 | 1; index: number }[]; label: string; groupIndex: number }[] = [];
    for (let g = 0; g < bits.length; g += 8) {
      const slice = bits.slice(g, g + 8);
      const msb   = slice[0].index;   // highest bit index in this group
      groups.push({ bits: slice, label: String(msb), groupIndex: g });
    }
    return groups;
  });

  readonly oneBitCount = computed(() => this.bitArray().filter(b => b.bit === 1).length);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  placeholderFor(base: Base): string {
    const map: Record<Base, string> = {
      BIN: '0 or 1101...',
      OCT: '0o17...',
      DEC: '255...',
      HEX: 'FF...',
    };
    return map[base];
  }

  clampShift(val: string): number {
    const n = parseInt(val, 10);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(63, n));
  }

  copyText(text: string): void {
    // Derive which label was clicked by matching text
    const row = this.resultRows().find(r => r.value === text);
    const key = row ? row.label : text;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(''), 1500);
    });
  }
}
