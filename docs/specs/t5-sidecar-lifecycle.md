# T5 — Lifecycle del sidecar (backend Go) + IPC

| | |
| :--- | :--- |
| **Fase** | 1 — Esqueleto Tauri runnable |
| **Base** | `feat/t4-tauri-scaffold` |
| **Rama** | `feat/t5-sidecar-lifecycle` |
| **Depende de** | T2 (flags + handshake), T3 (shutdown), T4 (scaffold) |

## Objetivo

Rust lanza el sidecar `ink-readable-api` al arrancar la app, espera el
handshake por stdout (`__INK_API_READY__ http://127.0.0.1:<port>`), expone la
URL al frontend vía comando IPC `get_api_url`, y mata el proceso al cerrar.

## Contexto (censo actual)

- Tras T2, el binario Go acepta:
  `ink-readable-api --desktop --port 0 --data-dir <abs>` e imprime una única
  línea `__INK_API_READY__ http://127.0.0.1:<port>` por stdout.
- Tras T4, `src-tauri/` existe sin lógica de sidecar; Tauri 2 soporta
  `bundle.externalBin` con **sufijo target-triple** por plataforma
  (p. ej. `binaries/ink-readable-api-x86_64-pc-windows-msvc.exe`) y el plugin
  shell con permiso `shell:allow-spawn` en capabilities.
- `app_data_dir()` de Tauri resuelve, según SO:
  macOS `~/Library/Application Support/<identifier>`, Windows `%APPDATA%\<identifier>`,
  Linux `~/.local/share/<identifier>` (XDG). Ver T8.

## Alcance

- `src-tauri/tauri.conf.json` (`bundle.externalBin`, timeout, etc.)
- `src-tauri/src/lib.rs`, `src-tauri/src/api.rs` (nuevo)
- `src-tauri/capabilities/default.json` (permiso `shell:allow-spawn` con
  `sidecar: true` sobre el nombre exacto `binaries/ink-readable-api`)
- `scripts/run-backend-dev.sh` + `.ps1` (dev sin Tauri: compila y lanza con
  los mismos flags para desarrollo backend-frontend sin ventana)

## Comportamiento

1. **Empaquetado del sidecar:** `bundle.externalBin: ["binaries/ink-readable-api"]`.
   Los binarios viven en `src-tauri/binaries/` con sufijo triple por plataforma
   (ver T10 para el script de build del sidecar). En dev, si el binario no
   está presente la app muestra diálogo de error (ver 5).
2. **Spawn en `setup()`:**
   - Ruta de datos: `app.path().app_data_dir()?.join("data")`; crearla con
     `fs::create_dir_all` si no existe.
   - `app.shell().sidecar("binaries/ink-readable-api")?`
     `.args(["--desktop", "--port", "0", "--data-dir", data_dir])`
     y `spawn()` (no `execute()`, que bufferiza toda la salida).
   - Guardar `child` en `tauri::State<ManagedApi>` (Mutex<Option<Child>>) para
     poder matarlo al salir.
3. **Handshake:** `BufReader::new(child.stdout.take().unwrap())` en un hilo;
   al leer la línea `__INK_API_READY__ ...`: guardar URL en
   `Mutex<Option<String>>` y emitir evento `api://ready` con la URL.
   - Liga canónica con regex-exacta: la línea **debe empezar** por el token;
     ignorar otras líneas de log del backend (van al log de debug de Rust, no
     a consolas del usuario).
4. **IPC:** comando `get_api_url() -> Result<String, String>`:
   - Si ya hay URL → `Ok(url)`.
   - Si aún no → **espera con timeout 10s** (poll con `tokio::time` o channel);
     después de timeout → `Err("backend not ready")`. El frontend (T6) gestiona
     retry/skip con mensaje de error UX.
   - `tauri::generate_handler![get_api_url]` registrado en el builder.
5. **Kill al salir:** en `RunEvent::ExitRequested` (y por robustez en
   `WindowEvent::Destroyed` cuando la última ventana cierre) → `child.kill()`.
   El graceful shutdown del backend (T3) hace la parte de drain; el kill es
   el seguro mecánico. En Windows, `child.kill()` de Tauri usa terminate
   dura — el backend ya es rápido en cerrar (T3), y la DB SQLite no queda
   dirty en práctica (WAL).
6. **Modo dev sin Tauri:** `scripts/run-backend-dev.sh|.ps1` — compila el
   binario con `go build` en `backend/` y lo lanza con `--desktop --port 0`
   + `--data-dir` temporal (o `INKB_DEV_DATA_DIR`), para desarrollar la SPA
   contra el backend real sin webview (flujos actuales de `pnpm dev` siguen
   funcionando con el Makefile `make run` para el modo legacy).

## Criterios de aceptación

- `cargo test` en `src-tauri/`: test unitario del parser de handshake (línea
  canónica de ejemplo → URL; líneas de log ruidosas → ignoradas; línea sin
  token → ignorada).
- Test de integración manual: `make tauri-dev` → en los logs de Rust se ve
  `spawn sidecar` → `__INK_API_READY__` → app abre sin diálogo de error; al
  cerrar la ventana, el proceso `ink-readable-api` desaparece
  (`pgrep ink-readable` vacío tras 2s de cerrar, en unix).
- Failure path: si el binario no existe o el handshake no llega en 10s →
  evento `api://error` + diálogo nativo del shell con mensaje claro
  (implementación mínima: `rfd` o un “message-only” window con texto; elegida
  la opción más simple con dependencias externas mínimas).
- Conexión confirmada end-to-end: con el frontend aún **sin** consumir
  `get_api_url` (T6), `curl http://127.0.0.1:<port>/health` desde el host
  responde 200 mientras la app está abierta.

## Verificación

```bash
cargo test --manifest-path src-tauri/Cargo.toml
make tauri-dev
```

## Fuera de alcance

- Consumo de `get_api_url` desde el frontend (T6).
- Cross-compilación del sidecar por plataforma (T10).
- Reintentos/backoff del spawn si el backend crashea (v1: error visible + kill
  de la app es aceptable; roadmap en T12).
