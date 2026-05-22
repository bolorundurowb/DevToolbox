/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens — light
        'dt-bg':            '#faf8f5',
        'dt-surface':       '#ffffff',
        'dt-surface-muted': '#f3f0eb',
        'dt-text':          '#1c1a18',
        'dt-text-muted':    'rgba(28,26,24,0.65)',
        'dt-text-faint':    'rgba(28,26,24,0.42)',
        // Accents
        'maroon':           '#7a2436',
        'maroon-soft':      'rgba(122,36,54,0.10)',
        'maroon-ink':       '#5c1a28',
        'teal':             '#1c4a4f',
        'teal-soft':        'rgba(28,74,79,0.10)',
        'teal-ink':         '#143437',
        // Design tokens — dark
        'dt-dark-bg':            '#161412',
        'dt-dark-surface':       '#1c1a17',
        'dt-dark-surface-muted': '#221f1c',
        'dt-dark-text':          '#f5f1ec',
        'dt-dark-text-muted':    'rgba(245,241,236,0.62)',
        'dt-dark-text-faint':    'rgba(245,241,236,0.38)',
        'maroon-dark':      '#c14a64',
        'maroon-dark-ink':  '#e89aab',
        'teal-dark':        '#5dc2c8',
        'teal-dark-ink':    '#a8e1e5',
      },
      fontFamily: {
        ui:   ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}


