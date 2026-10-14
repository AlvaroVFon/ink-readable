# T9 — Bundles instaladores locales (tauri build)

| | |
| :--- | :--- |
| **Fase** | 2 — Experiencia desktop y empaquetado local |
| **Base** | `feat/t8-data-dir-and-ux` |
| **Rama** | `feat/t9-bundle-installers` |
| **Depende de** | T5 (sidecar spawn), T8 (data dir estable) |

## Objetivo

`pnpm tauri build` (Make `tauri-build`) produce, en el SO host, un instalador
funcional: `.app`+`.dmg` en macOS, `.msi`+NSIS `.exe` en Windows, AppImage/deb
en Linux — con producto, icono, versión y sidecar correctos.

## Contexto (censo actual)

- Tras T4/T5: `bundle.active: true`, targets `"all"` provisional,
  `externalBin: ["binaries/ink-readable-api"]` (con sufijos triple por
  plataforma en `src-tauri/binaries/`, generado por los scripts de T10).
- `assets/hero.png` → iconos generados en T4.
- No hay firmas (updater en T12); en macOS el Gatekeeper mostrará "app sin
  verificar" — documentado como esperado en T14.

## Alcance

- `src-tauri/tauri.conf.json` → `bundle`
- (opcional) `src-tauri/build.rs` sin cambios esperados

## Comportamiento

1. **Metadatos del bundle:**
   - `productName: "Ink & Readable"` — revision: para paths/deployment es más
     seguro un productName sin `&` (los bundlers lo usan en nombre de archivo
     instalador y `{{productName}}` en NSIS); decisión recomendada:
     productName `Ink and Readable` y window title sigue siendo
     "Ink & Readable" — documentada en el PR.
   - `version`: sale de `Cargo.toml`/`tauri.conf.json` — la fuente de verdad
     propuesta es `tauri.conf.json` y el Makefile la sincroniza desde
     `frontend/package.json` al release (T11 la coordina).
   - `shortDescription`/`longDescription`: para deb/rpm (una línea del README).
2. **Targets por plataforma** (preferidos, con fallbacks):
   - macOS: `app` + `dmg`
   - Windows: `nsis` + `msi`
   - Linux: `appimage` + `deb` (+`rpm` opcional si el host lo soporta)
   - Configuración: `bundle.targets: "all"` produce los de la plataforma host;
     si se quiere precisión, lista por plataforma con `tauri build --bundles…`
3. **`resources`/licencias/app icon:** solo lo generado en T4; nada extra.
4. **Smoke de instalador:** en este PR, el owner (o CI de T11) instala y
   ejecuta el producto, valida: icono correcto, primera ejecución crea data
   dir, app 100% funcional (notas + planner), cerrar limpia el proceso backend.

## Criterios de aceptación

- `make tauri-build` produce artefactos con nombre esperado en
  `src-tauri/target/release/bundle/...` (paths logs en PR).
- Instalado en SO host: app abre, sidecar corre, datos en app_data_dir,
  procesos backend kill al cerrar.
- El bundle NO incluye archivos host-spejo (ninguna referencia a
  `localhost:5173` en el JS del bundle dist; grep `5173` en los assets
  producidos = 0 matches).

## Verificación

```bash
make sidecar && make tauri-build
ls src-tauri/target/release/bundle
```

## Fuera de alcance

- Firma/notarización (T12 roadmap).
- Publicación en GitHub Releases (T11).
- Auto-update (T12).

## Nota de implementación (T9)

- `tauri.conf.json → bundle`: añadidos `category: Productivity`,
  `shortDescription` y `longDescription` (metadatos para deb/rpm);
  `targets: "all"` y `productName: "Ink and Readable"` ya venían de T4.
- **Verificado en Linux (host):** `make tauri-build` produjo los 3 bundles:
  - `bundle/deb/Ink and Readable_0.1.0_amd64.deb` (18 MB)
  - `bundle/rpm/Ink and Readable-0.1.0-1.x86_64.rpm` (18 MB)
  - `bundle/appimage/Ink and Readable_0.1.0_amd64.AppImage` (123 MB)
  - `rpm -qpl` confirma `/usr/bin/ink-readable`, el sidecar
    `/usr/bin/ink-readable-api`, el `.desktop` y los iconos hicolor.
  - Sin referencias a `5173` en `frontend/dist/assets` (bundle limpio).
- macOS (`.app`/`.dmg`) y Windows (`.msi`/NSIS) se generan en la matriz de CI
  de T11 (no construibles en este host). El smoke de instalación queda manual.
