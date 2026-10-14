# Specs — Migración a aplicación de escritorio

Migración incremental de ink-readable (web stack Docker) a una aplicación de
escritorio nativa para **macOS, Linux y Windows** con **Tauri 2**.

## Decisiones de arquitectura

| Decisión | Elección |
| :--- | :--- |
| Shell de escritorio | Tauri 2 (webview nativo por SO + core Rust) |
| Backend | El binario Go actual se empaqueta como **sidecar** (`externalBin`) y escucha en `127.0.0.1` |
| Base de datos | SQLite en el directorio de datos del SO, sin configuración |
| Configuración | Cero configuración en desktop: sin Vault, sin `.env`, sin API keys |
| Modo principal | Escritorio. El stack web de producción se elimina (T13); `docker-compose.dev.yml` se conserva para desarrollo Go |
| Router | **HashRouter siempre** (web y desktop) — decisión T7 |
| Auto-update / firma / notarización | Fuera de alcance (fase futura, ver `t12-updater-signing-roadmap.md`) |

### Por qué Tauri + sidecar

- El driver SQLite es `glebarez/go-sqlite` (Go puro, sin cgo) → cross-compilar el
  backend para las 3 plataformas es trivial (`CGO_ENABLED=0 GOOS=... GOARCH=...`).
- El CORS del API es `Access-Control-Allow-Origin: *` (`backend/internal/httpx/httpx.go`),
  así que el webview puede hablar con `http://127.0.0.1:<puerto>` sin fricción.
- Tauri 2 tiene soporte first-class para sidecars (`bundle.externalBin` +
  `tauri_plugin_shell`), incluida la terminación del proceso al cerrar la app.

### Arquitectura objetivo

```text
┌─ Tauri (Rust) ─────────────────────────────────────┐
│  Webview ── carga el build de frontend/dist        │
│  setup(): spawn sidecar ──► ink-readable-api       │
│    flags: --port 0 --data-dir <app_data_dir>/data  │
│    stdout: "__INK_API_READY__ http://127.0.0.1:P"  │
│  Estado: apiUrl en tauri::State<Mutex<...>>        │
│  IPC: get_api_url() ──► frontend                   │
│  exit: child.kill()                                │
└────────────────┬───────────────────────────────────┘
                 │ axios (base absoluta)
                 ▼
      http://127.0.0.1:<efímero>/api/v1 ──► SQLite (app_data_dir)
```

## Flujo de trabajo (ramas stackeadas)

- `desktop-migration` es la **rama base**: contiene solo los specs
  (`docs/specs/`). Nada de código de migración se mergea aquí directamente.
- Cada tarea vive en una rama `feat/<id>-<slug>` creada **a partir de la rama
  de la tarea anterior** (stack).
- Las PRs van stackeadas hacia `desktop-migration` y se mergean **en orden**:
  base primero. Tras cada merge, el stack se rebasea (o la siguiente PR cuya
  base se mergeó se retargetea) sobre `desktop-migration`.

```text
main ──► desktop-migration (specs)
            └─ feat/t1-embed-migrations
                 └─ feat/t2-desktop-mode
                      └─ feat/t3-graceful-shutdown
                           └─ feat/t4-tauri-scaffold
                                └─ ...
```

Cada spec muestra su dependencia concreta: `Base: feat/tN-...` o
`Base: desktop-migration`.

## Índice de tareas

### Fase 0 — Backend Go “desktop-ready” (puro Go, sin tocar frontend ni Docker)

| ID | Spec | Resumen | Base |
| :--- | :--- | :--- | :--- |
| T1 | `t1-embed-migrations.md` | Migraciones SQL embebidas en el binario, aplicadas al arrancar | `desktop-migration` |
| T2 | `t2-desktop-mode-cli-flags.md` | Modo desktop: `--port 0 --data-dir`, sin Vault/.env, handshake por stdout | `feat/t1-embed-migrations` |
| T3 | `t3-graceful-shutdown.md` | Apagado limpio (SIGINT/SIGTERM + kill del shell) | `feat/t2-desktop-mode` |

### Fase 1 — Esqueleto Tauri runnable

| ID | Spec | Resumen | Base |
| :--- | :--- | :--- | :--- |
| T4 | `t4-tauri-scaffold.md` | Proyecto `src-tauri/` + Make targets; ventana abre la app | `feat/t3-graceful-shutdown` |
| T5 | `t5-sidecar-lifecycle.md` | Spawn/kill del backend Go + IPC `get_api_url` | `feat/t4-tauri-scaffold` |
| T6 | `t6-frontend-dynamic-base-url.md` | baseURL de axios dinámica (desktop absoluta, web relativa) | `feat/t5-sidecar-lifecycle` |

### Fase 2 — Experiencia desktop y empaquetado local

| ID | Spec | Resumen | Base |
| :--- | :--- | :--- | :--- |
| T7 | `t7-router-desktop.md` | Deep links / recarga en el webview (HashRouter en desktop) | `feat/t6-frontend-dynamic-base-url` |
| T8 | `t8-data-dir-and-ux.md` | Rutas de datos por plataforma + UX de apertura | `feat/t7-router-desktop` |
| T9 | `t9-bundle-installers.md` | Instaladores por plataforma en build local | `feat/t8-data-dir-and-ux` |
| T10 | `t10-cross-platform-devtooling.md` | Make/scripts para sidecar y tauri multiplataforma | `feat/t9-bundle-installers` |

### Fase 3 — CI

| ID | Spec | Resumen | Base |
| :--- | :--- | :--- | :--- |
| T11 | `t11-release-ci.md` | Workflow `release-desktop.yml` (mac/win/linux) | `feat/t10-cross-platform-devtooling` |

### Fase 4 — Cierre

| ID | Spec | Resumen | Base |
| :--- | :--- | :--- | :--- |
| T12 | `t12-updater-signing-roadmap.md` | Roadmap (no implementar): updater, firma, notarización | `desktop-migration` |
| T13 | `t13-deprecate-web-stack.md` | Deprecar Docker Compose prod, nginx; escritorio = principal | `feat/t11-release-ci` |
| T14 | `t14-final-docs.md` | README final, rutas de datos, FAQ de migración de datos | `feat/t13-deprecate-web-stack` |

## Convenciones de los specs

- Cada spec es **autocontenido**: objetivo, alcance, comportamiento, criterios de
  aceptación y verificación. Enlaza a las decisiones comunes de este README.
- Los specs describen *qué* y *por qué*; la implementación concreta puede adaptar
  detalles menores (nombres de funciones, estructura de archivos) si respeta los
  criterios de aceptación.
- Criterios de calidad transversales (aplican a todas las tareas):
  `make test` (Go) y `cd frontend && pnpm lint && pnpm test && pnpm build` deben
  seguir pasando; los specs de frontend añaden `pnpm typecheck`.
- Paridad web no es un requisito salvo que el spec lo diga: a partir de la Fase 4
  el modo principal es escritorio; los specs siempre indican qué debe seguir
  funcionando en web durante la transición.
