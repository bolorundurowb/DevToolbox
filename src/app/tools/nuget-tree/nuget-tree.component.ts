import {
  Component,
  signal,
  computed,
  OnDestroy,
  Input,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { invoke, Channel } from '@tauri-apps/api/core';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

// ── Serialised types that arrive from the Rust command ───────────────────────

export interface SimpleDep {
  id:       string;
  version:  string;
  circular: boolean;
}

export interface FrameworkGroup {
  framework: string;
  deps:      SimpleDep[];
}

export type NugetEvent =
  | { type: 'header';      id: string; version: string; frameworkGroups: FrameworkGroup[] }
  | { type: 'packageData'; id: string; version: string; frameworkGroups: FrameworkGroup[];
      truncated: boolean; error?: string }
  | { type: 'done';        totalNodes: number; truncated: boolean }
  | { type: 'error';       message: string };

// ── Client-side registry ──────────────────────────────────────────────────────

export interface PackageEntry {
  id:             string;
  version:        string;
  frameworkGroups: FrameworkGroup[];
  truncated:      boolean;
  error?:         string;
}

// ── NuGet TFM compatibility helpers ─────────────────────────────────────────
// Returns the best matching framework key from `available` for a given
// `contextFw` parent frame, or null if nothing matches.
//
// Matching priority:
//   1. Exact match
//   2. For netstandard contexts: highest netstandard version ≤ context version
//   3. For net5+ contexts: highest compatible netstandard (any version)
//   4. For net4x contexts: highest compatible net4x version ≤ context
//   5. "any" / "" catch-all
//   6. First available (best-effort)

const RE_NS  = /^netstandard(\d+)\.(\d+)$/;
const RE_NET = /^net(\d+)\.(\d+)$/;
const RE_N4  = /^net(\d)(\d)$/;  // e.g. net45, net48

function parseTfm(fw: string): { kind: 'ns' | 'net' | 'net4x' | 'any' | 'other';
                                  major: number; minor: number } | null {
  let m: RegExpMatchArray | null;
  if ((m = RE_NS.exec(fw)))  return { kind: 'ns',    major: +m[1], minor: +m[2] };
  if ((m = RE_NET.exec(fw))) return { kind: 'net',   major: +m[1], minor: +m[2] };
  if ((m = RE_N4.exec(fw)))  return { kind: 'net4x', major: +m[1], minor: +m[2] };
  if (fw === '' || fw.toLowerCase() === 'any') return { kind: 'any', major: 0, minor: 0 };
  return null;
}

export function bestFramework(contextFw: string, available: string[]): string | null {
  if (available.length === 0) return null;

  // 1. Exact match
  if (available.includes(contextFw)) return contextFw;

  const ctx = parseTfm(contextFw);

  // 2. netstandard context → best netstandard ≤ context
  if (ctx?.kind === 'ns') {
    const candidates = available
      .map(f => ({ f, p: parseTfm(f) }))
      .filter(({ p }) => p?.kind === 'ns' &&
                         (p.major < ctx.major || (p.major === ctx.major && p.minor <= ctx.minor)))
      .sort((a, b) => {
        const pa = a.p!, pb = b.p!;
        return pb.major !== pa.major ? pb.major - pa.major : pb.minor - pa.minor;
      });
    if (candidates.length) return candidates[0].f;
  }

  // 3. net5+ context → best netstandard (any version), then net5+ ≤ context
  if (ctx?.kind === 'net') {
    // net5+ prefers netstandard2.1 → netstandard2.0 → netstandard1.x …
    const nsCandidates = available
      .map(f => ({ f, p: parseTfm(f) }))
      .filter(({ p }) => p?.kind === 'ns')
      .sort((a, b) => {
        const pa = a.p!, pb = b.p!;
        return pb.major !== pa.major ? pb.major - pa.major : pb.minor - pa.minor;
      });
    if (nsCandidates.length) return nsCandidates[0].f;

    // then net5+ ≤ context
    const netCandidates = available
      .map(f => ({ f, p: parseTfm(f) }))
      .filter(({ p }) => p?.kind === 'net' &&
                         (p.major < ctx.major || (p.major === ctx.major && p.minor <= ctx.minor)))
      .sort((a, b) => {
        const pa = a.p!, pb = b.p!;
        return pb.major !== pa.major ? pb.major - pa.major : pb.minor - pa.minor;
      });
    if (netCandidates.length) return netCandidates[0].f;
  }

  // 4. net4x context → best net4x ≤ context
  if (ctx?.kind === 'net4x') {
    const candidates = available
      .map(f => ({ f, p: parseTfm(f) }))
      .filter(({ p }) => p?.kind === 'net4x' &&
                         (p.major < ctx.major || (p.major === ctx.major && p.minor <= ctx.minor)))
      .sort((a, b) => {
        const pa = a.p!, pb = b.p!;
        return pb.major !== pa.major ? pb.major - pa.major : pb.minor - pa.minor;
      });
    if (candidates.length) return candidates[0].f;
  }

  // 5. "any" / "" catch-all
  const anyCatch = available.find(f => f === '' || f.toLowerCase() === 'any');
  if (anyCatch !== undefined) return anyCatch;

  // 6. First available (best-effort)
  return available[0];
}

// ── Registry key helper ──────────────────────────────────────────────────────

export function pkgKey(id: string, version: string): string {
  return `${id.toLowerCase()}@${version.toLowerCase()}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_DEPTH_VAL = 25;

// ── Tree-node sub-component ───────────────────────────────────────────────────

@Component({
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
    [style.background]="isOpen() ? 'var(--surface-muted)' : 'transparent'"
    [style.opacity]="entry()?.error ? '0.65' : '1'"
  >
    <!-- Expand chevron -->
    <span style="width:14px;flex-shrink:0;display:grid;place-items:center">
      @if (hasChildren()) {
        <dt-icon [name]="isOpen() ? 'chevron-down' : 'chevron-right'"
                 [size]="11" color="var(--text-faint)" />
      } @else if (!isDone() && !entry()) {
        <!-- spinner placeholder while loading -->
        <dt-icon name="arrow-path" [size]="11" color="var(--text-faint)" />
      }
    </span>

    <!-- Package id -->
    <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);font-weight:500">
      {{ dep().id }}
    </span>

    <!-- Version badge -->
    <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">
      {{ dep().version }}
    </span>

    <!-- Loading badge (data not yet in registry and resolution still in flight) -->
    @if (!isDone() && !entry()) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:var(--surface-muted);color:var(--text-faint);
                   font-weight:500;flex-shrink:0;animation:pulse 1.4s infinite">
        loading…
      </span>
    }

    <!-- Truncation badge -->
    @if (entry()?.truncated) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#fef3c7;color:#92400e;font-weight:600;flex-shrink:0">
        depth limit
      </span>
    }

    <!-- Circular badge -->
    @if (dep().circular) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#ede9fe;color:#5b21b6;font-weight:600;flex-shrink:0">
        circular
      </span>
    }

    <!-- Error badge -->
    @if (entry()?.error && !entry()?.truncated && !dep().circular) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#fee2e2;color:#991b1b;font-weight:600;flex-shrink:0"
            [title]="entry()!.error">
        {{ entry()!.error === 'circular dependency detected' ? 'circular' : 'error' }}
      </span>
    }

    <!-- Not-found badge (done but registry has no data) -->
    @if (isDone() && !entry() && !dep().circular) {
      <span style="font-size:10px;padding:1px 7px;border-radius:9px;
                   background:#f3f4f6;color:var(--text-faint);font-weight:500;flex-shrink:0">
        not found
      </span>
    }
  </div>

  <!-- Children -->
  @if (isOpen() && hasChildren()) {
    @let resolvedDeps = resolvedFrameworkDeps();
    @if (resolvedDeps !== null) {
      @if (resolvedDeps.length === 0) {
        <div style="padding:8px 28px;font-size:12px;color:var(--text-faint);font-style:italic">
          No dependencies
        </div>
      } @else {
        @for (child of resolvedDeps; track child.id + child.version) {
          <dt-dep-node
            [dep]="child"
            [registry]="registry()"
            [isDone]="isDone()"
            [contextFw]="contextFw()"
            [expandAll]="expandAll()"
            [depth]="depth + 1"
          />
        }
      }
    }
  }
</div>
  `,
})
export class DepNodeComponent {
  /** The SimpleDep reference (id, version, circular flag). */
  dep = input.required<SimpleDep>();
  /** Shared flat package registry. */
  registry = input.required<Map<string, PackageEntry>>();
  /** True once the Done event arrives — used to decide "not found" vs "loading". */
  isDone  = input.required<boolean>();
  /** The target framework under which this node is being rendered. */
  contextFw = input.required<string>();
  /** When true, all nodes expand regardless of local state. */
  expandAll = input<boolean>(false);
  /** Visual indentation depth. */
  @Input() depth = 0;

