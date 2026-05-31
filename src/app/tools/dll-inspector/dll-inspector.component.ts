import { Component, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface DllInfo {
  file_name:        string;
  file_version:     string | null;
  assembly_name:    string | null;
  assembly_version: string | null;
  is_dotnet:        boolean;
}

@Component({
  selector: 'dt-tool-dll-inspector',
  imports: [TopbarComponent, IconComponent],
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0 }`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['.NET', 'DLL Inspector']" [toolId]="'dll-inspector'" />

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);display:grid;place-items:center">
      <dt-icon name="cpu-chip" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">.NET DLL Inspector</div>
      <div style="font-size:12px;color:var(--text-muted)">Assembly name, assembly version, file version</div>
    </div>
  </div>

  <!-- Drop zone / pick button -->
  <div style="padding:22px;flex-shrink:0">
    <div
      (click)="pickFile()"
      (dragover)="$event.preventDefault()"
      (drop)="onDrop($event)"
      style="border:2px dashed var(--border-strong);border-radius:10px;padding:32px 20px;
             display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;
             transition:border-color .15s, background .15s"
      [style.border-color]="dragging() ? 'var(--teal)' : 'var(--border-strong)'"
      [style.background]="dragging() ? 'var(--teal-soft)' : 'var(--surface)'"
      (dragenter)="dragging.set(true)"
      (dragleave)="dragging.set(false)"
    >
      <dt-icon name="arrow-up-tray" [size]="28" color="var(--text-faint)" />
      <span style="font-size:13.5px;font-weight:500;color:var(--text-muted)">
        Drop a .dll file here, or click to browse
      </span>
      <span style="font-size:11.5px;color:var(--text-faint)">Reads the file locally — nothing is uploaded</span>
    </div>
  </div>

  <!-- Error banner -->
  @if (error()) {
    <div style="margin:0 22px 16px;padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;
                border-radius:7px;color:#b91c1c;font-size:12.5px;flex-shrink:0">
      {{ error() }}
    </div>
  }

  <!-- Loading -->
  @if (loading()) {
    <div style="padding:24px 22px;color:var(--text-faint);font-size:13px;flex-shrink:0">
      Parsing…
    </div>
  }

  <!-- Results -->
  @if (info(); as i) {
    <div style="flex:1;min-height:0;overflow-y:auto;padding:0 22px 22px">

      <!-- File name heading -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <dt-icon name="document" [size]="15" color="var(--text-faint)" />
        <span style="font-size:13px;font-weight:600;color:var(--text)">{{ i.file_name }}</span>
        @if (i.is_dotnet) {
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;
                       background:var(--teal-soft);color:var(--teal);font-weight:600">.NET</span>
        } @else {
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;
                       background:var(--surface-muted);color:var(--text-muted);font-weight:500">Native</span>
        }
      </div>

      <!-- Info cards -->
      <div style="display:flex;flex-direction:column;gap:8px">

        @for (row of rows(i); track row.label) {
          <div style="background:var(--surface);border:1px solid var(--border);
                      border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:16px">
            <span style="min-width:148px;font-size:12px;color:var(--text-muted);flex-shrink:0">
              {{ row.label }}
            </span>
            @if (row.value) {
              <span style="font-family:var(--font-mono);font-size:13px;color:var(--text);
                           word-break:break-all;flex:1" class="selectable">
                {{ row.value }}
              </span>
              <button
                (click)="copy(row.value, row.label)"
                style="flex-shrink:0;background:transparent;border:1px solid var(--border);
                       border-radius:5px;padding:2px 8px;font-size:11px;cursor:pointer;
                       color:var(--text-muted);display:flex;align-items:center;gap:4px">
                <dt-icon [name]="copied() === row.label ? 'check' : 'clipboard'"
                         [size]="11" color="var(--text-muted)" />
                {{ copied() === row.label ? 'Copied!' : 'Copy' }}
              </button>
            } @else {
              <span style="font-size:12px;color:var(--text-faint);font-style:italic">not present</span>
            }
          </div>
        }

      </div>

      <!-- Re-pick button -->
      <button
        (click)="pickFile()"
        style="margin-top:18px;background:var(--surface);border:1px solid var(--border);
               border-radius:7px;padding:6px 14px;font-size:12.5px;cursor:pointer;
               color:var(--text-muted);display:inline-flex;align-items:center;gap:6px">
        <dt-icon name="arrow-path" [size]="13" color="var(--text-muted)" />
        Inspect another file
      </button>
    </div>
  }
</div>
`
})
export class DllInspectorComponent {
  info    = signal<DllInfo | null>(null);
  loading = signal(false);
  error   = signal('');
  dragging = signal(false);
  copied  = signal('');

  rows(i: DllInfo) {
    return [
      { label: 'Assembly Name',    value: i.assembly_name    ?? '' },
      { label: 'Assembly Version', value: i.assembly_version ?? '' },
      { label: 'File Version',     value: i.file_version     ?? '' },
    ];
  }

  async pickFile() {
    this.error.set('');
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '.NET Assembly', extensions: ['dll', 'exe'] }],
      });
      if (typeof selected === 'string') {
        await this.inspect(selected);
      }
    } catch (e: any) {
      this.error.set('Could not open file dialogue: ' + (e?.message ?? String(e)));
    }
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const path = (file as File & { path?: string }).path;
    if (path) {
      await this.inspect(path);
    } else {
      this.error.set('Drop is only supported when running as a native app (no file path available in browser mode).');
    }
  }

  private async inspect(path: string) {
    this.loading.set(true);
    this.info.set(null);
    this.error.set('');
    try {
      const result = await invoke<DllInfo>('inspect_dll', { path });
      this.info.set(result);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.copied.set(label);
      setTimeout(() => this.copied.set(''), 1500);
    });
  }
}
