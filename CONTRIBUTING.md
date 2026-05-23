# Contributing to Dev Core Tools

Thanks for helping improve Dev Core Tools. This project is a local-first desktop toolkit built with Angular, Tauri, and Rust, so contributions should keep the app fast, private, and easy to use offline.

## Getting Started

1. Fork or clone the repository.
2. Follow the quick start and prerequisites in [README.md](README.md).
3. Install dependencies from the repository root:

```bash
npm install
```

4. Start the desktop development app:

```bash
npm run tauri:dev
```

For Angular-only UI work, `npm start` is usually enough.

## Contribution Workflow

1. Create a focused branch for your change.
2. Keep each change scoped to one feature, bug fix, or documentation improvement.
3. Update docs when behavior, setup steps, shortcuts, or tool availability changes.
4. Run the relevant checks before opening a pull request.
5. Describe what changed, why it changed, and how you tested it.

## Checks

Run the checks that match the files you touched.

```bash
npm test
npm run build
```

For Rust or Tauri command changes:

```bash
cd src-tauri
cargo check
cargo test
```

If a check cannot be run locally, call that out in your pull request and explain why.

## Coding Standards

- Prefer existing Angular standalone component patterns and lazy-loaded routes.
- Keep tool logic close to the tool component unless it is shared by multiple tools.
- Use services in `src/app/core/services/` for shared app behavior such as settings, search, and pinned tools.
- Keep sensitive data local. Do not introduce telemetry, remote processing, or network calls without a clear reason and documentation.
- Avoid adding large dependencies when a small local implementation or existing dependency is enough.
- Preserve keyboard accessibility and clear focus states for interactive UI.
- Keep styling aligned with `src/styles.css` and `tailwind.config.js`.

## Adding a Tool

When adding a new utility:

1. Add the tool component under `src/app/tools/<tool-name>/`.
2. Register the route in `src/app/app.routes.ts`.
3. Add catalog metadata and search keywords in `src/app/core/tool-catalog.ts`.
4. Use Tauri `invoke` only when the tool needs native capabilities.
5. Add or update tests when the tool has non-trivial parsing, conversion, or validation logic.
6. Update `README.md` if the tool changes the project feature list or category coverage.

## Rust and Tauri Changes

- Register new commands in `src-tauri/src/lib.rs`.
- Place command implementations under `src-tauri/src/commands/`.
- Keep command inputs and outputs serializable with `serde`.
- Return useful errors instead of panicking on invalid user input.
- Update Tauri capabilities or permissions when a plugin or command requires new access.

## Documentation

Use the docs this way:

- `README.md` explains what Dev Core Tools is and how to get started quickly.
- `CONTRIBUTING.md` explains how to work on the project.

Keep documentation concise, current, and consistent with the scripts in `package.json`.

## Security and Privacy

Dev Core Tools is intended for local developer workflows. Treat pasted text, tokens, certificates, keys, and images as sensitive data.

- Do not log secrets or file contents unnecessarily.
- Do not add analytics or remote APIs without explicit project approval.
- Prefer local parsing and conversion.
- Report security concerns privately instead of opening a public issue with exploit details.

## Pull Request Checklist

- The change is focused and described clearly.
- Relevant docs are updated.
- Relevant tests or builds were run.
- New dependencies are justified.
- UI changes were checked in light and dark themes when applicable.
- Native changes were checked on the target platform when possible.
