# T11 — CI de release desktop (GitHub Actions)

| | |
| :--- | :--- |
| **Fase** | 3 — CI |
| **Base** | `feat/t10-cross-platform-devtooling` |
| **Rama** | `feat/t11-release-ci` |
| **Depende de** | T9 (bundles), T10 (scripts sidecar) |

## Objetivo

En push de tag `desktop-v*`, GitHub Actions produce artefactos instalables
para macOS (arm64 + x86_64), Windows x64 y Linux (deb + AppImage) y los
adjunta a un GitHub Release **draft** (publicación manual del owner).

## Contexto (censo actual)

- Tras T10 existen los scripts para construir el sidecar cruzado con cualquier
  `GOOS/GOARCH` y hay Make targets `tauri-build`.
- Sin workflow de release desktop; solo existe el repositorio con Go/TS tests
  ad-hoc en `.github/workflows/`.
- Restricción Linux documentada por Tauri: construir en el SO **más viejo**
  soportado (Ubuntu 22.04, WebKitGTK 4.1) para no exigir glibc nuevo a los
  usuarios.

## Alcance

- `.github/workflows/release-desktop.yml` (nuevo)
- (opcional) pequeño ajuste a un `ci.yml` existente para correr `cargo test`
  en PRs con cambios en `src-tauri/` o `backend/`.

## Comportamiento

```yaml
on: push: tags: ["desktop-v*"]
jobs:   # matrix de 3 runners + targets:
  macos-aarch64:  runs-on macos-14 → triple aarch64-apple-darwin → dmg/app
  macos-x86_64:   runs-on macos-13/14 → triple x86_64-apple-darwin → dmg/app
  windows-x64:    runs-on windows-2022 → triple x86_64-pc-windows-msvc → msi/nsis
  linux-x64:      runs-on ubuntu-22.04 → triple x86_64-unknown-linux-gnu → deb/appimage
```

1. **Steps comunes por job:**
   - `pnpm/action-setup`, `pnpm install --frozen-lockfile` (frontend)
   - `dtolnay/rust-toolchain-stable` (con target triple) + `Swatinem/rust-cache@v2`
   - Setup Go (toolchain) para `scripts/build-sidecar`
   - Construir sidecar del target actual (script reutilizado, no lógica nueva
     en el workflow) a `src-tauri/binaries/ink-readable-api-<triple>[.exe]`
   - `tauri-apps/tauri-action@vN` con:
     - `tagName: desktop-v__VERSION__`, `releaseDraft: true`, `prerelease: false`
     - el action invoca `tauri build`	AUDITADO — posibles knobs: `args` para
       `--bundles` específicos por SO.
   - macOS universal (opcional Later): `lipo` de ambos sidecar darwin + build
     `universal-apple-darwin` — decidir en review; los artefactos por-arq
     también son válidos para v1.
2. **Deps Linux runner:** `apt-get install libwebkit2gtk-4.1-dev build-essential
   curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
   (lista oficial de prereqs de Tauri 2 en Ubuntu/Debian).
3. **Versioning:** `desktop-v<version>` sacada de `tauri.conf.json`/`package.json`;
   tauri-action resuelve `__VERSION__` automáticamente. El bump manual del
   owner queda fuera (o como nota: `pnpm version` → tag).
4. **No firma** (T12). Los artefactos quedan como draft para review.
5. **Fails agn boundaries:** job failure → PR check rojo (workflow instalable
   en fase `ci.yml` para PRs de migración,_matching mysql via `paths` filters).

## Criterios de aceptación

- Tag de prueba (`desktop-v0.0.1-test`) → los 4 jobs terminan en verde y
  generan un Release **draft** con:
  - `Ink-and-Readable_*_aarch64.dmg`, `..._x64.dmg`
  - `..._x64-setup.exe` (NSIS) y/o `..._x64_en-US.msi`
  - `..._amd64.deb`, `..._amd64.AppImage`
- Cada draft attach además los binarios sidecar con sufijo triple (útil para
  soporte/debug post-release, algo opcional — `tauri-action` suele dejar todos
  los artefactos del bundle dir vía include patterns).
- Smoke manual de instalación por el owner en al menos 1 SO del propio
  hardware (los runners de Tauri action no ejecutan instalaciones).
- No se requiere ningún secret adicional para el draft (publish/firma sin
  secrets; los secrets de firma llegan con T12).

## Verificación

```bash
# local: repetir la parte "tauri build" del job con act o directamente:
make sidecar && make tauri-build
```

## Fuera de alcance

- Updater/signing (T12, roadmap).
- Test de instalación en runners reales (smoke manual; CI de instalación es
  una mejora futura).
