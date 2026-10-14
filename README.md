<h1 align="center">Ink &amp; Readable</h1>

<div align="center">
  <img src="assets/hero.png" alt="Ink & Readable — split Markdown editor with live preview" width="60%">
</div>

<p align="center">
  A calm, keyboard-first home for your Markdown notes.<br>
  Write it plain. Read it beautiful. <em>Live.</em>
</p>

<p align="center">
  Desktop app for macOS, Linux and Windows — built with Tauri 2, Go and React.
</p>

---

## Features

- **Markdown notes, organized in vaults** with a collapsible file tree, create / rename / move / trash and restore.
- **Live split preview** — edit, split or preview-only, with scroll sync between panes.
- **Editor that stays out of the way** — CodeMirror 6, optional Vim motions, relative line numbers, autosave and format-on-save.
- **GitHub-flavored Markdown** — tables, task lists, strikethrough and GitHub alerts (`> [!NOTE]`, `[!TIP]`, `[!WARNING]`…).
- **Diagrams, math and code** — Mermaid diagrams, KaTeX math (`$…$`, `$$…$$`) and syntax-highlighted code blocks with a copy button and language label.
- **Planner** — projects and a drag-and-drop Kanban task board.
- **Multi-palette theming** — several color palettes with light and dark variants.

## Tech stack

| Layer    | Choices                                                                                                       |
| :------- | :------------------------------------------------------------------------------------------------------------ |
| Shell    | [Tauri 2](https://tauri.app) — native webview + Rust core                                                     |
| Backend  | Go, `net/http`, SQLite, [sqlc](https://sqlc.dev); embedded migrations, run in-process as a Tauri sidecar      |
| Frontend | React 19, TypeScript, Vite, CodeMirror 6, Tailwind CSS 4, shadcn/ui, Vitest                                   |
| Tooling  | Make, pnpm, Oxlint / Oxfmt                                                                                     |

The Go API binary ships inside the app and is launched by the shell on startup
(`--desktop --port 0 --data-dir <app-data>`); it listens on loopback only and is
stopped when the app closes.

## Download

Installers are published to [GitHub Releases](https://github.com/AlvaroVFon/ink-readable/releases)
(`.dmg`/`.app` for macOS, `.exe`/`.msi` for Windows, `.deb`/`.rpm`/`.AppImage`
for Linux).

Releases are **not signed yet**, so the OS will warn on first launch:

- **macOS:** right-click the app → **Open** → confirm (Gatekeeper).
- **Windows:** SmartScreen → **More info** → **Run anyway**.
- **Linux:** AppImage needs `chmod +x`; `.deb`/`.rpm` install normally.

## Where your data lives

Everything is local, under the app data directory (no account, no server):

| OS      | Path                                                    |
| :------ | :------------------------------------------------------ |
| macOS   | `~/Library/Application Support/dev.inkreadable.app/data` |
| Windows | `%APPDATA%\dev.inkreadable.app\data`                    |
| Linux   | `~/.local/share/dev.inkreadable.app/data`               |

It contains `ink-readable.db` (SQLite) and `api.log` (backend output). If the app
fails to start, it offers an **Open data folder** action to inspect the log.

### Coming from the old web deployment?

The database format is the same: copy your `ink-readable.db` into the `data`
directory above. Migrations are idempotent and run on startup.

## Development

### Prerequisites

- **Rust** (stable) — <https://rustup.rs>
- **Go** (version in `backend/go.mod`)
- **Node** 24 and **pnpm** 12 (`corepack enable`)
- Linux only, WebKitGTK 4.1 dev packages. On Fedora:

  ```bash
  sudo dnf install webkit2gtk4.1-devel javascriptcoregtk4.1-devel libsoup3-devel \
    gtk3-devel librsvg2-devel openssl-devel
  ```

  (Ubuntu/Debian: `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`.)

### Run the desktop app

```bash
cd frontend && pnpm install && cd ..
make tauri-dev
```

`make tauri-dev` builds the Go sidecar for your host, then starts Vite and the
Tauri window.

### Frontend-only development (fast loop)

Run the backend and the Vite dev server separately — no Rust needed:

```bash
./scripts/run-backend-dev.sh      # Go API on :8082 (Windows: run-backend-dev.ps1)
cd frontend && pnpm dev           # http://localhost:5173
```

### Docker dev stack (optional)

```bash
make up-dev    # backend + migrations + Vite in containers
make down-dev
```

### Backend (Go) directly

```bash
make build           # build the API binary
make run             # run locally (legacy web mode; needs backend/.env)
make test            # go test ./...
make sqlc-generate   # regenerate typed queries
make migrate-up      # apply migrations with the golang-migrate CLI
make db-reset        # down -all + up
```

### Checks

```bash
make test
cd frontend && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

### Building installers

```bash
make tauri-build     # bundles for the current OS (dmg/app, msi/nsis, deb/rpm/AppImage)
make sidecar-all     # cross-compile the Go sidecar for every desktop target
```

## Release

Tag `desktop-vX.Y.Z` and push; the
[`Desktop Release`](.github/workflows/release-desktop.yml) workflow builds the
sidecar and the installers on macOS (arm64 + x86_64), Windows and Linux, and
attaches them to a **draft** GitHub Release for review.

## Project structure

```text
.
├── assets/              # Screenshots / icon source
├── backend/             # Go API: config, vaults, documents, projects, tasks, editor config
│   ├── cmd/             # entry point (desktop flags + legacy web mode)
│   ├── internal/        # domain, repositories, services, HTTP handlers
│   ├── migrations/      # versioned SQLite migrations (embedded in the binary)
│   └── sqlc/            # SQL queries and generated code
├── frontend/            # React SPA (Vite, CodeMirror, Tailwind)
│   ├── src/
│   └── src-tauri/       # Tauri shell: window, sidecar lifecycle, IPC
├── scripts/             # build-sidecar, run-backend-dev
├── docs/                # specs for the desktop migration
└── Makefile
```

See [`docs/desktop.md`](docs/desktop.md) for the desktop architecture,
[`frontend/README.md`](frontend/README.md) for the data-access layer and
[`backend/README.md`](backend/README.md) for the API architecture.
