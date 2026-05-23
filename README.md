<div align="center">
  <img
    height="150"
    width="150"
    src="https://raw.githubusercontent.com/bolorundurowb/dev-core-tools/refs/heads/master/assets/tool-icon.png"
    alt="Dev Core Logo"  />
</div>

# Dev Core Tools

Dev Core Tools is a local-first desktop app that brings everyday developer utilities into one fast, offline workspace. It combines an Angular 21 interface with a Tauri v2 shell and Rust commands for native capabilities such as image processing, hashing, and file access.

The app is designed for common "paste, inspect, convert, generate" tasks without sending data to a remote service.

## Highlights

- 40+ tools for formatting, encoding, crypto, images, networking, data conversion, and generated test data.
- Local-first workflow for sensitive snippets, tokens, images, and configuration files.
- Native desktop packaging through Tauri for Windows, macOS, and Linux.
- Angular standalone components, lazy-loaded tool routes, and Tailwind-based styling.
- Command palette, pinned tools, first-run onboarding, and light/dark/system themes.

## Tool Categories

| Category         | Examples                                                                                   |
|------------------|--------------------------------------------------------------------------------------------|
| Text & Code      | JSON, XML, YAML, SQL, JS/TS beautifier, Markdown preview, diff viewer, regex tester        |
| Encoding         | Base64, URL encoding, HTML entities, JWT decoder, hex/ASCII conversion                     |
| Hashing & Crypto | Hash generator, bcrypt, UUIDs, password generator, HMAC, RSA keys, certificates, AES       |
| Images           | Converter, resizer, cropper, SVG optimizer, color tools                                    |
| Web & Network    | Cron parser, Unix time, QR codes, IP/CIDR, user-agent parser, cURL to code, OpenAPI viewer |
| Data Transform   | CSV/JSON/XML, JSON/TOML, JSON Schema generation                                            |
| Utilities        | Unit converter, number base converter, mock data generator, string escaper                 |

## Tech Stack

- Angular 21 and TypeScript 5.9
- Tauri v2 and Rust 1.77+
- Tailwind CSS 3
- Karma and Jasmine for Angular unit tests
- Rust crates for image processing, hashing, HMAC, bcrypt, UUIDs, and Tauri plugins

## Quick Start

Prerequisites:

- Node.js 20.19+, 22.12+, or 24+
- Rust 1.77.2 or newer
- Tauri v2 system dependencies for your platform
- Tauri CLI v2 through Cargo or npm

```bash
npm install
npm run tauri:dev
```

The Angular dev server runs on `http://localhost:4200`, and Tauri opens the desktop window against that dev server.

For a browser-only development loop:

```bash
npm start
```

For production desktop bundles:

```bash
npm run tauri:build
```

Build outputs are written under `src-tauri/target/release/bundle/`.

## Common Scripts

| Command               | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| `npm start`           | Run the Angular dev server on port 4200                |
| `npm run build`       | Build the Angular frontend                             |
| `npm test`            | Run Angular unit tests with Karma/Jasmine              |
| `npm run tauri:dev`   | Run Angular and the Tauri desktop shell in development |
| `npm run tauri:build` | Build production desktop bundles                       |

## Project Layout

```text
Dev Core Tools/
├── src/                 Angular application
│   ├── app/core/        Tool catalog, shared icons, and services
│   ├── app/layout/      Shell, sidebar, topbar, and command palette
│   ├── app/pages/       Home, onboarding, settings, and about pages
│   └── app/tools/       Lazy-loaded tool components
├── src-tauri/           Tauri configuration and Rust backend commands
├── public/              Static frontend assets
└── CONTRIBUTING.md      Contributor workflow and project standards
```

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup expectations, coding conventions, checks to run, and guidance for adding new tools.

## License

Dev Core Tools is released under the MIT license.
