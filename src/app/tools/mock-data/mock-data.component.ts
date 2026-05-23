import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

const FIRST_NAMES = ['Alice','Bob','Carol','David','Eve','Frank','Grace','Henry','Ivy','Jack','Karen','Liam','Mia','Noah','Olivia','Paul','Quinn','Rachel','Sam','Tina','Uma','Victor','Wendy','Xander','Yara','Zoe'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Lee','Walker','Hall','Allen','Young','King','Wright'];
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','example.com','company.io','work.net','mail.org'];
const CITIES = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Indianapolis'];
const COUNTRIES = ['USA','Canada','UK','Germany','France','Australia','Japan','Brazil','India','Mexico','Spain','Italy','Netherlands','Sweden','Norway'];
const COMPANIES = ['Acme Corp','Globex','Initech','Umbrella','Massive Dynamic','Soylent Corp','Virtucon','Oscorp','Tyrell Corp','Weyland-Yutani','InGen','Cyberdyne','Rekall','Monarch','Aperture'];
const JOB_TITLES = ['Software Engineer','Product Manager','Data Scientist','DevOps Engineer','UX Designer','Marketing Manager','Sales Director','HR Specialist','Finance Analyst','QA Engineer','Technical Lead','CTO','CEO','Operations Manager','Customer Success'];
const STREETS = ['Main St','Oak Ave','Maple Dr','Cedar Ln','Pine Rd','Elm St','Washington Blvd','Park Ave','Lake Dr','River Rd','Hill St','Valley Way','Forest Ln','Sunset Blvd'];
const USERNAMES = ['cool_coder','techguru','dev_ninja','byte_wizard','pixel_pusher','code_master','hack_smith','proto_dev','sys_admin','net_wizard','cloud_rider','data_miner','algo_king','bug_hunter','script_kiddo'];
const HASHES = ['$2b$10$abc123def456','$2b$12$xyz789uvw012','$argon2id$v=19','$sha256$rounds=5000','$bcrypt$10$qwe456rty789'];

function rnd(arr: unknown[]): unknown { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function rndIp(): string { return `${rndInt(1,254)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`; }
function rndPhone(): string { return `+1-${rndInt(200,999)}-${rndInt(100,999)}-${rndInt(1000,9999)}`; }
function rndDob(): string {
  const y = rndInt(1950, 2005);
  const m = String(rndInt(1,12)).padStart(2,'0');
  const d = String(rndInt(1,28)).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function rndCc(): string {
  const prefix = rnd(['4','5','37','6011']) as string;
  return `${prefix}XXXX XXXX XXXX ${rndInt(1000,9999)}`;
}

interface FieldConfig { key: string; label: string; enabled: boolean; }

type RowData = Record<string, string>;

function generateRow(fields: FieldConfig[]): RowData {
  const fn = rnd(FIRST_NAMES) as string;
  const ln = rnd(LAST_NAMES) as string;
  const row: RowData = {};
  for (const f of fields) {
    if (!f.enabled) continue;
    switch (f.key) {
      case 'firstName':  row[f.key] = fn; break;
      case 'lastName':   row[f.key] = ln; break;
      case 'email':      row[f.key] = `${fn.toLowerCase()}.${ln.toLowerCase()}@${rnd(DOMAINS)}`; break;
      case 'phone':      row[f.key] = rndPhone(); break;
      case 'address':    row[f.key] = `${rndInt(1,9999)} ${rnd(STREETS)}`; break;
      case 'city':       row[f.key] = rnd(CITIES) as string; break;
      case 'country':    row[f.key] = rnd(COUNTRIES) as string; break;
      case 'company':    row[f.key] = rnd(COMPANIES) as string; break;
      case 'jobTitle':   row[f.key] = rnd(JOB_TITLES) as string; break;
      case 'uuid':       row[f.key] = rndUuid(); break;
      case 'dob':        row[f.key] = rndDob(); break;
      case 'ip':         row[f.key] = rndIp(); break;
      case 'creditCard': row[f.key] = rndCc(); break;
      case 'username':   row[f.key] = rnd(USERNAMES) as string; break;
      case 'password':   row[f.key] = `${rnd(HASHES)}${rndInt(100000,999999)}`; break;
    }
  }
  return row;
}

function rowsToJson(rows: RowData[]): string { return JSON.stringify(rows, null, 2); }

function rowsToCsv(rows: RowData[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (s: string) => s.includes(',') || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k] ?? '')).join(','))].join('\n');
}

