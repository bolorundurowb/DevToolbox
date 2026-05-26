import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { invoke } from '@tauri-apps/api/core';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

export interface DepNode {
  id:         string;
  version:    string;
  frameworks: FrameworkGroup[];
  truncated:  boolean;
  error:      string | null;
}

export interface FrameworkGroup {
  framework:    string;
  dependencies: DepNode[];
}

// ── tree-node sub-component ───────────────────────────────────────────────────

import { Component as Comp, Input, ChangeDetectionStrategy } from '@angular/core';

@Comp({
  selector: 'dt-dep-node',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div [style.margin-left.px]="depth * 16">

  <!-- Row -->
  <div
    (click)="toggle()"
    style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;
           cursor:pointer;user-select:none"
    [style.background]="open ? 'var(--surface-muted)' : 'transparent'"
    [style.opacity]="node.error ? '0.65' : '1'"
  >
    <!-- Expand chevron -->
    <span style="width:14px;flex-shrink:0;display:grid;place-items:center">
      @if (hasChildren) {
        <dt-icon [name]="open ? 'chevron-down' : 'chevron-right'"
                 [size]="11" color="var(--text-faint)" />
      }
    </span>

    <!-- Package id -->
    <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);font-weight:500">
      {{ node.id }}
    </span>

    <!-- Version badge -->
    <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">
      {{ node.version }}
    </span>

    <!-- Truncation badge -->
    @if (node.truncated) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#fef3c7;color:#92400e;font-weight:600;flex-shrink:0">
        depth limit
      </span>
    }

    <!-- Error badge -->
    @if (node.error && !node.truncated) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#fee2e2;color:#991b1b;font-weight:600;flex-shrink:0"
            [title]="node.error">
        {{ node.error === 'circular dependency detected' ? 'circular' : 'error' }}
      </span>
    }
  </div>

  <!-- Children -->
  @if (open && hasChildren) {
    @for (fw of node.frameworks; track fw.framework) {
      <!-- Framework label -->
      <div style="margin-left:20px;padding:3px 6px 1px;font-size:10.5px;
                  font-weight:600;color:var(--text-faint);letter-spacing:.04em;
                  text-transform:uppercase">
        {{ fw.framework }}
      </div>
      @for (dep of fw.dependencies; track dep.id + dep.version) {
        <dt-dep-node [node]="dep" [depth]="depth + 1" />
      }
    }
  }
