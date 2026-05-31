import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  actionFn?: () => void;
  type: 'info' | 'success' | 'warning' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private counter = 0;

  show(message: string, options?: {
    type?: Toast['type'];
    duration?: number;
    actionLabel?: string;
    actionFn?: () => void;
  }): void {
    const id = ++this.counter;
    const type = options?.type ?? 'info';
    const duration = options?.duration ?? 8000;

    const toast: Toast = {
      id,
      message,
      type,
      actionLabel: options?.actionLabel,
      actionFn: options?.actionFn,
    };

    this._toasts.update(t => [...t, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}