import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

@Component({
    selector: 'dt-tool-base-converter',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Utilities', 'Number Base Converter']" [toolId]="'base-conv'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="hash" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Number Base Converter</div>
      <div style="font-size:12px;color:var(--text-muted)">Binary · Octal · Decimal · Hexadecimal</div>
    </div>
  </div>

  <div style="flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px">
    <!-- Inputs grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      @for (base of bases; track base.key) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12.5px;font-weight:700;color:var(--maroon)">{{ base.label }}</span>
            <span style="font-size:11px;color:var(--text-faint)">Base {{ base.radix }}</span>
          </div>
          <input type="text" [value]="values()[base.key]"
            (input)="onInput(base.key, base.radix, $event)"
            [placeholder]="base.placeholder"
            style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-family:var(--font-mono);font-size:13px;background:var(--bg);color:var(--text);outline:none;letter-spacing:1px" />
          @if (errors()[base.key]) {
            <div style="font-size:11px;color:#ef4444;margin-top:4px">{{ errors()[base.key] }}</div>
          }
        </div>
      }
    </div>

    <!-- Stats -->
    @if (decimalValue() !== null) {
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        <div>
          <div style="font-size:11px;color:var(--text-muted)">Decimal value</div>
          <div style="font-family:var(--font-mono);font-size:14px;font-weight:700">{{ decimalValue() }}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted)">32-bit two's complement</div>
          <div style="font-family:var(--font-mono);font-size:13px">{{ twosComplement() }}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted)">Bit length</div>
          <div style="font-family:var(--font-mono);font-size:14px;font-weight:700">{{ bitLength() }}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted)">Byte length</div>
          <div style="font-family:var(--font-mono);font-size:14px;font-weight:700">{{ byteLength() }}</div>
        </div>
      </div>

      <!-- Bit grid -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px">Binary representation (32-bit)</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;font-family:var(--font-mono);font-size:12px">
          @for (chunk of bitChunks(); track $index) {
            <div style="display:flex;gap:1px">
              @for (bit of chunk; track $index) {
                <div [style.background]="bit === '1' ? 'var(--maroon)' : 'var(--bg)'"
                  [style.color]="bit === '1' ? '#fff' : 'var(--text-faint)'"
                  [style.border]="bit === '1' ? '1px solid var(--maroon)' : '1px solid var(--border)'"
                  style="width:20px;height:22px;display:grid;place-items:center;border-radius:3px;font-size:11px;font-weight:700">
                  {{ bit }}
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  </div>
</div>
`
})
export class BaseConverterComponent {
  bases = [
    { key: 'bin', label: 'Binary',      radix: 2,  placeholder: '1010' },
    { key: 'oct', label: 'Octal',       radix: 8,  placeholder: '12' },
    { key: 'dec', label: 'Decimal',     radix: 10, placeholder: '10' },
    { key: 'hex', label: 'Hexadecimal', radix: 16, placeholder: 'A' },
  ];

  values = signal<Record<string, string>>({ bin: '', oct: '', dec: '', hex: '' });
  errors = signal<Record<string, string>>({ bin: '', oct: '', dec: '', hex: '' });
  decimalValue = signal<number | null>(null);

  twosComplement = computed(() => {
    const n = this.decimalValue();
    if (n === null) return '';
    const u = n >>> 0;
    return u.toString(2).padStart(32, '0');
  });

  bitLength = computed(() => {
    const n = this.decimalValue();
    if (n === null) return '';
    if (n === 0) return '1';
    return Math.floor(Math.log2(Math.abs(n))) + 1;
  });

  byteLength = computed(() => {
    const bl = this.bitLength();
    if (!bl) return '';
    return Math.ceil(Number(bl) / 8);
  });

  bitChunks = computed(() => {
    const s = this.twosComplement();
    if (!s) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < 32; i += 4) {
      chunks.push(s.slice(i, i + 4).split(''));
    }
    return chunks;
  });

  onInput(key: string, radix: number, event: Event) {
    const raw = (event.target as HTMLInputElement).value.toUpperCase().trim();
    const newVals = { ...this.values(), [key]: raw };
    const newErrs = { ...this.errors(), [key]: '' };

    if (!raw) {
      this.values.set(Object.fromEntries(this.bases.map(b => [b.key, ''])));
      this.errors.set(Object.fromEntries(this.bases.map(b => [b.key, ''])));
      this.decimalValue.set(null);
      return;
    }

    const patterns: Record<number, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9A-Fa-f]+$/ };
    if (!patterns[radix].test(raw)) {
      newErrs[key] = `Invalid ${key} input`;
      this.errors.set(newErrs);
      this.values.set(newVals);
      return;
    }

    const dec = parseInt(raw, radix);
    if (isNaN(dec)) {
      newErrs[key] = 'Could not parse';
      this.errors.set(newErrs);
      return;
    }

    this.decimalValue.set(dec);
    const updated: Record<string, string> = {};
    this.bases.forEach(b => {
      updated[b.key] = b.key === key ? raw : dec.toString(b.radix).toUpperCase();
    });
    this.values.set(updated);
    this.errors.set(Object.fromEntries(this.bases.map(b => [b.key, ''])));
  }
}
