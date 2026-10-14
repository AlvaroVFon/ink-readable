# Desktop architecture

How the Ink & Readable desktop app is put together, and how to work on it.

## Overview

The Tauri shell (Rust) is a thin supervisor: it opens the window, starts the Go
API as a **sidecar** process and stops it on exit. The React SPA is the same
bundle in dev and in the packaged app.

```text
┌─ Tauri (Rust) ─────────────────────────────────────┐
│  Webview ── loads frontend/dist (webview origin)   │
│  setup(): spawn sidecar                            │
│    ink-readable-api --desktop --port 0 --data-dir  │
│      <app-data-dir>/data                           │
│    stdout: "__INK_API_READY__ http://127.0.0.1:P"  │
│  State: apiUrl (Mutex), child (Mutex<CommandChild>)│
│  IPC: get_api_url(), open_data_dir()               │
│  exit: RunEvent::ExitRequested → child.kill()      │
└────────────────┬───────────────────────────────────┘
                 │ axios baseURL = http://127.0.0.1:P/api/v1
                 ▼
      Go API (loopback only) ──► SQLite in the data dir
```

## The sidecar handshake

`frontend/src-tauri/src/api.rs` spawns the Go binary and reads its stdout. When
the server is bound it prints exactly one canonical line:

```text
__INK_API_READY__ http://127.0.0.1:<port>
```

The shell parses that line (`parse_ready_line`) and exposes the URL to the
frontend through the `get_api_url` command. `--port 0` asks the OS for a free
port, so several instances never collide.

Bootstrap order in `frontend/src/boot.tsx`:

1. If running in Tauri, `await invoke('get_api_url')` and point axios at it
   (`setApiBaseUrl`).
2. Otherwise (browser/dev server) keep the relative `/api/v1` default, proxied
   by Vite.
3. If the backend fails to come up, show a minimal error screen with **Retry**
   and **Open data folder**.

## Data directory

Resolved by `frontend/src-tauri/src/paths.rs` (`app_data_dir().join("data")`),
which is the single source for both the sidecar `--data-dir` and the
`open_data_dir` command:

| OS      | Path                                                    |
| :------ | :------------------------------------------------------ |
| macOS   | `~/Library/Application Support/dev.inkreadable.app/data` |
| Windows | `%APPDATA%\dev.inkreadable.app\data`                    |
| Linux   | `~/.local/share/dev.inkreadable.app/data`               |

It holds `ink-readable.db` and `api.log` (the sidecar output, truncated past
5 MB).

## Security model

- The API binds to `127.0.0.1` (loopback) only: reachable from the same machine,
  never the network.
- There is **no local authentication** in v1 — the surface is a loopback port.
  This is an accepted trade-off; a token handshake is future work (see
  `docs/specs/t12-updater-signing-roadmap.md` for the broader roadmap).
- The webview loads the bundled frontend; the only IPC commands exposed are
  `get_api_url` and `open_data_dir`.
- No secrets are shipped: desktop mode reads no Vault and needs no `.env`.

## Troubleshooting

- **macOS: "…is damaged and can't be opened"** — the app is unsigned; this is
  the quarantine flag, not real corruption. Remove it and open again:

  ```bash
  xattr -dr com.apple.quarantine "/Applications/Ink and Readable.app"
  ```

  If it still refuses, `xattr -cr "/Applications/Ink and Readable.app"`.
  (Signing/notarization is planned; see `t12-updater-signing-roadmap.md`.)
- **Backend did not start** — the app shows an error screen. Use **Open data
  folder** and check `api.log` for the Go process output.
- **Reset the data** — quit the app and delete the `data` directory listed above.
- **Blank or grey window on Linux (GPU / DMA-BUF)** — WebKitGTK may fail to
  paint with `Failed to create GBM buffer of size … Invalid argument`, leaving
  the window empty even though the app is running (the DOM is fine). Force the
  fallback renderer:

  ```bash
  WEBKIT_DISABLE_DMABUF_RENDERER=1 ink-readable
  ```

- **Window does not open on Wayland** — `Gdk-Message: Error 71 (Protocol error)
  dispatching to Wayland display`. Force XWayland:

  ```bash
  GDK_BACKEND=x11 ink-readable
  ```

  On VMs and some (older) GPUs both are needed together:

  ```bash
  GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 ink-readable
  ```

  These also apply to `pnpm tauri dev`, and to the AppImage (replace
  `ink-readable` with the `.AppImage` path).
- **Missing WebKitGTK** — on Linux the build fails at `libsoup-3.0`/`webkit2gtk-4.1`;
  install the dev packages listed in the root README.

## Release

Building a release locally:

```bash
make sidecar        # host sidecar
make tauri-build    # bundles for the current OS
```

Publishing uses GitHub Actions: pushing a `desktop-v*` tag runs
`.github/workflows/release-desktop.yml`, which cross-builds the sidecar per
target, runs `tauri build` on macOS/Windows/Linux and uploads the installers to
a draft release. Signing and auto-update are not wired yet (future phase).
