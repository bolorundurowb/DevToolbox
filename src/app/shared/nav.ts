/**
 * Shared navigation items used by both settings.component and about.component.
 * Each entry with `isAbout: true` links to /about; all others are settings sections.
 */
export const SETTINGS_NAV = [
  { label: 'General',    icon: 'cog' },
  { label: 'Appearance', icon: 'palette' },
  { label: 'Shortcuts',  icon: 'key' },
  { label: 'History',    icon: 'history' },
  { label: 'Advanced',   icon: 'code-bracket' },
  { label: 'About',      icon: 'information-circle', isAbout: true },
] as const;

export type SettingsNavItem = (typeof SETTINGS_NAV)[number];
