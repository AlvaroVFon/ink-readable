# T4 — Scaffold de Tauri 2

| | |
| :--- | :--- |
| **Fase** | 1 — Esqueleto Tauri runnable |
| **Base** | `feat/t3-graceful-shutdown` |
| **Rama** | `feat/t4-tauri-scaffold` |
| **Depende de** | T3 |

## Objetivo

Proyecto Tauri 2 mínimo que compila y abre una ventana cargando la SPA actual.
En este hito la ventana renderiza el frontend pero las llamadas al API pueden
fallar (el sidecar se conecta en T5). Confirmado con smoke test manual.

## Contexto (censo actual)

- No existe `src-tauri/`. No hay dependencias `@tauri-apps/*` en
  `frontend/package.json`. El Makefile no tiene targets Tauri.
- `frontend/src/main.tsx` renderiza sincrónicamente (`BrowserRouter`).
- `assets/hero.png` existe (base para los iconos).

## Alcance

- `src-tauri/` (nuevo): `Cargo.toml`, `build.rs`, `tauri.conf.json`,
  `capabilities/default.json`, `src/main.rs`, `src/lib.rs`, `icons/`.
- `frontend/package.json` (+`@tauri-apps/cli`, `@tauri-apps/api`; el plugin
  shell llega en T5).
- `Makefile`: `tauri-dev`, `tauri-build` (delegan en `pnpm tauri ...`
  desde `frontend/`, para no duplicar toolchain).
- `.gitignore`: `src-tauri/target/`, `src-tauri/binaries/`, `src-tauri/gen/`.

## Comportamiento

1. `tauri.conf.json` (v2 schema):
   - `identifier: "dev.inkreadable.app"` (reverse-DNS obligatorio; fija las
     rutas de datos de T8 — decisión final de branding pendiente, no cambiar
     el identificador después de T8 sin manual de migración).
   - `build.developerUrl`-style keys v2 equivalentes: `build.devUrl:
     http://localhost:5173`, `build.frontendDist: ../frontend/dist`,
     `build.beforeDevCommand: pnpm dev` y `build.beforeBuildCommand: pnpm build`
     (cwd de ejecución: `src-tauri/`; usar rutas relativas correctas).
   - `app.windows[0]`: title "Ink & Readable", min 900×600, `withGlobalTauri:
     false` (el frontend usará `@tauri-apps/api`, no globals).
   - `bundle.active: true`, `targets: "all"` provisional (refinado en T9).
2. `lib.rs` mínimo:
   ```rust
   #[cfg_attr(mobile, tauri::mobile_entry_point)]
   pub fn run() {
     tauri::Builder::default()
       .run(tauri::generate_context!())
       .expect("error while running tauri application");
   }
   ```
   (`main.rs` delega en `app_lib::run()`).
3. Capabilities `src-tauri/capabilities/default.json`: solo `core:default`
   (por ahora; `shell:allow-spawn` llega en T5).
4. Iconos: `pnpm tauri icon path/to/assets/hero.png` genera
   `.icns/.ico/.png` en `src-tauri/icons/`. Comprometidos en el repo.
5. Toolchain documentada (README del repo en T14; nota en este PR):
   Rust stable, Tauri CLI via `@tauri-apps/cli` en devDependencies de frontend,
   y prereqs de SO para linux (`libwebkit2gtk-4.1-dev`, etc.).

## Criterios de aceptación

- `make tauri-dev` abre la ventana y renderiza la app (tema, rutas, sidebar).
  Las peticiones API fallan con error visible pero la app no crashea (los
  estados de error de la capa de datos ya existen).
- `pnpm tauri build --no-bundle` produce el binario ejecutable (sin bundle
  instalador; eso es T9), prueba que el pipeline `beforeBuildCommand` anda.
- Verificaciones transversales: `pnpm lint`, `pnpm test`, `pnpm typecheck`,
  `pnpm build`, `make test` — todos pasan.
- `cargo check` en `src-tauri/` sin warnings bloqueantes.

## Verificación

```bash
make tauri-dev
```

## Fuera de alcance

- Sidecar/lifecycle del backend (T5).
- Base URL dinámica (T6).
- Bundles instaladores reales por plataforma (T9).

## Nota de implementación (T4)

- **Ubicación:** `frontend/src-tauri/` (en lugar de la raíz) para que
  `pnpm tauri dev` corra desde `frontend/` sin un `package.json` raíz:
  `beforeDevCommand`/`beforeBuildCommand` (`pnpm dev`/`pnpm build`) y
  `frontendDist: ../dist` resuelven relativos a `frontend/`.
- **Nombres:** crate `ink-readable`, lib `ink_readable_lib` (main llama
  `ink_readable_lib::run()`); `productName: "Ink and Readable"` (sin `&`, seguro
  para nombres de fichero de bundle) y el título de ventana sigue "Ink & Readable".
  `identifier: dev.inkreadable.app` (sin validación que lo bloquee; T8 depende de él).
- **Iconos:** generados con `pnpm tauri icon ../assets/hero.png --fit cover`
  (hero.png es 2211×1212, no cuadrado). Se eliminaron `icons/android` e
  `icons/ios`. Branding definitivo puede requerir un square dedicado.
- **Verificado:** `cargo check` OK; `pnpm tauri build --no-bundle` compila release
  y produce `target/release/ink-readable`; `pnpm tauri dev` abre la ventana y el
  SPA carga (las llamadas al API fallan con `ECONNREFUSED` del proxy de Vite, que
  es lo esperado hasta T5).
- **Gotcha de entorno (Linux/Wayland detached):** al lanzar `tauri dev` desde un
  shell sin sesión gráfica completa, WebKit falla con
  `Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display`.
  Funciona con `GDK_BACKEND=x11` (XWayland). En una terminal normal del escritorio
  no hace falta.
- **Prereqs Linux (Fedora):** `webkit2gtk4.1-devel javascriptcoregtk4.1-devel
  libsoup3-devel gtk3-devel librsvg2-devel openssl-devel`.
