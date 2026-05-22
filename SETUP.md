# DevToolbox — Setup Guide

A cross-platform developer toolkit built with **Tauri v2** (Rust backend) and **Angular 18** (frontend).

---

## Prerequisites

### 1. Node.js ≥ 18

```bash
node --version   # should be v18+
```

Install from https://nodejs.org or via `nvm`:

```bash
nvm install 20 && nvm use 20
```

### 2. Rust (stable toolchain)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup update stable
```

### 3. Tauri v2 system dependencies

**macOS** — no extra steps (Xcode Command Line Tools required):

```bash
xcode-select --install
```

**Linux (Debian/Ubuntu)**:

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Windows** — install [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (pre-installed on Windows 11) and the [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

### 4. Tauri CLI

```bash
cargo install tauri-cli --version "^2"
# or via npm:
npm install -g @tauri-apps/cli@^2
```

---

## Install dependencies

```bash
npm install
```

---

## Development

Run the app with hot-reload (Angular dev server + Tauri shell):

```bash
npm run tauri:dev
# equivalent: cargo tauri dev
```

The Angular dev server starts on `http://localhost:4200`; Tauri opens a native window pointing to it.

> **First launch tip:** The app checks for `devtoolbox-welcomed` in localStorage. If absent it shows the First Run screen. This only shows once.

---

## Production build

```bash
npm run tauri:build
```

Outputs a signed installer to `src-tauri/target/release/bundle/`:

| Platform | Format |
|----------|--------|
| macOS    | `.dmg` / `.app` |
| Windows  | `.msi` / `.exe` (NSIS) |
| Linux    | `.deb` / `.AppImage` |

---

## Angular-only build (no Tauri window)

```bash
npm run build
# or dev server only:
npm start
```

Useful for UI work without Rust compilation.

---

## Project structure

```
DevToolbox/
├── src/                          Angular app
│   ├── app/
│   │   ├── core/                 Tool catalog, icon component, services
│   │   │   ├── tool-catalog.ts   30 tool definitions
│   │   │   ├── icon.component.ts SVG icon component
│   │   │   └── services/         settings, pinned, search
│   │   ├── layout/               Shell, sidebar, topbar, command palette
│   │   ├── pages/                Home, first-run, settings, about
│   │   └── tools/                30 tool components (lazy-loaded)
│   ├── styles.css                Tailwind + CSS custom properties
│   └── index.html
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                Tauri builder + plugin setup
│   │   └── commands/
│   │       ├── image.rs          convert_image, crop_image, get_image_info
│   │       └── crypto.rs         hash_text, hash_file, compute_hmac, bcrypt_*
│   ├── Cargo.toml
│   ├── tauri.conf.json           Window config, permissions
│   └── capabilities/
│       └── default.json          Plugin permission grants
├── tailwind.config.js            Design tokens (maroon, teal palette)
└── package.json
```

---

## Tool index

| Category | Tools |
|----------|-------|
| **Text & Code** | JSON Formatter, XML Formatter, YAML Formatter, SQL Formatter, JS Beautifier, Markdown Preview, Text Diff, Text Case, Lorem Ipsum, Regex Tester |
| **Encoding** | Base64, URL Encoder, HTML Entities, JWT Decoder, Hex Converter |
| **Hashing & Crypto** | Hash (MD5/SHA), Bcrypt, UUID Generator, Password Generator, HMAC |
| **Images** | Image Converter, Image Resizer, Image Cropper, SVG Optimizer, Color Tools |
| **Web & Network** | Cron Parser, Unix Timestamp, QR Code, IP/CIDR, User Agent Parser |

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `↑` / `↓` | Navigate palette results |
| `Enter` | Open selected tool |
| `Esc` | Close palette |

---

## Notes

- **Bcrypt in browser:** The in-app bcrypt tool uses PBKDF2-SHA256 as a browser-safe substitute for preview purposes. The Tauri Rust backend (`bcrypt_hash` / `bcrypt_verify` commands) provides real bcrypt for production use — wire them up via `invoke('bcrypt_hash', { password, cost })`.

- **Image processing:** The Image Converter, Resizer, and Cropper tools call Tauri Rust commands via `@tauri-apps/api/core`'s `invoke`. The Angular components already call `invoke('convert_image', ...)` etc.

- **Theming:** The app supports light, dark, and system themes. Theme is stored in `localStorage` via `SettingsService`. CSS custom properties (`--bg`, `--text`, `--maroon`, `--teal`, etc.) are defined in `src/styles.css`.

- **CommonJS warnings:** `js-beautify` and `sql-formatter`'s `nearley` dependency are CommonJS modules. These cause build warnings but no runtime issues. Both will be replaced by ESM equivalents in a future update.
