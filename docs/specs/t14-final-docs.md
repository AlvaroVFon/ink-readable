# T14 — Documentación final (README y docs de desktop)

| | |
| :--- | :--- |
| **Fase** | 4 — Cierre |
| **Base** | `feat/t13-deprecate-web-stack` |
| **Rama** | `feat/t14-final-docs` |
| **Depends** | T13 |

## Objetivo

README del repo y docs dedicadas describen el proyecto como aplicación de
escritorio (macOS/Linux/Windows), con setup de desarrollo y release process.
Este es el último task del track: el repo “después” debe ser
autoexplicativo.

## Contexto (censo actual)

- README describe el stack web (Docker Compose, Vault, targets Make web) —
  tras T13 quedó parcialmente desactualizado o con warnings.
- No existe doc de: rutas de datos por SO, troubleshooting de primera ejecución
  (Gatekeeper, SmartScreen), release process, arquitectura de la app desktop.

## Alcance

- `README.md` (rewrite)
- `docs/desktop.md` (nuevo): arquitectura desktop + developer guide
- (opcional) actualizar `frontend/README.md` (data layer) con la nota de
  baseURL dinámica; `backend/README.md` con flags de CLI modo desktop.

## Contenido del README final

1. **Top:** app screenshots (assets existentes), “Desktop app for macOS,
   Windows & Linux built with Tauri + Go + React”.
2. **Download:** link a GitHub Releases (drafts hasta que owner publique);
   warnings de sin-firma por plataforma (clic-derecho/Abrir en macOS,
   SmartScreen “More info → Run anyway” en Windows) — reseña de que la firma
   llega con el track T12.
3. **First run:** dónde viven los datos (macOS/Windows/Linux paths con el
   identificador real de T4), y opción “Abrir carpeta de datos” si T8 lo
   añadió.
4. **Migrar datos desde el deploy web legacy:** copiar
   `backend/data/ink-readable.db` → `<app_data_dir>/data/ink-readable.db`
   (la misma DB; migraciones idempotentes la recogen). Farewell del sidecar
   migrate/container si alguien tenía ahí su DB — misma herramienta, el camino
   embebido es interoperable (T1).
5. **Dev setup:**
   - Prereqs: Go (versión de go.mod), Node/pnpm, Rust stable + tauri deps por
     SO (macOS nada extra; Linux lista de paquetes apt de T11 con nota del
     porqué de Ubuntu 22.04; Windows WebView2 preinstalado en Win10/11,
     rustup + VS build tools).
   - `make tauri-dev` (desktop) y, para frontend puro, `make run` + `pnpm dev`
     (scripts de T5) — los dos flujos, con su explicación.
   - Checks: `make test`, `pnpm lint|test|typecheck|build`.
6. **Release:** tabla de cómo taggear (`desktop-vX.Y.Z`) y qué produce CI
   (T11), y el estado del draft.
7. **Project structure** actualizado con `src-tauri/` y `scripts/`.

## Contenido de `docs/desktop.md`

- Arquitectura (diagrama del README.md de specs, con detalles: handshake
  stdout, IPC, kill-on-exit, rutas de datos).
- Formato del handshake (`__INK_API_READY__`) y cómo se usa en logs/CI.
- Security model: bind loopback-only, sin auth local (estado actual y el
  tradeoff aceptado — ver T12 para auth/fuego futuro), origen webview.
- Troubleshooting: puerto ocupado (no aplica, port 0), backend no arranca
  (cómo leer api.log del data dir de T8), reset de datos (borrar carpeta
  `data`).

## Criterios de aceptación

- README lee completamente coherente con el estado final del repo (ningún
  target/instrucción muerta).
- Los comandos listados funcionan copy-paste en un clone limpio (smoke del
  owner en ≥1 SO; el resto aservable por la CI).
- Sin emojis ni marketing excesivo; tono del repo actual.

## Verificación

- Review humano del PR; smoke de comandos README en el SO host.

## Nota de implementación (T14)

- `README.md` reescrito desktop-first: features, stack (Tauri/Go/React), download
  + avisos de no-firma por SO, rutas de datos, migración desde el deploy web,
  prerequisites por SO, `make tauri-dev`, loop frontend-only
  (`run-backend-dev` + `pnpm dev`), checks, `tauri-build`, proceso de release y
  estructura del repo.
- `docs/desktop.md` (nuevo): arquitectura (diagrama), handshake
  `__INK_API_READY__`, directorio de datos, modelo de seguridad (loopback, sin
  auth local en v1), troubleshooting (Wayland/headless, WebKitGTK, reset de datos)
  y release.
- `backend/README.md`: modo escritorio (flags, migraciones embebidas, handshake,
  shutdown) + aclaración de que Vault/`.env` son del modo web.
- `frontend/README.md`: capa http con base URL dinámica + `boot`/`lib/tauri`.
- **Verificado:** referencias a ficheros existentes; sin comandos muertos
  (`up-prod`/`down` eliminados en T13 no se documentan).