  /** Per-node open state set by the user clicking the row. */
  private localOpen = signal(false);

  /** True when this node's children should be shown. */
  isOpen = computed(() => this.expandAll() || this.localOpen());

  /** Look up this dep's full data in the registry. */
  entry = computed<PackageEntry | undefined>(() =>
    this.registry().get(pkgKey(this.dep().id, this.dep().version))
  );

  /** The deps to render under this node for the current contextFw. */
  resolvedFrameworkDeps = computed<SimpleDep[] | null>(() => {
    const e = this.entry();
    if (!e) return null;

    const available = e.frameworkGroups.map(g => g.framework);
    const best = bestFramework(this.contextFw(), available);
    if (best === null) return [];

    const group = e.frameworkGroups.find(g => g.framework === best);
    return group ? group.deps : [];
  });

  hasChildren = computed<boolean>(() => {
    const deps = this.resolvedFrameworkDeps();
    if (deps === null) return false;  // data not loaded yet
    return deps.length > 0;           // show chevron for any deps, including circular
  });

  toggle() {
    if (this.hasChildren()) this.localOpen.update(v => !v);
  }
}

// ── Main tool component ───────────────────────────────────────────────────────

@Component({
  selector: 'dt-tool-nuget-tree',
  imports: [FormsModule, TopbarComponent, IconComponent, DepNodeComponent],
  styles: [`:host { display:flex; flex-direction:column; flex:1; min-height:0 }`],
  template: `
<style>
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>

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
      (keydown.enter)="resolve()"
      placeholder="Package ID  e.g. Newtonsoft.Json"
      style="flex:2;min-width:180px;height:32px;padding:0 10px;border:1px solid var(--border);
             border-radius:7px;font-size:13px;background:var(--surface);color:var(--text);outline:none"
    />
    <input
      [(ngModel)]="packageVersion"
      (keydown.enter)="resolve()"
      placeholder="Version  e.g. 13.0.3"
      style="flex:1;min-width:120px;height:32px;padding:0 10px;border:1px solid var(--border);
             border-radius:7px;font-size:13px;background:var(--surface);color:var(--text);outline:none"
    />
    <button
      (click)="resolve()"
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

  <!-- Stats bar (appears as soon as Header arrives) -->
  @if (rootId()) {
    <div style="display:flex;align-items:center;gap:16px;padding:10px 22px 0;flex-shrink:0">
      <span style="font-size:12px;color:var(--text-muted)">
        <strong>{{ rootId() }}</strong> {{ rootVersion() }}
      </span>
      <span style="font-size:11.5px;color:var(--text-faint)">
        {{ rootFrameworks().length }} target framework{{ rootFrameworks().length === 1 ? '' : 's' }}
      </span>
      @if (isDone()) {
        <span style="font-size:11.5px;color:var(--text-faint)">
          {{ totalNodes() }} package{{ totalNodes() === 1 ? '' : 's' }} in tree
        </span>
      } @else if (loading()) {
        <span style="font-size:11.5px;color:var(--text-faint);animation:pulse 1.4s infinite">
          resolving…
        </span>
      }
      <div style="flex:1"></div>
      @if (isDone()) {
        <button
          (click)="toggleExpandAll()"
          style="font-size:11.5px;color:var(--text-muted);background:var(--surface);
                 border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer">
          {{ expandAll() ? 'Collapse all' : 'Expand all' }}
        </button>
      }
    </div>
  }

  <!-- Truncation notice -->
  @if (isTruncated()) {
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

  <!-- Tree (renders immediately from Header, hydrates as PackageData events arrive) -->
  @if (rootId()) {
    <div style="flex:1;min-height:0;overflow-y:auto;padding:14px 22px 22px">

      <!-- Root package row -->
      <div style="display:flex;align-items:center;gap:7px;padding:7px 8px;
                  background:var(--surface);border:1px solid var(--border);
                  border-radius:7px;margin-bottom:6px">
        <dt-icon name="cube" [size]="13" color="var(--teal)" />
        <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text);font-weight:600">
          {{ rootId() }}
        </span>
        <span style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted)">
          {{ rootVersion() }}
        </span>
        <span style="font-size:11.5px;color:var(--text-faint)">root package</span>
      </div>

      <!-- Root frameworks -->
      @if (rootFrameworks().length === 0) {
        <div style="padding:10px 28px;font-size:12px;color:var(--text-faint);font-style:italic">
          No dependencies found for this package version.
        </div>
      } @else {
        @for (fw of rootFrameworks(); track fw.framework) {
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
                {{ fw.deps.length }} direct dep{{ fw.deps.length === 1 ? '' : 's' }}
              </span>
            </div>

            @if (fwOpen(fw.framework)) {
              @if (fw.deps.length === 0) {
                <div style="padding:8px 28px;font-size:12px;color:var(--text-faint);font-style:italic">
                  No dependencies
                </div>
              } @else {
                @for (dep of fw.deps; track dep.id + dep.version) {
                  <dt-dep-node
                    [dep]="dep"
                    [registry]="registry()"
                    [isDone]="isDone()"
                    [contextFw]="fw.framework"
                    [expandAll]="expandAll()"
                    [depth]="1"
                  />
                }
              }
            }
          </div>
        }
      }
    </div>
  } @else if (!loading() && !error()) {
    <div style="flex:1;display:grid;place-items:center;color:var(--text-faint);font-size:13px">
      Enter a package ID and version, then press Resolve
    </div>
  }

  @if (loading() && !rootId()) {
    <div style="flex:1;display:grid;place-items:center">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <div style="color:var(--text-faint);font-size:13px">
          Resolving dependencies…
        </div>
        <div style="font-size:11.5px;color:var(--text-faint)">
          This may take up to 30 seconds for packages with deep trees
        </div>
      </div>
    </div>
  }
</div>
`,
})
export class NugetTreeComponent implements OnDestroy {
  readonly MAX_DEPTH = MAX_DEPTH_VAL;

