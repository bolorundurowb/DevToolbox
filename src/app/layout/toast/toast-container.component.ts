import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../core/services/toast.service';
import { IconComponent } from '../../core/icon.component';

@Component({
  selector: 'dt-toast-container',
  imports: [IconComponent],
  template: `
    <div style="position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:380px">
      @for (toast of toasts(); track toast.id) {
        <div style="pointer-events:auto;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--border);box-shadow:0 8px 24px rgba(0,0,0,.18);animation:toast-in .25s ease;font-family:var(--font-ui);font-size:13px;color:var(--text)">
          @switch (toast.type) {
            @case ('error') {
              <dt-icon name="x-circle" [size]="16" color="#c0392b" />
            }
            @case ('success') {
              <dt-icon name="check-circle" [size]="16" color="var(--teal)" />
            }
            @case ('warning') {
              <dt-icon name="exclamation-triangle" [size]="16" color="var(--gold)" />
            }
            @default {
              <dt-icon name="information-circle" [size]="16" color="var(--maroon)" />
            }
          }
          <span style="flex:1">{{ toast.message }}</span>
          @if (toast.actionLabel && toast.actionFn) {
            <button (click)="toast.actionFn!()"
              style="padding:4px 10px;border-radius:6px;background:var(--maroon);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-ui);white-space:nowrap">
              {{ toast.actionLabel }}
            </button>
          }
          <button (click)="svc.dismiss(toast.id)"
            style="padding:2px;border:none;background:none;cursor:pointer;color:var(--text-muted);line-height:1;flex-shrink:0">
            <dt-icon name="x" [size]="14" color="var(--text-muted)" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;
  readonly svc = this.toastService;

  iconFor(toast: Toast): string {
    switch (toast.type) {
      case 'error': return 'x-circle';
      case 'success': return 'check-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'information-circle';
    }
  }
}