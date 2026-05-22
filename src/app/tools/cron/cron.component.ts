import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import cronstrue from 'cronstrue';
import { CronExpressionParser } from 'cron-parser';

interface CronField {
  label: string;
  value: string;
  description: string;
  examples: string[];
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const PRESETS = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Every day at midnight', expr: '0 0 * * *' },
  { label: 'Every Sunday', expr: '0 0 * * 0' },
  { label: 'Every month', expr: '0 0 1 * *' },
  { label: 'Every weekday 9am', expr: '0 9 * * 1-5' },
  { label: 'Every 15 min', expr: '*/15 * * * *' },
  { label: 'Every 6 hours', expr: '0 */6 * * *' },
];

function describeCronField(field: string, type: string): string {
  if (field === '*') return `Every ${type}`;
  if (field.startsWith('*/')) return `Every ${field.slice(2)} ${type}s`;
  if (field.includes('-')) return `${type}s ${field}`;
  if (field.includes(',')) return `${type}s ${field}`;
  return `At ${type} ${field}`;
}

@Component({
  selector: 'dt-tool-cron',
  standalone: true,
  imports: [FormsModule, TopbarComponent, IconComponent],
  styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Tools', 'Cron Parser']" [toolId]="'cron'" />

  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);display:grid;place-items:center">
      <dt-icon name="clock" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15px;font-weight:600">Cron Parser</div>
      <div style="font-size:12px;color:var(--text-muted)">Parse, visualize, and schedule cron expressions</div>
    </div>
  </div>

  <!-- Expression input -->
  <div style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--surface)">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Cron Expression</div>
    <input type="text" [(ngModel)]="expression" (ngModelChange)="onExprChange()"
      placeholder="* * * * *"
      style="width:100%;border:2px solid var(--border);border-radius:8px;padding:10px 14px;font-size:18px;font-family:var(--font-mono);font-weight:600;background:var(--bg);color:var(--text);box-sizing:border-box;outline:none;letter-spacing:.05em"
      [style.border-color]="errorMsg() ? '#e05' : 'var(--border)'" />
    @if (errorMsg()) {
      <div style="font-size:12px;color:#e05;margin-top:4px">{{ errorMsg() }}</div>
    } @else if (description()) {
      <div style="font-size:13px;color:var(--teal);margin-top:6px;font-weight:500">{{ description() }}</div>
    }
  </div>

  <!-- Field sub-inputs -->
  <div style="padding:12px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      @for (f of fields(); track f.label) {
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">{{ f.label }}</div>
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono);color:var(--maroon);margin-bottom:4px">{{ f.value }}</div>
          <div style="font-size:11px;color:var(--text-muted)">{{ f.description }}</div>
        </div>
      }
    </div>
  </div>

  <div style="flex:1;min-height:0;display:flex;overflow:hidden">

    <!-- Next runs + stats -->
    <div style="flex:1;min-width:0;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px">

      <!-- Presets -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Presets</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          @for (p of presets; track p.expr) {
            <button (click)="applyPreset(p.expr)"
              [style.border-color]="expression === p.expr ? 'var(--teal)' : 'var(--border)'"
              [style.color]="expression === p.expr ? 'var(--teal-ink)' : 'var(--text)'"
              style="padding:4px 12px;border-radius:6px;border:1px solid;font-size:12px;background:var(--surface);cursor:pointer">
              {{ p.label }}
            </button>
          }
        </div>
      </div>

      <!-- Next fire times -->
      @if (!errorMsg() && nextRuns().length) {
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Next 10 Fire Times</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden">
            @for (run of nextRuns(); track $index) {
              <div [style.border-bottom]="$last ? 'none' : '1px solid var(--border)'"
                style="padding:10px 14px;display:flex;align-items:center;gap:12px">
                <span style="font-size:11px;font-weight:600;color:var(--text-faint);width:20px">#{{ $index + 1 }}</span>
                <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text)">{{ run.iso }}</span>
                <span style="font-size:11.5px;color:var(--text-muted)">{{ run.local }}</span>
                <div style="flex:1"></div>
                <span style="font-size:11px;color:var(--teal)">{{ run.relative }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Stats -->
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Annual Stats</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            @for (stat of annualStats(); track stat.label) {
              <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
                <div style="font-size:22px;font-weight:700;color:var(--teal)">{{ stat.value }}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">{{ stat.label }}</div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Right: timezone + help -->
    <div style="width:240px;flex-shrink:0;border-left:1px solid var(--border);padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:16px">

      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Timezone</div>
        <select [(ngModel)]="timezone" (ngModelChange)="onExprChange()"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px;background:var(--surface);color:var(--text)">
          @for (tz of timezones; track tz) {
            <option [value]="tz">{{ tz }}</option>
          }
        </select>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Field Reference</div>
        <div style="font-size:11.5px;color:var(--text);display:flex;flex-direction:column;gap:4px">
          <div><span style="font-family:var(--font-mono);color:var(--maroon)">*</span> — any value</div>
          <div><span style="font-family:var(--font-mono);color:var(--maroon)">*/n</span> — every n units</div>
          <div><span style="font-family:var(--font-mono);color:var(--maroon)">a-b</span> — range</div>
          <div><span style="font-family:var(--font-mono);color:var(--maroon)">a,b</span> — list</div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--text-faint)">
          <div>Minute: 0-59</div>
          <div>Hour: 0-23</div>
          <div>Day: 1-31</div>
          <div>Month: 1-12</div>
          <div>Weekday: 0-7 (0,7=Sun)</div>
        </div>
      </div>

    </div>
  </div>
</div>
`,
})
export class CronComponent {
  expression = '0 9 * * 1-5';
  timezone = 'UTC';
  timezones = TIMEZONES;
  presets = PRESETS;

  description = signal('');
  errorMsg = signal('');
  fields = signal<CronField[]>([]);
  nextRuns = signal<{ iso: string; local: string; relative: string }[]>([]);
  annualStats = signal<{ label: string; value: string }[]>([]);

  constructor() { this.onExprChange(); }

  applyPreset(expr: string) { this.expression = expr; this.onExprChange(); }

  onExprChange() {
    this.errorMsg.set('');
    const expr = this.expression.trim();
    if (!expr) return;

    // Parse field breakdown
    const parts = expr.split(/\s+/);
    if (parts.length === 5) {
      const labels = ['Minute', 'Hour', 'Day', 'Month', 'Weekday'];
      const types = ['minute', 'hour', 'day', 'month', 'weekday'];
      this.fields.set(parts.map((v, i) => ({
        label: labels[i],
        value: v,
        description: describeCronField(v, types[i]),
        examples: [],
      })));
    }

    // Human-readable description
    try {
      this.description.set(cronstrue.toString(expr));
    } catch {
      this.description.set('');
    }

    // Next runs
    try {
      const interval = CronExpressionParser.parse(expr, { tz: this.timezone });
      const runs: { iso: string; local: string; relative: string }[] = [];
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        const date = interval.next().toDate();
        const diff = date.getTime() - now;
        const secs = Math.floor(diff / 1000);
        let relative = '';
        if (secs < 60) relative = `in ${secs}s`;
        else if (secs < 3600) relative = `in ${Math.floor(secs / 60)}m`;
        else if (secs < 86400) relative = `in ${Math.floor(secs / 3600)}h`;
        else relative = `in ${Math.floor(secs / 86400)}d`;
        runs.push({
          iso: date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          local: date.toLocaleString(),
          relative,
        });
      }
      this.nextRuns.set(runs);
      this.errorMsg.set('');

      // Annual stats: count fires in next 365 days
      try {
        const statsInterval = CronExpressionParser.parse(expr, { tz: this.timezone });
        let count = 0;
        const limit = Date.now() + 365 * 24 * 3600 * 1000;
        let last: Date | null = null;
        let totalGap = 0;
        for (let i = 0; i < 10000; i++) {
          const d = statsInterval.next().toDate();
          if (d.getTime() > limit) break;
          if (last) totalGap += d.getTime() - last.getTime();
          last = d;
          count++;
        }
        const avgMin = count > 1 ? Math.round(totalGap / (count - 1) / 60000) : 0;
        this.annualStats.set([
          { label: 'Fires per year', value: count.toLocaleString() },
          { label: 'Avg interval', value: avgMin > 1440 ? `${Math.round(avgMin / 1440)}d` : avgMin > 60 ? `${Math.round(avgMin / 60)}h` : `${avgMin}m` },
          { label: 'Per month (avg)', value: Math.round(count / 12).toLocaleString() },
        ]);
      } catch { this.annualStats.set([]); }

    } catch (err) {
      this.errorMsg.set(String(err));
      this.nextRuns.set([]);
      this.annualStats.set([]);
    }
  }
}