  packageId      = '';
  packageVersion = '';

  // ── Core state signals ────────────────────────────────────────────────────
  loading   = signal(false);
  error     = signal('');

  /** Flat registry: pkgKey(id, version) → PackageEntry */
  registry  = signal<Map<string, PackageEntry>>(new Map());

  /** Root-package header fields (populated immediately from Header event) */
  rootId         = signal<string>('');
  rootVersion    = signal<string>('');
  rootFrameworks = signal<FrameworkGroup[]>([]);

  isDone     = signal(false);
  isTruncated = signal(false);
  totalNodes  = signal(0);
  expandAll   = signal(false);

  // ── Framework open-state tracking ────────────────────────────────────────
  private openFws    = new Set<string>();
  private resolveRunId = 0;

  // ── Overridable for unit tests ────────────────────────────────────────────
  /**
   * Kick off a resolution. `onEvent` will be called for each NugetEvent
   * the backend emits.  Returns a promise that resolves when the channel
   * invoke call itself settles (not when Done is received).
   */
  startResolution(
    id: string,
    version: string,
    onEvent: (e: NugetEvent) => void,
  ): Promise<void> {
    const channel = new Channel<NugetEvent>();
    channel.onmessage = onEvent;
    return invoke<void>('nuget_dependency_tree', {
      package: id,
      version,
      onEvent: channel,
    });
  }

