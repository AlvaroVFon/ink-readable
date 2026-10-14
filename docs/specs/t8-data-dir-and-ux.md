# T8 — Directorio de datos por plataforma + UX

| | |
| :--- | :--- |
| **Fase** | 2 — Experiencia desktop y empaquetado local |
| **Base** | `feat/t7-router-desktop` |
| **Rama** | `feat/t8-data-dir-and-ux` |
| **Depende de** | T5 (spawn con `--data-dir`), T7 |

## Objetivo

Que la DB y los logs vivan en las rutas estándar de cada SO, que sean
predecibles, y que el usuario pueda encontrarlas (acción “Abrir carpeta de
datos”).

## Contexto (censo actual)

- T5 fija `--data-dir = app_data_dir()/data`, donde `app_data_dir()` de Tauri
  resuelve según `identifier` (`dev.inkreadable.app` tras T4):
  - macOS: `~/Library/Application Support/dev.inkreadable.app/data`
  - Windows: `%APPDATA%\dev.inkreadable.app\data`
  - Linux: `${XDG_DATA_HOME:-~/.local/share}/dev.inkreadable.app/data`
- No hay UI de settings propia en el frontend aparte del editor config API
  (`editor/config`); no hay ningún comando Tauri de “abrir en Finder/Explorer”
  aún.

## Alcance

- `src-tauri/src/lib.rs` (nuevo comando `open_data_dir`)
- (opcional) UI: entrada en la sidebar/preferences del frontend que invoque el
  comando; el alcance **mínimo aceptable** para este task es el comando IPC +
  documentación, y la UI puede ser un ítem mínimo en la esquina de la sidebar
  de notes si el PR lo lleva a cabo sin remodelar nada.

## Comportamiento

1. **Comando `open_data_dir() -> Result<(), String>`:**
   - Calcula la MISMA ruta que T5 pasa al sidecar (misma función helper en
     Rust, no hardcoded dos veces — extraído a `src-tauri/src/paths.rs` con
     test que la factorice).
   - Abre el directorio en el explorador del SO vía `tauri-plugin-opener`
     (registrar el plugin en el builder; permisos capabilities:
     provee `opener:default`, y para path reveal en dir: usar
     `app.opener().open_path(dir, None)` desde Rust — no necesita capability
     si se invoca desde Rust mientras el plugin esté registrado).
   - Si el dir no existe (backend nunca arrancó) → crearlo antes de abrir.
2. **UI mínima (opcional dentro del PR):** un ítem con icono (lucide
   `folder-open`) en la sección footer del sidebar de notas con tooltip
   “Abrir carpeta de datos”, que hace `invoke('open_data_dir')`. Oculto en
   build web (`isTauri` guard) para no pintar nada muerto en web.
3. **Logs del sidecar:** escribir un archivo `api.log` dentro de `data/` con
   stdout/stderr del sidecar (rotación mínima: truncado al arranque es
   aceptable; tamaño máximo 5MB con truncado rotativo simple). Útil para
   soporte post-release y para debugging sin consola terminal.

## Criterios de aceptación

- En los 3 SO (macOS via dev Linux-crossprocedure no aplica; este criterio se
  checks en T11 CI y en smoke manual por el owner): la ruta existe tras
  primera ejecución, la DB `ink-readable.db` está ahí y NO hay `.db` ni
  archivos sueltos en el bundle de la app ni en `src-tauri/`.
- `open_data_dir` abre la ruta correcta en el OS host (smoke manual en API/OS
  disponible; aceptable si el PR lo demuestra en 1 SO y el resto verifica en
  la fase de CI).
- `cargo test` cubre que `data_dir(app)` y el argumento pasados al sidecar
  coinciden (unit test del helper extraído).
- (Si UI) `pnpm test` del componente mínimo.

## Verificación

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cd frontend && pnpm test
make tauri-dev
```

## Fuera de alcance

- Preferencias de usuario para cambiar data dir (roadmap T12 — necesitaría
  migración de la DB existente, no lo hacemos en v1).
- Backups automáticos de la DB (roadmap futuro; no en este track).
