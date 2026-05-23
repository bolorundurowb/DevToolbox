import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { IconComponent } from '../../core/icon.component';

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  auth: { user: string; pass: string } | null;
  insecure: boolean;
  compressed: boolean;
}

function parseCurl(cmd: string): ParsedCurl {
  const result: ParsedCurl = { url: '', method: 'GET', headers: {}, body: null, auth: null, insecure: false, compressed: false };
  // Normalize line continuations
  const normalized = cmd.replace(/\\\s*\n\s*/g, ' ').trim();
  // Tokenize respecting quotes
  const tokens: string[] = [];
  let i = 0;
  while (i < normalized.length) {
    while (i < normalized.length && normalized[i] === ' ') i++;
    if (i >= normalized.length) break;
    let token = '';
    if (normalized[i] === '"' || normalized[i] === "'") {
      const q = normalized[i++];
      while (i < normalized.length && normalized[i] !== q) {
        if (normalized[i] === '\\' && i + 1 < normalized.length) { i++; token += normalized[i]; }
        else token += normalized[i];
        i++;
      }
      i++; // closing quote
    } else {
      while (i < normalized.length && normalized[i] !== ' ') token += normalized[i++];
    }
    tokens.push(token);
  }

  let j = 0;
  while (j < tokens.length) {
    const t = tokens[j];
    if (t === 'curl') { j++; continue; }
    if (t === '-X' || t === '--request') { result.method = tokens[++j] || 'GET'; j++; continue; }
    if (t === '-H' || t === '--header') {
      const h = tokens[++j] || '';
      const ci = h.indexOf(':');
      if (ci > 0) result.headers[h.slice(0, ci).trim()] = h.slice(ci + 1).trim();
      j++; continue;
    }
    if (t === '--data' || t === '-d' || t === '--data-raw' || t === '--data-binary') {
      result.body = tokens[++j] || '';
      if (result.method === 'GET') result.method = 'POST';
      j++; continue;
    }
    if (t === '-u' || t === '--user') {
      const uv = tokens[++j] || '';
      const ci = uv.indexOf(':');
      result.auth = ci > 0 ? { user: uv.slice(0, ci), pass: uv.slice(ci + 1) } : { user: uv, pass: '' };
      j++; continue;
    }
    if (t === '--insecure' || t === '-k') { result.insecure = true; j++; continue; }
    if (t === '--compressed') { result.compressed = true; j++; continue; }
    if (!t.startsWith('-') && !result.url) { result.url = t; }
    j++;
  }

  if (result.auth) {
    const encoded = btoa(`${result.auth.user}:${result.auth.pass}`);
    result.headers['Authorization'] = `Basic ${encoded}`;
  }

  return result;
}

function isJsonBody(body: string | null): boolean {
  if (!body) return false;
  try { JSON.parse(body); return true; } catch { return false; }
}

function toFetch(p: ParsedCurl): string {
  const lines: string[] = [];
  const headersEntries = Object.entries(p.headers);
  const bodyIsJson = isJsonBody(p.body);
  lines.push('const response = await fetch(' + JSON.stringify(p.url) + ', {');
  lines.push(`  method: '${p.method}',`);
  if (headersEntries.length) {
    lines.push('  headers: {');
    headersEntries.forEach(([k, v]) => lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)},`));
    lines.push('  },');
  }
  if (p.body) {
    if (bodyIsJson) lines.push(`  body: JSON.stringify(${p.body}),`);
    else lines.push(`  body: ${JSON.stringify(p.body)},`);
  }
  lines.push('});');
  lines.push('const data = await response.json();');
  lines.push('console.log(data);');
  return lines.join('\n');
}

function toAxios(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push("import axios from 'axios';");
  lines.push('');
  lines.push('const response = await axios({');
  lines.push(`  method: '${p.method.toLowerCase()}',`);
  lines.push(`  url: ${JSON.stringify(p.url)},`);
  if (Object.keys(p.headers).length) {
    lines.push('  headers: {');
    Object.entries(p.headers).forEach(([k, v]) => lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)},`));
    lines.push('  },');
  }
  if (p.body) {
    if (bodyIsJson) lines.push(`  data: ${p.body},`);
    else lines.push(`  data: ${JSON.stringify(p.body)},`);
  }
  lines.push('});');
  lines.push('console.log(response.data);');
  return lines.join('\n');
}

