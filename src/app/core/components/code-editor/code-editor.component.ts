import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  computed,
  signal,
} from '@angular/core';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { SettingsService } from '../../services/settings.service';

/**
 * DtCodeEditorComponent — Monaco editor wrapper with theme sync.
 *
 * Editable:
 *   <dt-code-editor language="json" [value]="src" (valueChange)="src = $event" />
 *   <dt-code-editor language="json" [(value)]="src" />
 *
 * Read-only output:
 *   <dt-code-editor language="json" [value]="output()" [readOnly]="true" />
 *
 * The host element must have a definite height (flex:1, height:300px, etc).
 *
 * Design note: we bypass ngModel entirely and manage the Monaco instance
 * directly via `(onInit)`. This avoids the cursor-reset bug caused by the
 * ngModel round-trip (user types → valueChange emits → parent updates binding
 * → writeValue called → editor.setValue resets cursor to 0).
 */
@Component({
  selector: 'dt-code-editor',
  standalone: true,
  imports: [EditorComponent],
  styles: [`
    :host { display: block; width: 100%; height: 100%; overflow: hidden; }
    ngx-monaco-editor { display: block; width: 100%; height: 100%; }
  `],
  template: `
    <ngx-monaco-editor
      style="width:100%;height:100%"
      [options]="opts()"
      (onInit)="onEditorInit($event)"
    />
  `,
})
export class CodeEditorComponent implements OnChanges, OnDestroy {
  private readonly svc = inject(SettingsService);

  @Input() language = 'plaintext';
  @Input() value    = '';
  @Input() readOnly = false;
  @Output() valueChange = new EventEmitter<string>();

  // Internal signals so computed() can react to @Input changes
  private readonly _language = signal('plaintext');
  private readonly _readOnly = signal(false);

  private editor: any           = null;
  private changeSubscription: any = null;

  readonly opts = computed(() => ({
    language : this._language(),
    theme    : this.svc.effectiveTheme() === 'dark' ? 'vs-dark' : 'vs',
    readOnly : this._readOnly(),
    automaticLayout   : true,
    minimap           : { enabled: false },
    fontSize          : 12,
    fontFamily        : '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
    lineHeight        : 20,
    scrollBeyondLastLine: false,
    wordWrap          : 'on'   as const,
    contextmenu       : false,
    lineNumbers       : 'on'   as const,
    renderLineHighlight: 'line' as const,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    lineDecorationsWidth : 6,
    lineNumbersMinChars  : 3,
    padding : { top: 10, bottom: 10 },
    scrollbar: { useShadows: false, verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    bracketPairColorization: { enabled: true },
    folding : true,
  }));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['language']) this._language.set(changes['language'].currentValue ?? 'plaintext');
    if (changes['readOnly']) this._readOnly.set(!!changes['readOnly'].currentValue);

    // Push an externally changed value into the editor — but only when the
    // content actually differs, to avoid disrupting the cursor position on
    // round-trips caused by the parent re-binding our own output.
    if (changes['value'] && this.editor) {
      const incoming = changes['value'].currentValue ?? '';
      if (this.editor.getValue() !== incoming) {
        const pos = this.editor.getPosition();
        this.editor.setValue(incoming);
        if (pos) this.editor.setPosition(pos);
      }
    }
  }

  /** Called by ngx-monaco-editor after the editor instance is ready. */
  onEditorInit(editor: any): void {
    this.editor = editor;

    // Set initial value (editor starts empty)
    const initial = this.value ?? '';
    if (editor.getValue() !== initial) {
      editor.setValue(initial);
    }

    // Wire up outbound changes — dispose previous subscription first because
    // the editor is recreated whenever [options] reference changes (e.g. theme).
    this.changeSubscription?.dispose();
    this.changeSubscription = editor.onDidChangeModelContent(() => {
      if (!this.readOnly) {
        this.valueChange.emit(editor.getValue());
      }
    });
  }

  ngOnDestroy(): void {
    this.changeSubscription?.dispose();
  }
}
