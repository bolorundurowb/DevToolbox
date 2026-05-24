import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';
import { CodeEditorComponent } from '../../core/components/code-editor/code-editor.component';

// Simple YAML to JSON converter (handles basic swagger files)
function yamlToJson(yaml: string): unknown {
  const lines = yaml.split('\n');
  const root: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown> | unknown[]; indent: number; key?: string }> = [{ obj: root, indent: -1 }];

  function getParent(): Record<string, unknown> | unknown[] {
    return stack[stack.length - 1].obj;
  }

  function parseScalar(s: string): unknown {
    s = s.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    const n = Number(s);
    if (!isNaN(n) && s !== '') return n;
    return s;
  }

  function getIndent(line: string): number {
    let i = 0;
    while (i < line.length && line[i] === ' ') i++;
    return i;
  }

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = getIndent(rawLine);
    const line = rawLine.trim();

    // Pop stack to current indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();

    const parent = getParent();

    if (line.startsWith('- ')) {
      const val = line.slice(2).trim();
      if (Array.isArray(parent)) {
        if (!val) {
          const newObj: Record<string, unknown> = {};
          (parent as unknown[]).push(newObj);
          stack.push({ obj: newObj, indent });
        } else if (val.includes(': ')) {
          const newObj: Record<string, unknown> = {};
          (parent as unknown[]).push(newObj);
          const ci = val.indexOf(': ');
          newObj[val.slice(0, ci)] = parseScalar(val.slice(ci + 2));
          stack.push({ obj: newObj, indent });
        } else {
          (parent as unknown[]).push(parseScalar(val));
        }
      }
    } else if (line.includes(': ') || line.endsWith(':')) {
      const ci = line.indexOf(': ');
      let key: string;
      let val: string;
      if (ci === -1) { key = line.slice(0, -1); val = ''; }
      else { key = line.slice(0, ci); val = line.slice(ci + 2); }

      if (!Array.isArray(parent)) {
        if (!val) {
          // Check if next non-empty line is a list item
          const nextLineIdx = lines.indexOf(rawLine) + 1;
          let nextContent = '';
          for (let ni = nextLineIdx; ni < lines.length; ni++) {
            if (lines[ni].trim()) { nextContent = lines[ni].trim(); break; }
          }
          if (nextContent.startsWith('- ')) {
            const arr: unknown[] = [];
            (parent as Record<string, unknown>)[key] = arr;
            stack.push({ obj: arr, indent, key });
          } else {
            const newObj: Record<string, unknown> = {};
            (parent as Record<string, unknown>)[key] = newObj;
            stack.push({ obj: newObj, indent, key });
          }
        } else {
          (parent as Record<string, unknown>)[key] = parseScalar(val);
        }
      }
    }
  }

  return root;
}

interface ApiInfo {
  title: string;
  version: string;
  description: string;
  servers: string[];
  paths: PathItem[];
}

interface PathItem {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ParamItem[];
  requestBody: string;
  responses: ResponseItem[];
  expanded: boolean;
}

interface ParamItem { name: string; in: string; required: boolean; description: string; type: string; }
interface ResponseItem { code: string; description: string; }

function parseOpenApi(raw: Record<string, unknown>): ApiInfo {
  const info = (raw['info'] as Record<string, unknown>) ?? {};
  const servers: string[] = [];
  if (Array.isArray(raw['servers'])) {
    for (const s of raw['servers'] as Record<string, unknown>[]) {
      servers.push(String(s['url'] ?? ''));
    }
  }
  const paths: PathItem[] = [];
  const rawPaths = (raw['paths'] ?? {}) as Record<string, unknown>;
  for (const [path, methods] of Object.entries(rawPaths)) {
    const methodsObj = methods as Record<string, unknown>;
    for (const [method, opRaw] of Object.entries(methodsObj)) {
      if (['get','post','put','delete','patch','head','options'].indexOf(method) === -1) continue;
      const op = opRaw as Record<string, unknown>;
      const tags = Array.isArray(op['tags']) ? (op['tags'] as string[]) : ['default'];
      const params: ParamItem[] = [];
      if (Array.isArray(op['parameters'])) {
        for (const p of op['parameters'] as Record<string, unknown>[]) {
          const schema = (p['schema'] as Record<string, unknown>) ?? {};
          params.push({
            name: String(p['name'] ?? ''),
            in: String(p['in'] ?? ''),
            required: Boolean(p['required']),
            description: String(p['description'] ?? ''),
            type: String(schema['type'] ?? p['type'] ?? 'string'),
          });
        }
      }
      const responses: ResponseItem[] = [];
      const rawResp = (op['responses'] ?? {}) as Record<string, unknown>;
      for (const [code, rRaw] of Object.entries(rawResp)) {
        const r = rRaw as Record<string, unknown>;
        responses.push({ code, description: String(r['description'] ?? '') });
      }
      let reqBody = '';
      if (op['requestBody']) {
        const rb = op['requestBody'] as Record<string, unknown>;
        const content = (rb['content'] as Record<string, unknown>) ?? {};
        const types = Object.keys(content);
        reqBody = types.join(', ');
      }
      paths.push({
        path, method: method.toUpperCase(),
        summary: String(op['summary'] ?? ''),
        description: String(op['description'] ?? ''),
        tags, parameters: params, requestBody: reqBody,
        responses, expanded: false,
      });
    }
  }
  return {
    title: String(info['title'] ?? 'API'),
    version: String(info['version'] ?? ''),
    description: String(info['description'] ?? ''),
    servers,
    paths,
  };
}

