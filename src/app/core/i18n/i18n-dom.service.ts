import { Injectable, Injector, effect, inject } from '@angular/core';
import { I18nService } from './i18n.service';

const TRANSLATABLE_ATTRS = ['aria-label', 'alt', 'placeholder', 'title'];
const SKIP_TAGS = new Set(['CANVAS', 'CODE', 'DT-CODE-EDITOR', 'MONACO-EDITOR', 'PRE', 'SCRIPT', 'STYLE', 'SVG', 'TEXTAREA']);

function splitWhitespace(value: string): { leading: string; text: string; trailing: string } {
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  return {
    leading,
    text: value.trim(),
    trailing,
  };
}

@Injectable({ providedIn: 'root' })
export class I18nDomService {
  private readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);
  private readonly textSources = new WeakMap<Text, string>();
  private readonly attrSources = new WeakMap<Element, Map<string, string>>();
  private observer?: MutationObserver;
  private scheduled = false;

  /**
   * Treat rendered source text as the translation key so existing tool templates
   * are immediately localisable without a large component-by-component rewrite.
   */
  start(): void {
    if (typeof document === 'undefined' || this.observer) return;

    this.observer = new MutationObserver(() => this.scheduleTranslate());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS,
    });

    effect(
      () => {
        this.i18n.locale();
        this.scheduleTranslate();
      },
      { injector: this.injector },
    );
  }

  private scheduleTranslate(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.translateNode(document.body);
    });
  }

  private translateNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(node as Text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    if (this.shouldSkip(element)) return;

    this.translateAttributes(element);
    for (const child of Array.from(element.childNodes)) {
      this.translateNode(child);
    }
  }

  private shouldSkip(element: Element): boolean {
    if (element.closest('[data-i18n-skip]')) return true;
    return SKIP_TAGS.has(element.tagName);
  }

  private translateTextNode(node: Text): void {
    const { leading, text, trailing } = splitWhitespace(node.data);
    if (!text) return;

    const knownSource = this.textSources.get(node);
    const knownTranslation = knownSource ? this.i18n.translateText(knownSource) : undefined;
    const source = knownSource && text === knownTranslation ? knownSource : text;
    this.textSources.set(node, source);

    const translated = this.i18n.translateText(source);
    const next = `${leading}${translated}${trailing}`;
    if (node.data !== next) node.data = next;
  }

  private translateAttributes(element: Element): void {
    let sources = this.attrSources.get(element);
    if (!sources) {
      sources = new Map<string, string>();
      this.attrSources.set(element, sources);
    }

    for (const attr of TRANSLATABLE_ATTRS) {
      const current = element.getAttribute(attr);
      if (!current?.trim()) continue;

      const knownSource = sources.get(attr);
      const knownTranslation = knownSource ? this.i18n.translateText(knownSource) : undefined;
      const source = knownSource && current === knownTranslation ? knownSource : current;
      sources.set(attr, source);

      const translated = this.i18n.translateText(source);
      if (current !== translated) element.setAttribute(attr, translated);
    }
  }
}

