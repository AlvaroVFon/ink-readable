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

The sidecar is stopped on two paths: a clean quit kills it from the shell
(`RunEvent::ExitRequested` → `api::shutdown`), and on Linux the sidecar arms
`PR_SET_PDEATHSIG(SIGTERM)` at startup (`backend/cmd/pdeathsig_linux.go`) so a
shell crash — like the WebKitGTK Wayland abort — cannot leave it orphaned.

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
  `get_api_url`, `open_data_dir`, `export_markdown`, `print_webview`,
  `stop_backend` and `restart_app` (the last two drive in-app updates), plus the
  updater plugin's default permissions.
- Updates are verified against the updater public key in `tauri.conf.json`
  before being installed; an artifact not signed with the matching private key
  is rejected.
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

  On Linux the app now applies both (`GDK_BACKEND=x11` and
  `WEBKIT_DISABLE_DMABUF_RENDERER=1`) at startup — see
  `frontend/src-tauri/src/platform.rs` — so the bare `ink-readable` command
  works on affected machines. Exporting either variable yourself still wins, so
  the commands above are only needed to override the default (for example to
  force native Wayland).

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

Publishing uses GitHub Actions (`.github/workflows/release-desktop.yml`). The
normal path is the manual **Desktop Release** workflow: **Run workflow** and
pick a `patch`/`minor`/`major` bump. A `bump` job updates the version in
`tauri.conf.json`, `Cargo.toml` and `Cargo.lock`, commits it to `main` and
pushes the `desktop-v<version>` tag; the matrix then cross-builds the sidecar
per target, runs `tauri build` on macOS/Windows/Linux and uploads the signed
installers. Pushing a `desktop-v*` tag by hand still works and runs the same
matrix (see *Shipping an update*). OS code-signing
(notarization/Authenticode) is not wired yet (future phase).

## Updates

On startup the app checks
`https://github.com/AlvaroVFon/ink-readable/releases/latest/download/latest.json`
(`src/components/updater/update-notifier.tsx`). If a newer version is published
it shows a toast with **Update now**: the app downloads the update, stops the Go
sidecar (`stop_backend`, so the Windows installer can replace its binary),
installs it and relaunches (`restart_app`). Check failures (offline, no
published release) are ignored silently.

### One-time setup

1. Generate the updater key pair (keep the private key out of the repo):

   ```bash
   cd frontend && pnpm tauri signer generate -w ~/.tauri/ink-readable.key
   ```

2. Put the contents of `~/.tauri/ink-readable.key.pub` in
   `plugins.updater.pubkey` (`frontend/src-tauri/tauri.conf.json`).
3. Add the repo secrets `TAURI_SIGNING_PRIVATE_KEY` (contents of the private
   key) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Without them the release
   build fails, because `bundle.createUpdaterArtifacts` is on.

Losing the private key means installed apps can no longer verify updates; users
would have to reinstall manually.

### Shipping an update

**Manually (recommended).** Run the **Desktop Release** workflow from the
Actions tab (**Run workflow**) and pick the bump type. The `bump` job updates
`tauri.conf.json`, `Cargo.toml` and `Cargo.lock`, commits the bump to `main`
and pushes the `desktop-v<version>` tag; the matrix builds and signs every
target and `updater-manifest` attaches `latest.json`. Leave **publish** on to
publish the release in the same run (the updater then sees it); turn it off to
review the draft first.

**From a tag.** Bump the three files yourself, merge to `main`, push a
`desktop-v*` tag; the same matrix runs, but the release stays a draft until you
publish it.

Either way `releases/latest/download/latest.json` only resolves to published
(non-draft, non-prerelease) releases, so users see the toast from that moment
on.

Linux updates work for the AppImage, `.deb` and `.rpm` bundles (the latter two
ask for privileges via `pkexec`).