function rowsToSql(rows: RowData[], table = 'users'): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const cols = keys.join(', ');
  const stmts = rows.map(r => {
    const vals = keys.map(k => `'${(r[k] ?? '').replace(/'/g, "''")}'`).join(', ');
    return `INSERT INTO ${table} (${cols}) VALUES (${vals});`;
  });
  return stmts.join('\n');
}

@Component({
    selector: 'dt-tool-mock-data',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Utilities', 'Mock Data Generator']" [toolId]="'mock-data'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="identification" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">Mock Data Generator</div>
      <div style="font-size:12px;color:var(--text-muted)">Generate realistic fake data for testing</div>
    </div>
  </div>

  <div style="flex:1;display:flex;min-height:0;overflow:hidden">
    <!-- Settings panel -->
    <div style="width:240px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;padding:14px">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:10px">Fields</div>
      @for (f of fields; track f.key) {
        <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--text-muted);cursor:pointer;padding:4px 0">
          <input type="checkbox" [(ngModel)]="f.enabled" /> {{ f.label }}
        </label>
      }
      <div style="margin-top:16px;font-size:12.5px;font-weight:600;margin-bottom:8px">Rows</div>
      <input type="number" [(ngModel)]="rowCount" min="1" max="100"
        style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;background:var(--bg);color:var(--text);outline:none" />
      <div style="margin-top:16px;font-size:12.5px;font-weight:600;margin-bottom:8px">Output Format</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        @for (fmt of formats; track fmt.key) {
          <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--text-muted);cursor:pointer">
            <input type="radio" name="fmt" [(ngModel)]="outputFmt" [value]="fmt.key" /> {{ fmt.label }}
          </label>
        }
      </div>
      <button (click)="generate()"
        style="margin-top:16px;width:100%;background:var(--maroon);color:#fff;height:34px;border-radius:7px;font-size:13px;font-weight:500;border:none;cursor:pointer">
        Generate
      </button>
    </div>

    <!-- Output -->
    <div style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;gap:8px">
        Output
        <span style="font-size:11px;color:var(--text-faint)">{{ rows().length }} rows</span>
        <div style="flex:1"></div>
        @if (output()) {
          <button (click)="copyOut()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
          <button (click)="download()" style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
            <dt-icon name="download" [size]="11" color="var(--text-muted)" />
            Download
          </button>
        }
      </div>
      <textarea readonly [value]="output()"
        placeholder="Click Generate to produce data…"
        style="flex:1;resize:none;border:none;outline:none;padding:14px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);line-height:1.5;min-height:0"></textarea>
    </div>
  </div>
</div>
`
})
export class MockDataComponent {
  fields: FieldConfig[] = [
    { key: 'firstName',  label: 'First Name',        enabled: true },
    { key: 'lastName',   label: 'Last Name',          enabled: true },
    { key: 'email',      label: 'Email',              enabled: true },
    { key: 'phone',      label: 'Phone',              enabled: true },
    { key: 'address',    label: 'Address',            enabled: false },
    { key: 'city',       label: 'City',               enabled: false },
    { key: 'country',    label: 'Country',            enabled: false },
    { key: 'company',    label: 'Company',            enabled: false },
    { key: 'jobTitle',   label: 'Job Title',          enabled: false },
    { key: 'uuid',       label: 'UUID',               enabled: true },
    { key: 'dob',        label: 'Date of Birth',      enabled: false },
    { key: 'ip',         label: 'IP Address',         enabled: false },
    { key: 'creditCard', label: 'Credit Card (masked)', enabled: false },
    { key: 'username',   label: 'Username',           enabled: false },
    { key: 'password',   label: 'Password (hashed)',  enabled: false },
  ];
  formats = [
    { key: 'json', label: 'JSON Array' },
    { key: 'csv',  label: 'CSV' },
    { key: 'sql',  label: 'SQL INSERT' },
  ];
  rowCount = 10;
  outputFmt = 'json';
  rows = signal<RowData[]>([]);
  output = signal('');
  copied = signal(false);

  generate() {
    const active = this.fields.filter(f => f.enabled);
    if (!active.length) return;
    const count = Math.max(1, Math.min(100, this.rowCount));
    const data: RowData[] = [];
    for (let i = 0; i < count; i++) data.push(generateRow(this.fields));
    this.rows.set(data);
    if (this.outputFmt === 'json') this.output.set(rowsToJson(data));
    else if (this.outputFmt === 'csv') this.output.set(rowsToCsv(data));
    else this.output.set(rowsToSql(data));
  }

  copyOut() {
    navigator.clipboard.writeText(this.output()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  download() {
    const ext = this.outputFmt === 'json' ? 'json' : this.outputFmt === 'csv' ? 'csv' : 'sql';
    const blob = new Blob([this.output()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mock-data.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }
}
