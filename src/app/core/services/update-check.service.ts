import { Injectable, inject, DestroyRef, effect } from '@angular/core';
import { getVersion } from '@tauri-apps/api/app';
import { SettingsService } from './settings.service';
import { ToastService } from './toast.service';

const GITHUB_REPO = 'bolorundurowb/dev-core-tools';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'dev-core-tools-last-update-check';

@Injectable({ providedIn: 'root' })
export class UpdateCheckService {
  private settingsService = inject(SettingsService);
  private toastService = inject(ToastService);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;

  constructor(private destroyRef: DestroyRef) {
    this.destroyRef.onDestroy(() => this.stop());

    effect(() => {
      const autoCheck = this.settingsService.settings().autoCheckUpdates;
      if (!this.started) return;
      if (autoCheck) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  start(): void {
    this.started = true;
    this.stop();

    if (!this.settingsService.settings().autoCheckUpdates) return;

    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const elapsed = lastCheck ? Date.now() - parseInt(lastCheck, 10) : CHECK_INTERVAL_MS + 1;

    if (elapsed >= CHECK_INTERVAL_MS) {
      this.check();
    }

    this.intervalId = setInterval(() => {
      if (this.settingsService.settings().autoCheckUpdates) {
        this.check();
      }
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async check(): Promise<void> {
    if (!this.settingsService.settings().autoCheckUpdates) return;

    try {
      const currentVersion = await getVersion();

      const includeBeta = this.settingsService.settings().includeBeta;
      const apiUrl = includeBeta
        ? `https://api.github.com/repos/${GITHUB_REPO}/releases`
        : `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

      const res = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const release = Array.isArray(data) ? data[0] : data;
      if (!release?.tag_name) return;

      const tagVersion = release.tag_name.replace(/^v/i, '');
      const isNewer = this.compareVersions(tagVersion, currentVersion) > 0;

      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      if (isNewer) {
        const releaseUrl = release.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`;
        this.toastService.show(`Dev Core Tools v${tagVersion} is available`, {
          type: 'info',
          duration: 15000,
          actionLabel: 'View release',
          actionFn: () => {
            import('@tauri-apps/plugin-shell').then(m => m.open(releaseUrl)).catch(() => { window.open(releaseUrl, '_blank'); });
          },
        });
      }
    } catch {
      // Silently fail — background checks must not disrupt the user.
    }
  }

  private compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
    const [aMaj = 0, aMin = 0, aPat = 0] = parse(a);
    const [bMaj = 0, bMin = 0, bPat = 0] = parse(b);
    if (aMaj !== bMaj) return aMaj - bMaj;
    if (aMin !== bMin) return aMin - bMin;
    return aPat - bPat;
  }
}