function toPython(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push('import requests');
  lines.push('');
  if (Object.keys(p.headers).length) {
    lines.push('headers = {');
    Object.entries(p.headers).forEach(([k, v]) => lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)},`));
    lines.push('}');
    lines.push('');
  }
  const method = p.method.toLowerCase();
  const headersArg = Object.keys(p.headers).length ? ', headers=headers' : '';
  let bodyArg = '';
  if (p.body) bodyArg = bodyIsJson ? `, json=${p.body.replace(/"/g, "'")}` : `, data=${JSON.stringify(p.body)}`;
  const verifyArg = p.insecure ? ', verify=False' : '';
  lines.push(`response = requests.${method}(${JSON.stringify(p.url)}${headersArg}${bodyArg}${verifyArg})`);
  lines.push('print(response.json())');
  return lines.join('\n');
}

function toGo(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('\t"fmt"');
  lines.push('\t"net/http"');
  if (p.body) lines.push('\t"strings"');
  lines.push('\t"io"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  if (p.body) {
    lines.push(`\tbody := strings.NewReader(${JSON.stringify(p.body)})`);
    lines.push(`\treq, _ := http.NewRequest("${p.method}", ${JSON.stringify(p.url)}, body)`);
  } else {
    lines.push(`\treq, _ := http.NewRequest("${p.method}", ${JSON.stringify(p.url)}, nil)`);
  }
  Object.entries(p.headers).forEach(([k, v]) => lines.push(`\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})`));
  if (bodyIsJson) lines.push('\treq.Header.Set("Content-Type", "application/json")');
  lines.push('\tclient := &http.Client{}');
  lines.push('\tresp, err := client.Do(req)');
  lines.push('\tif err != nil { panic(err) }');
  lines.push('\tdefer resp.Body.Close()');
  lines.push('\tbody2, _ := io.ReadAll(resp.Body)');
  lines.push('\tfmt.Println(string(body2))');
  lines.push('}');
  return lines.join('\n');
}

function toCsharp(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push('using System;');
  lines.push('using System.Net.Http;');
  lines.push('using System.Net.Http.Headers;');
  if (p.body) lines.push('using System.Text;');
  lines.push('using System.Threading.Tasks;');
  lines.push('');
  lines.push('class Program {');
  lines.push('  static async Task Main() {');
  if (p.insecure) {
    lines.push('    var handler = new HttpClientHandler {');
    lines.push('      ServerCertificateCustomValidationCallback = (_, _, _, _) => true');
    lines.push('    };');
    lines.push('    using var client = new HttpClient(handler);');
  } else {
    lines.push('    using var client = new HttpClient();');
  }
  // Set headers (except Content-Type, handled separately)
  const nonContentHeaders = Object.entries(p.headers).filter(([k]) => k.toLowerCase() !== 'content-type');
  nonContentHeaders.forEach(([k, v]) => {
    lines.push(`    client.DefaultRequestHeaders.Add(${JSON.stringify(k)}, ${JSON.stringify(v)});`);
  });
  if (p.body) {
    const mediaType = bodyIsJson ? 'application/json' : (p.headers['Content-Type'] ?? 'text/plain');
    lines.push(`    var content = new StringContent(${JSON.stringify(p.body)}, Encoding.UTF8, ${JSON.stringify(mediaType)});`);
  }
  const method = p.method.charAt(0) + p.method.slice(1).toLowerCase();
  if (p.method === 'GET' || p.method === 'DELETE') {
    lines.push(`    var response = await client.${method}Async(${JSON.stringify(p.url)});`);
  } else if (p.method === 'POST' || p.method === 'PUT' || p.method === 'PATCH') {
    lines.push(`    var response = await client.${method}Async(${JSON.stringify(p.url)}, content);`);
  } else {
    lines.push(`    var request = new HttpRequestMessage(new HttpMethod("${p.method}"), ${JSON.stringify(p.url)});`);
    if (p.body) lines.push('    request.Content = content;');
    lines.push('    var response = await client.SendAsync(request);');
  }
  lines.push('    var body = await response.Content.ReadAsStringAsync();');
  lines.push('    Console.WriteLine(body);');
  lines.push('  }');
  lines.push('}');
  return lines.join('\n');
}

function toJava(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push('import okhttp3.*;');
  lines.push('import java.io.IOException;');
  lines.push('');
  lines.push('public class Main {');
  lines.push('  public static void main(String[] args) throws IOException {');
  lines.push('    OkHttpClient client = new OkHttpClient();');
  if (p.body) {
    const mediaType = bodyIsJson ? 'application/json' : (p.headers['Content-Type'] ?? 'text/plain');
    lines.push(`    MediaType mediaType = MediaType.parse(${JSON.stringify(mediaType)});`);
    lines.push(`    RequestBody body = RequestBody.create(${JSON.stringify(p.body)}, mediaType);`);
  }
  lines.push('    Request request = new Request.Builder()');
  lines.push(`      .url(${JSON.stringify(p.url)})`);
  if (p.body) {
    lines.push(`      .method(${JSON.stringify(p.method)}, body)`);
  } else if (p.method !== 'GET') {
    lines.push(`      .method(${JSON.stringify(p.method)}, null)`);
  }
  // Headers (skip Content-Type if body already sets it)
  Object.entries(p.headers).forEach(([k, v]) => {
    if (p.body && k.toLowerCase() === 'content-type') return;
    lines.push(`      .addHeader(${JSON.stringify(k)}, ${JSON.stringify(v)})`);
  });
  lines.push('      .build();');
  lines.push('    try (Response response = client.newCall(request).execute()) {');
  lines.push('      System.out.println(response.body().string());');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  return lines.join('\n');
}

function toKotlin(p: ParsedCurl): string {
  const lines: string[] = [];
  const bodyIsJson = isJsonBody(p.body);
  lines.push('import okhttp3.*');
  lines.push('import okhttp3.MediaType.Companion.toMediaType');
  if (p.body) lines.push('import okhttp3.RequestBody.Companion.toRequestBody');
  lines.push('');
  lines.push('fun main() {');
  lines.push('    val client = OkHttpClient()');
  if (p.body) {
    const mediaType = bodyIsJson ? 'application/json' : (p.headers['Content-Type'] ?? 'text/plain');
    lines.push(`    val mediaType = ${JSON.stringify(mediaType)}.toMediaType()`);
    lines.push(`    val body = ${JSON.stringify(p.body)}.toRequestBody(mediaType)`);
  }
  lines.push('    val request = Request.Builder()');
  lines.push(`        .url(${JSON.stringify(p.url)})`);
  if (p.body) {
    lines.push(`        .method(${JSON.stringify(p.method)}, body)`);
  } else if (p.method !== 'GET') {
    lines.push(`        .method(${JSON.stringify(p.method)}, null)`);
  }
  Object.entries(p.headers).forEach(([k, v]) => {
    if (p.body && k.toLowerCase() === 'content-type') return;
    lines.push(`        .addHeader(${JSON.stringify(k)}, ${JSON.stringify(v)})`);
  });
  lines.push('        .build()');
  lines.push('    client.newCall(request).execute().use { response ->');
  lines.push('        println(response.body!!.string())');
  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}

function toPhp(p: ParsedCurl): string {
  const lines: string[] = [];
  lines.push('<?php');
  lines.push('$ch = curl_init();');
  lines.push(`curl_setopt($ch, CURLOPT_URL, ${JSON.stringify(p.url)});`);
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');
  if (p.method !== 'GET') lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${p.method}");`);
  if (Object.keys(p.headers).length) {
    const hdrs = Object.entries(p.headers).map(([k, v]) => `"${k}: ${v}"`).join(', ');
    lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [${hdrs}]);`);
  }
  if (p.body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, ${JSON.stringify(p.body)});`);
  if (p.insecure) lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);');
  lines.push('$response = curl_exec($ch);');
  lines.push('curl_close($ch);');
  lines.push('echo $response;');
  return lines.join('\n');
}

