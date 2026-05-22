import { Component, input, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const PATHS: Record<string, string> = {
  search: `<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11 11l4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  home: `<path d="M2 8l6-5 6 5v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  star: `<path d="M8 1.5l2 4.4 4.8.6-3.5 3.3.9 4.7L8 12.2 3.8 14.5l.9-4.7L1.2 6.5 6 5.9 8 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  clock: `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  settings: `<circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  cog: `<circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  plug: `<path d="M5 1v3M11 1v3M3.5 4h9v3a4.5 4.5 0 01-9 0V4zM8 11.5V15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  braces: `<path d="M5.5 1.5h-1A1.5 1.5 0 003 3v3.5L1.5 8 3 9.5V13a1.5 1.5 0 001.5 1.5h1M10.5 1.5h1A1.5 1.5 0 0113 3v3.5L14.5 8 13 9.5V13a1.5 1.5 0 01-1.5 1.5h-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  code: `<path d="M5 4L1.5 8 5 12M11 4l3.5 4-3.5 4M9.5 3l-3 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: `<rect x="3" y="7" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5.5 7V4.5a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  hash: `<path d="M3 6h10M3 10h10M6 2l-1.5 12M11.5 2L10 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  image: `<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5.5" cy="6" r="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2 11l3.5-3 3 2.5 2-1.5L14 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  globe: `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M1.5 8h13M8 1.5c2 2 3 4 3 6.5s-1 4.5-3 6.5c-2-2-3-4-3-6.5s1-4.5 3-6.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  chevron: `<path d="M5 3l4 5-4 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevronDown: `<path d="M3 5l5 4 5-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  plus: `<path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  copy: `<rect x="5" y="5" width="9" height="9" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2 11V3a1 1 0 011-1h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  download: `<path d="M8 2v9M4 7.5L8 11l4-3.5M2 13.5h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  upload: `<path d="M8 11V2M4 5.5L8 2l4 3.5M2 13.5h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  trash: `<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9.5a1 1 0 001 1h4.8a1 1 0 001-1L12 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  history: `<path d="M2 8a6 6 0 106-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2 2v3h3M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  moon: `<path d="M13.5 9.5A5.5 5.5 0 016.5 2.5 6 6 0 1013.5 9.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  sun: `<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  crop: `<path d="M4 1v11h11M1 4h11v11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  resize: `<path d="M2 6V2h4M14 10v4h-4M2 14l5-5M14 2L9 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  sliders: `<path d="M2 4h6M11 4h3M2 8h3M8 8h6M2 12h8M13 12h1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="9.5" cy="4" r="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="6.5" cy="8" r="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="11.5" cy="12" r="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>`,
  type: `<path d="M3 3h10M8 3v11M5.5 14h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  palette: `<path d="M8 1.5a6.5 6.5 0 100 13c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.4-.4-.8-.4-1.2 0-.8.7-1.5 1.5-1.5h1.5A2.8 2.8 0 0014.5 6 6.5 6.5 0 008 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.5" cy="7" r=".9" fill="currentColor"/><circle cx="7" cy="4.5" r=".9" fill="currentColor"/><circle cx="10.5" cy="5" r=".9" fill="currentColor"/>`,
  qr: `<rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="9.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="1.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9.5 9.5h2v2h2v-2h1M9.5 12.5v2M12.5 14.5h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  regex: `<path d="M8 2v6M5.5 3.5l5 3M5.5 6.5l5-3M2 11h2v2H2zM8 11h2v2H8zM14 11h-2v2h2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  diff: `<path d="M3 8l3-3v6L3 8zM13 8l-3 3V5l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  key: `<circle cx="5" cy="11" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.2 8.8L14 2M11 5l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  fingerprint: `<path d="M3 11c.5-.7.8-1.6.8-2.5 0-2.4 1.9-4.3 4.2-4.3s4.2 1.9 4.2 4.3M5.5 13c.4-.8.6-1.7.6-2.6 0-1.1.8-1.9 1.9-1.9s1.9.8 1.9 1.9c0 .6.2 1.2.5 1.7M8 8.5v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  terminal: `<path d="M2 4l4 4-4 4M8 12h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  rocket: `<path d="M8 14l-3-3 1-3.5C7 5 9 3 12 2c.5 2.5-.5 5-2 6L6.5 10 8 14z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="6" r=".8" fill="currentColor"/>`,
  cube: `<path d="M8 1.5L14 5v6L8 14.5 2 11V5l6-3.5zM8 8L2 5M8 8l6-3M8 8v6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  layers: `<path d="M8 1.5L14.5 5 8 8.5 1.5 5 8 1.5zM2 8l6 3.5L14 8M2 11l6 3.5L14 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  play: `<path d="M4.5 2.5l8 5.5-8 5.5V2.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  spinner: `<path d="M8 1.5a6.5 6.5 0 11-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  dot: `<circle cx="8" cy="8" r="2" fill="currentColor"/>`,
  cmdk: `<rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 6l2 2-2 2M8 10h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  eye: `<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>`,
  check: `<path d="M2.5 8l4 4 7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  x: `<path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'alert-circle': `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 5v3.5M8 11v.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,

  // New icons
  'lock-closed': `<rect x="3" y="7" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5.5 7V4.5a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'arrow-path': `<path d="M2.5 8A5.5 5.5 0 0113.5 8M2.5 8c0-1.5.5-2.9 1.4-4M2.5 8H5.5M13.5 8c0 1.5-.5 2.9-1.4 4M13.5 8h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'shield-check': `<path d="M8 1.5L2 4.5v3.7c0 3.2 2.6 5.5 6 6.3 3.4-.8 6-3.1 6-6.3V4.5L8 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5.5 8.5l1.8 1.8 3-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'shield-exclamation': `<path d="M8 1.5L2 4.5v3.7c0 3.2 2.6 5.5 6 6.3 3.4-.8 6-3.1 6-6.3V4.5L8 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 5.5V9M8 11v.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'information-circle': `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 11V7.5M8 5.5V5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'eye-slash': `<path d="M2 2l12 12M1.5 8c.5-.8 1.3-1.7 2.3-2.5M7 4.1c.3 0 .7-.1 1-.1 4 0 6.5 4 6.5 4-.5.9-1.2 1.8-2 2.5M6 10.5C4.3 9.6 2.5 8 1.5 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'code-bracket-square': `<rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 5.5L3.5 8l2 2.5M10.5 5.5L12.5 8l-2 2.5M9.5 5l-3 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  hashtag: `<path d="M3 6h10M3 10h10M6 2l-1.5 12M11.5 2L10 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  clipboard: `<path d="M6 3H4.5A1.5 1.5 0 003 4.5v8A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0011.5 3H10M6 3V2h4v1M6 3h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'clipboard-document': `<path d="M6 3H4.5A1.5 1.5 0 003 4.5v8A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0011.5 3H10M6 3V2h4v1M6 3h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'check-circle': `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 8l2.5 2.5 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'x-circle': `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'arrow-up-tray': `<path d="M8 11V2M4 5.5L8 2l4 3.5M2 13.5h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'code-bracket': `<path d="M5 4L1.5 8 5 12M11 4l3.5 4-3.5 4M9.5 3l-3 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  document: `<path d="M4 1.5h5.5L13 4.5v10H4V1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 1.5V5H13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  'finger-print': `<path d="M3 11c.5-.7.8-1.6.8-2.5 0-2.4 1.9-4.3 4.2-4.3s4.2 1.9 4.2 4.3M5.5 13c.4-.8.6-1.7.6-2.6 0-1.1.8-1.9 1.9-1.9s1.9.8 1.9 1.9c0 .6.2 1.2.5 1.7M8 8.5v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  identification: `<rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.5" cy="7" r="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 11c0-1.1.9-2 2-2s2 .9 2 2M9 7h4M9 9h2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  link: `<path d="M7 9.5a2.5 2.5 0 003 .5l2-2a2.5 2.5 0 00-3.5-3.5L7 6M9 6.5a2.5 2.5 0 00-3-.5L4 8a2.5 2.5 0 003.5 3.5L9 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  bookmark: `<path d="M3.5 2h9v12.5L8 12 3.5 14.5V2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'bookmark-solid': `<path d="M3.5 2h9v12.5L8 12 3.5 14.5V2z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  pin: `<path d="M8 13.5V8M5 7V4.5A1 1 0 016 3.5h4a1 1 0 011 1V7l1.5 1.5h-9L5 7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  'pin-solid': `<path d="M8 13.5V8M5 7V4.5A1 1 0 016 3.5h4a1 1 0 011 1V7l1.5 1.5h-9L5 7z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

@Component({
  selector: 'dt-icon',
  standalone: true,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 16 16" [style.color]="color()" style="flex-shrink:0;display:block" [innerHTML]="path()"></svg>`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(16);
  readonly color = input<string>('currentColor');
  private san = inject(DomSanitizer);
  readonly path = computed((): SafeHtml => this.san.bypassSecurityTrustHtml(PATHS[this.name()] ?? PATHS['dot']));
}