  fwOpen(tf: string): boolean {
    if (this.expandAll()) return true;
    return this.openFws.has(tf);
  }

  toggleFw(tf: string) {
    if (this.openFws.has(tf)) this.openFws.delete(tf);
    else this.openFws.add(tf);
  }

  toggleExpandAll() {
    const next = !this.expandAll();
    this.expandAll.set(next);
    if (next) {
      // Expanding: open all root framework sections so fwOpen() returns true
      this.rootFrameworks().forEach(g => this.openFws.add(g.framework));
    } else {
      // Collapsing: clear openFws so fwOpen() returns false for all sections
      this.openFws.clear();
    }
  }

  async resolve() {
    const id  = this.packageId.trim();
    const ver = this.packageVersion.trim();
    if (!id || !ver) return;

    const runId = ++this.resolveRunId;

    // Reset
    this.loading.set(true);
    this.error.set('');
    this.rootId.set('');
    this.rootVersion.set('');
    this.rootFrameworks.set([]);
    this.registry.set(new Map());
    this.isDone.set(false);
    this.isTruncated.set(false);
    this.totalNodes.set(0);
    this.openFws.clear();

    try {
      await this.startResolution(id, ver, (evt: NugetEvent) => {
        if (runId !== this.resolveRunId) return; // stale run

        switch (evt.type) {
          case 'header':
            this.rootId.set(evt.id);
            this.rootVersion.set(evt.version);
            this.rootFrameworks.set(evt.frameworkGroups);
            // Auto-open all root frameworks
            evt.frameworkGroups.forEach(g => this.openFws.add(g.framework));
            break;

          case 'packageData': {
            const key = pkgKey(evt.id, evt.version);
            const next = new Map(this.registry());
            next.set(key, {
              id:             evt.id,
              version:        evt.version,
              frameworkGroups: evt.frameworkGroups,
              truncated:      evt.truncated,
              error:          evt.error,
            });
            this.registry.set(next);
            break;
          }

          case 'done':
            this.isDone.set(true);
            this.totalNodes.set(evt.totalNodes);
            if (evt.truncated) this.isTruncated.set(true);
            break;

          case 'error':
            this.error.set(evt.message);
            break;
        }
      });
    } catch (e: unknown) {
      if (runId !== this.resolveRunId) return;
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      if (runId === this.resolveRunId) this.loading.set(false);
    }
  }

  ngOnDestroy() {
    // Invalidate any in-flight resolution so its callbacks are no-ops
    this.resolveRunId++;
  }
}