@Component({
    selector: 'dt-tool-curl-to-code',
    imports: [FormsModule, TopbarComponent, IconComponent],
    styles: [`:host{display:flex;flex-direction:column;flex:1;min-height:0}`],
    template: `
<div style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
  <dt-topbar [crumbs]="['Web & Network', 'cURL to Code']" [toolId]="'curl'" />
  <div style="display:flex;align-items:center;gap:12px;padding:16px 22px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--maroon-soft);display:grid;place-items:center">
      <dt-icon name="terminal" [size]="16" color="var(--maroon)" />
    </div>
    <div>
      <div style="font-size:15.5px;font-weight:600">cURL to Code</div>
      <div style="font-size:12px;color:var(--text-muted)">Convert curl commands to fetch, axios, Python, Go, PHP, C#, Java, Kotlin</div>
    </div>
  </div>

  <!-- cURL input -->
  <div style="padding:14px 22px;border-bottom:1px solid var(--border);flex-shrink:0">
    <textarea [(ngModel)]="curlInput" (ngModelChange)="convert()" rows="4"
      placeholder="curl -X POST https://api.example.com/users \&#10;  -H 'Content-Type: application/json' \&#10;  -d '{&quot;name&quot;:&quot;Alice&quot;}'"
      style="width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.5;outline:none"></textarea>
    @if (parsed()) {
      <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <span style="font-size:11.5px;color:var(--text-faint)"><strong>Method:</strong> {{ parsed()!.method }}</span>
        <span style="font-size:11.5px;color:var(--text-faint)"><strong>URL:</strong> {{ parsed()!.url }}</span>
        @if (parsed()!.auth) {
          <span style="font-size:11.5px;color:var(--text-faint)"><strong>Auth:</strong> Basic {{ parsed()!.auth!.user }}</span>
        }
        @if (parsed()!.insecure) {
          <span style="font-size:11.5px;color:#f59e0b"><strong>⚠ Insecure (no TLS verify)</strong></span>
        }
      </div>
    }
  </div>

  <!-- Language tabs -->
  <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto">
    @for (tab of tabs; track tab.key) {
      <button (click)="activeTab.set(tab.key)"
        [style.border-bottom]="activeTab()===tab.key ? '2px solid var(--maroon)' : '2px solid transparent'"
        [style.color]="activeTab()===tab.key ? 'var(--maroon)' : 'var(--text-muted)'"
        style="padding:9px 14px;font-size:12.5px;font-weight:500;background:transparent;border:none;border-top:none;border-left:none;border-right:none;cursor:pointer;white-space:nowrap">
        {{ tab.label }}
      </button>
    }
    <div style="flex:1"></div>
    @if (currentCode()) {
      <button (click)="copyCode()" style="margin:6px 14px;background:transparent;border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11.5px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px">
        <dt-icon [name]="copied() ? 'check' : 'clipboard'" [size]="11" color="var(--text-muted)" />
        {{ copied() ? 'Copied!' : 'Copy' }}
      </button>
    }
  </div>

  @if (error()) {
    <div style="margin:10px 22px;padding:8px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:12px">{{ error() }}</div>
  }

  <textarea readonly [value]="currentCode()"
    style="flex:1;resize:none;border:none;outline:none;padding:16px 22px;font-family:var(--font-mono);font-size:12.5px;background:var(--surface);color:var(--text);line-height:1.6;min-height:0"></textarea>
</div>
`
})
export class CurlToCodeComponent {
  tabs = [
    { key: 'fetch',  label: 'fetch (JS)'       },
    { key: 'axios',  label: 'axios (JS)'        },
    { key: 'python', label: 'Python requests'   },
    { key: 'go',     label: 'Go net/http'       },
    { key: 'php',    label: 'PHP curl'          },
    { key: 'csharp', label: 'C# HttpClient'     },
    { key: 'java',   label: 'Java OkHttp'       },
    { key: 'kotlin', label: 'Kotlin OkHttp'     },
  ];
  activeTab = signal('fetch');
  curlInput = '';
  parsed = signal<ParsedCurl | null>(null);
  codes: Record<string, string> = {};
  error = signal('');
  copied = signal(false);

  currentCode = computed(() => this.codes[this.activeTab()] ?? '');

  convert() {
    this.error.set('');
    if (!this.curlInput.trim()) { this.parsed.set(null); this.codes = {}; return; }
    try {
      const p = parseCurl(this.curlInput.trim());
      if (!p.url) { this.error.set('Could not parse URL from curl command.'); return; }
      this.parsed.set(p);
      this.codes = {
        fetch:  toFetch(p),
        axios:  toAxios(p),
        python: toPython(p),
        go:     toGo(p),
        php:    toPhp(p),
        csharp: toCsharp(p),
        java:   toJava(p),
        kotlin: toKotlin(p),
      };
    } catch (e: any) {
      this.error.set('Parse error: ' + (e?.message ?? String(e)));
    }
  }

  copyCode() {
    navigator.clipboard.writeText(this.currentCode()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
