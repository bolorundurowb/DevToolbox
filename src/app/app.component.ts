import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nDomService } from './core/i18n/i18n-dom.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: `<router-outlet />`
})
export class AppComponent {
  constructor() {
    inject(I18nDomService).start();
  }
}