function methodColor(m: string): string {
  switch (m) {
    case 'GET': return '#16a34a';
    case 'POST': return '#2563eb';
    case 'PUT': return '#ea580c';
    case 'DELETE': return '#dc2626';
    case 'PATCH': return '#d97706';
    default: return '#6b7280';
  }
}

@Component({
    selector: 'dt-tool-openapi-viewer',
    imports: [FormsModule, TopbarComponent, IconComponent, CodeEditorComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Web & Network', 'OpenAPI Viewer']" [toolId]="'openapi'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="document" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">OpenAPI / Swagger Viewer</div>
      <div style="font-size:12px;color:var(--text-muted)">View API specs locally without external services</div>
    </div>
  </div>

  @if (!apiInfo()) {
    <!-- Drop zone / paste area -->
    <div style="flex:1;display:flex;flex-direction:column;padding:20px 22px;gap:14px;overflow-y:auto">
      <div
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        style="border:2px dashed var(--border);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:border-color 0.15s"
        [style.border-color]="dragging() ? 'var(--maroon)' : 'var(--border)'">
        <dt-icon name="upload" [size]="28" color="var(--text-faint)" />
        <div style="margin-top:10px;font-size:14px;font-weight:600;color:var(--text-muted)">Drop OpenAPI JSON or YAML file here</div>
        <div style="font-size:12px;color:var(--text-faint);margin-top:4px">or paste the content below</div>
      </div>
      <dt-code-editor language="yaml" style="flex:1;min-height:240px" [(value)]="rawInput" />
      @if (error()) {
        <div style="padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;color:#b91c1c;font-size:12.5px">{{ error() }}</div>
      }
      <button (click)="loadFromInput()" style="align-self:flex-start;background:var(--teal);color:#fff;height:34px;padding:0 18px;border-radius:7px;font-size:13px;font-weight:500;border:none;cursor:pointer">
        Load Spec
      </button>
    </div>
  }

  @if (apiInfo()) {
    <div style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">
      <!-- API header -->
      <div style="padding:14px 22px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:flex-start;gap:14px">
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700">{{ apiInfo()!.title }}</div>
          @if (apiInfo()!.version) {
            <span style="font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1px 8px;color:var(--text-muted)">v{{ apiInfo()!.version }}</span>
          }
          @if (apiInfo()!.description) {
            <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">{{ apiInfo()!.description }}</div>
          }
          @for (srv of apiInfo()!.servers; track srv) {
            <div style="font-size:11.5px;color:var(--teal);font-family:var(--font-mono)">{{ srv }}</div>
          }
        </div>
        <button (click)="apiInfo.set(null)" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;color:var(--text-muted)">
          ← Load another
        </button>
      </div>

      <!-- Endpoints -->
      <div style="flex:1;overflow-y:auto;padding:14px 22px">
        @for (group of groups(); track group.tag) {
          <div style="margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;padding:6px 0;border-bottom:1px solid var(--border)">{{ group.tag }}</div>
            @for (ep of group.items; track ep.path + ep.method) {
              <div style="margin-bottom:6px;border:1px solid var(--border);border-radius:8px;overflow:hidden">
                <div (click)="toggleEndpoint(ep)"
                  style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:var(--surface)">
                  <span [style.background]="methodBg(ep.method)"
                    style="font-size:11px;font-weight:700;color:#fff;padding:2px 8px;border-radius:5px;min-width:50px;text-align:center;letter-spacing:0.5px">
                    {{ ep.method }}
                  </span>
                  <span style="font-family:var(--font-mono);font-size:13px;color:var(--text)">{{ ep.path }}</span>
                  @if (ep.summary) {
                    <span style="font-size:12px;color:var(--text-muted)">— {{ ep.summary }}</span>
                  }
                  <dt-icon [name]="ep.expanded ? 'chevron' : 'chevron'" [size]="12" color="var(--text-faint)" />
                </div>
                @if (ep.expanded) {
                  <div style="padding:12px 14px;border-top:1px solid var(--border);background:var(--bg);display:flex;flex-direction:column;gap:10px">
                    @if (ep.description) {
                      <div style="font-size:12.5px;color:var(--text-muted)">{{ ep.description }}</div>
                    }
                    @if (ep.parameters.length > 0) {
                      <div>
                        <div style="font-size:12px;font-weight:600;margin-bottom:6px">Parameters</div>
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                          <thead>
                            <tr style="border-bottom:1px solid var(--border)">
                              <th style="text-align:left;padding:4px 8px;color:var(--text-muted)">Name</th>
                              <th style="text-align:left;padding:4px 8px;color:var(--text-muted)">In</th>
                              <th style="text-align:left;padding:4px 8px;color:var(--text-muted)">Type</th>
                              <th style="text-align:left;padding:4px 8px;color:var(--text-muted)">Required</th>
                              <th style="text-align:left;padding:4px 8px;color:var(--text-muted)">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (p of ep.parameters; track p.name) {
                              <tr style="border-bottom:1px solid var(--border)">
                                <td style="padding:4px 8px;font-family:var(--font-mono)">{{ p.name }}</td>
                                <td style="padding:4px 8px;color:var(--text-muted)">{{ p.in }}</td>
                                <td style="padding:4px 8px;color:var(--teal)">{{ p.type }}</td>
                                <td style="padding:4px 8px">{{ p.required ? '✓' : '' }}</td>
                                <td style="padding:4px 8px;color:var(--text-muted)">{{ p.description }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                    @if (ep.requestBody) {
                      <div style="font-size:12px"><strong>Request Body:</strong> <span style="color:var(--teal)">{{ ep.requestBody }}</span></div>
                    }
                    @if (ep.responses.length > 0) {
                      <div>
                        <div style="font-size:12px;font-weight:600;margin-bottom:4px">Responses</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px">
                          @for (r of ep.responses; track r.code) {
                            <div style="display:flex;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:3px 9px;font-size:11.5px">
                              <span [style.color]="r.code.startsWith('2') ? '#16a34a' : r.code.startsWith('4') ? '#dc2626' : 'var(--text-muted)'" style="font-weight:700">{{ r.code }}</span>
                              <span style="color:var(--text-muted)">{{ r.description }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  }
</div>
`
})
export class OpenapiViewerComponent {
  rawInput = '';
  apiInfo = signal<ApiInfo | null>(null);
  error = signal('');
  dragging = signal(false);
  groups = signal<Array<{ tag: string; items: PathItem[] }>>([]);

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging.set(true); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.rawInput = reader.result as string; this.loadFromInput(); };
    reader.readAsText(file);
  }

  loadFromInput() {
    this.error.set('');
    if (!this.rawInput.trim()) return;
    try {
      let parsed: Record<string, unknown>;
      if (this.rawInput.trim().startsWith('{') || this.rawInput.trim().startsWith('[')) {
        parsed = JSON.parse(this.rawInput);
      } else {
        parsed = yamlToJson(this.rawInput) as Record<string, unknown>;
      }
      const info = parseOpenApi(parsed);
      const tagMap = new Map<string, PathItem[]>();
      for (const ep of info.paths) {
        const tag = ep.tags[0] ?? 'default';
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(ep);
      }
      this.groups.set(Array.from(tagMap.entries()).map(([tag, items]) => ({ tag, items })));
      this.apiInfo.set(info);
    } catch (e: any) {
      this.error.set('Failed to parse spec: ' + (e?.message ?? String(e)));
    }
  }

  toggleEndpoint(ep: PathItem) { ep.expanded = !ep.expanded; }

  methodBg(m: string): string { return methodColor(m); }
}
