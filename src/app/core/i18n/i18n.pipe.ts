import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import type { TranslationParams } from './i18n.types';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class I18nPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}

