/**
 * Type shim for @tauri-apps/plugin-autostart.
 * Replaced by real declarations once `npm install @tauri-apps/plugin-autostart` is run.
 */
declare module '@tauri-apps/plugin-autostart' {
  export function enable(): Promise<void>;
  export function disable(): Promise<void>;
  export function isEnabled(): Promise<boolean>;
}