</div>
  `,
})
export class DepNodeComponent {
  @Input() node!:  DepNode;
  @Input() depth = 0;
  open = false;

  get hasChildren(): boolean {
    return this.node.frameworks.some(f => f.dependencies.length > 0);
  }

  toggle() {
    if (this.hasChildren) this.open = !this.open;
  }
}

// ── main tool component ───────────────────────────────────────────────────────

@Component({
  selector: 'dt-tool-nuget-tree',
  imports: [FormsModule, TopbarComponent, IconComponent, DepNodeComponent],
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0 }`],
  template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['.NET', 'NuGet Dependency Tree']" [toolId]="'nuget-tree'" />

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;
              border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--teal-soft);
                display:grid;place-items:center">
      <dt-icon name="share" [size]="16" color="var(--teal)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">NuGet Dependency Tree</div>
      <div style="font-size:12px;color:var(--text-muted)">
        Full transitive tree across target frameworks · depth cap {{ MAX_DEPTH }}
      </div>
    </div>
  </div>

  <!-- Input row -->
  <div style="display:flex;align-items:center;gap:10px;padding:14px 22px;
              border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
    <input
      [(ngModel)]="packageId"
      (keydown.enter)="fetch()"
      placeholder="Package ID  e.g. Newtonsoft.Json"
      style="flex:2;min-width:180px;height:32px;padding:0 10px;border:1px solid var(--border);
             border-radius:7px;font-size:13px;background:var(--surface);color:var(--text);outline:none"
    />
    <input
      [(ngModel)]="packageVersion"
      (keydown.enter)="fetch()"
      placeholder="Version  e.g. 13.0.3"
      style="flex:1;min-width:120px;height:32px;padding:0 10px;border:1px solid var(--border);
             border-radius:7px;font-size:13px;background:var(--surface);color:var(--text);outline:none"
    />
    <button
      (click)="fetch()"
      [disabled]="loading() || !packageId.trim() || !packageVersion.trim()"
      style="height:32px;padding:0 16px;border-radius:7px;font-size:12.5px;font-weight:500;
             background:var(--teal);color:#fff;border:none;cursor:pointer;
             display:inline-flex;align-items:center;gap:6px;flex-shrink:0;
             opacity:1;transition:opacity .15s"
      [style.opacity]="(loading() || !packageId.trim() || !packageVersion.trim()) ? '0.5' : '1'"
    >
      @if (loading()) {
        <dt-icon name="arrow-path" [size]="13" color="#fff" />
        Fetching…
      } @else {
        <dt-icon name="play" [size]="13" color="#fff" />
        Resolve
      }
    </button>
  </div>

  <!-- Truncation notice -->
  @if (wasTruncated()) {
    <div style="margin:12px 22px 0;padding:9px 14px;background:#fef3c7;
                border:1px solid #fcd34d;border-radius:7px;font-size:12.5px;
                color:#78350f;display:flex;align-items:center;gap:8px;flex-shrink:0">
      <dt-icon name="exclamation-triangle" [size]="14" color="#b45309" />
      Some branches were truncated — the tree reached the maximum depth of
      <strong>{{ MAX_DEPTH }}</strong>. Nodes marked
      <span style="padding:1px 6px;border-radius:8px;background:#fef3c7;
                   border:1px solid #fcd34d;font-weight:700">depth limit</span>
      were not expanded further.
    </div>
  }

  <!-- Error banner -->
  @if (error()) {
    <div style="margin:12px 22px 0;padding:10px 14px;background:#fee2e2;
                border:1px solid #fca5a5;border-radius:7px;color:#b91c1c;
                font-size:12.5px;flex-shrink:0">
      {{ error() }}
    </div>
  }

  <!-- Tree -->
  @if (tree(); as t) {
    <div style="flex:1;min-height:0;overflow-y:auto;padding:14px 22px 22px">

      <!-- Stats row -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;flex-shrink:0">
        <span style="font-size:12px;color:var(--text-muted)">
          <strong>{{ t.id }}</strong> {{ t.version }}
        </span>
        <span style="font-size:11.5px;color:var(--text-faint)">
          {{ t.frameworks.length }} target framework{{ t.frameworks.length === 1 ? '' : 's' }}
        </span>
        <span style="font-size:11.5px;color:var(--text-faint)">
          {{ totalNodes() }} package{{ totalNodes() === 1 ? '' : 's' }} in tree
        </span>
        <div style="flex:1"></div>
        <button
          (click)="expandAll.set(!expandAll())"
          style="font-size:11.5px;color:var(--text-muted);background:var(--surface);
                 border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer">
          {{ expandAll() ? 'Collapse all' : 'Expand all' }}
        </button>
      </div>

      <!-- Root frameworks -->
      @for (fw of t.frameworks; track fw.framework) {
        <div style="margin-bottom:4px">
          <!-- Framework section header -->
          <div
            (click)="toggleFw(fw.framework)"
            style="display:flex;align-items:center;gap:7px;padding:6px 8px;
                   background:var(--surface);border:1px solid var(--border);
                   border-radius:7px;cursor:pointer;margin-bottom:2px"
          >
            <dt-icon
              [name]="fwOpen(fw.framework) ? 'chevron-down' : 'chevron-right'"
              [size]="12" color="var(--text-faint)" />
            <span style="font-size:12.5px;font-weight:600;color:var(--teal)">
              {{ fw.framework }}
            </span>
            <span style="font-size:11.5px;color:var(--text-faint)">
              {{ fw.dependencies.length }} direct dep{{ fw.dependencies.length === 1 ? '' : 's' }}
            </span>
          </div>

          @if (fwOpen(fw.framework)) {
            @if (fw.dependencies.length === 0) {
              <div style="padding:8px 28px;font-size:12px;color:var(--text-faint);font-style:italic">
                No dependencies
              </div>
            } @else {
              @for (dep of fw.dependencies; track dep.id + dep.version) {
                <dt-dep-node [node]="dep" [depth]="1" />
              }
            }
          }
        </div>
      }
    </div>
  } @else if (!loading() && !error()) {
    <div style="flex:1;display:grid;place-items:center;color:var(--text-faint);font-size:13px">
      Enter a package ID and version, then press Resolve
    </div>
  }

  @if (loading()) {
    <div style="flex:1;display:grid;place-items:center;flex-direction:column;gap:10px">
      <div style="color:var(--text-faint);font-size:13px">
        Resolving dependencies…
      </div>
      <div style="font-size:11.5px;color:var(--text-faint)">
        This may take a few seconds for packages with deep trees
      </div>
    </div>
  }
</div>
`
})
export class NugetTreeComponent {
  readonly MAX_DEPTH = 25;

  packageId      = '';
  packageVersion = '';
  loading  = signal(false);
  error    = signal('');
  tree     = signal<DepNode | null>(null);
  expandAll = signal(false);

  // Track which root framework sections are open
  private openFws = new Set<string>();

  fwOpen(tf: string) {
    if (this.expandAll()) return true;
    return this.openFws.has(tf);
  }

  toggleFw(tf: string) {
    if (this.openFws.has(tf)) this.openFws.delete(tf);
    else this.openFws.add(tf);
  }

  wasTruncated = computed(() => {
    const t = this.tree();
    if (!t) return false;
    return hasAnyTruncated(t);
  });

  totalNodes = computed(() => {
    const t = this.tree();
    if (!t) return 0;
    return countNodes(t);
  });

  async fetch() {
    const id  = this.packageId.trim();
    const ver = this.packageVersion.trim();
    if (!id || !ver) return;

    this.loading.set(true);
    this.error.set('');
    this.tree.set(null);
    this.openFws.clear();

    try {
      const result = await invoke<DepNode>('nuget_dependency_tree', {
        package: id,
        version: ver,
      });
      this.tree.set(result);
      // Auto-open all root frameworks
      result.frameworks.forEach(fw => this.openFws.add(fw.framework));
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function hasAnyTruncated(node: DepNode): boolean {
  if (node.truncated) return true;
  return node.frameworks.some(fw =>
    fw.dependencies.some(dep => hasAnyTruncated(dep))
  );
}

function countNodes(node: DepNode): number {
  return 1 + node.frameworks.reduce((sum, fw) =>
    sum + fw.dependencies.reduce((s, dep) => s + countNodes(dep), 0), 0
  );
}
