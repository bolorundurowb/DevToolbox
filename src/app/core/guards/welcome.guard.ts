import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const WELCOMED_KEY = 'dev-core-tools-welcomed';

export const welcomeGuard: CanActivateFn = () => {
  try {
    if (localStorage.getItem(WELCOMED_KEY) === '1') return true;
  } catch {
    return true;
  }

  return inject(Router).createUrlTree(['/welcome']);
};
