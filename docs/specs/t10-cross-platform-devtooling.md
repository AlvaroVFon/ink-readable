# T10 — Devtooling cross-platform (sidecar + tauri scripts)

| | |
| :--- | :--- |
| **Fase** | 2 — Experiencia desktop y empaquetado local |
| **Base** | `feat/t9-bundle-installers` |
| **Rama** | `feat/t10-cross-platform-devtooling` |
| **Depende de** | T9 |

## Objetivo

Comandos de desarrollo reproducibles en las 3 plataformas para:
1. Compilar el binario Go del sidecar para cualquier target
   (nombres con sufijo target-triple requeridos por `bundle.externalBin`).
2. Correr `tauri dev` y `tauri build` desde el Makefile sin recordar tooltips,
   y con el sidecar ya compilado.

## Contexto (censo actual)

- Tras T5: `src-tauri/binaries/` contiene binarios con sufijo triple que se
  construían “a mano” en dev.
- Go: `CGO_ENABLED=0` posible (puro Go) → cross-compile trivial.
- Makefile actual: `build/run/test/sqlc-generate/migrate-*/up-dev/up-prod`.

## Alcance

- `scripts/build-sidecar.sh` (nuevo, macOS/Linux —y `sh` en general)
- `scripts/build-sidecar.ps1` (nuevo, Windows)
- `Makefile` (targets nuevos, unix; Windows devs usan los scripts `.ps1`
  directamente o `gt` equivalente — documentar quien quiera)
- `.gitignore` (ya cubierto por T4, reverificar)

## Comportamiento

1. **Matriz de targets** (Go GOOS/GOARCH → tripla + extensión):
   - `darwin/arm64` → `aarch64-apple-darwin`
   - `darwin/amd64` → `x86_64-apple-darwin`
   - `(opcional universal: lipo -create de ambos → "universal")` — el build
     universal lo coordina T11; el script local solo produce el target del
     host por defecto, con `--targets all` opcional.
   - `linux/amd64` → `x86_64-unknown-linux-gnu`
   - `linux/arm64` → `aarch64-unknown-linux-gnu` (best-effort, WebKitGTK arm64
     linux es nicho; CI no lo promete)
   - `windows/amd64` → `x86_64-pc-windows-msvc` (+ `.exe`)
   - Salida: `src-tauri/binaries/ink-readable-api-<triple>[.exe]`
   - Flags comunes: `CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o ...`
     + `-X` para version (si se adopta versioning CLI en T11).
2. **Defaults inteligentes:** sin argumentos, compila **solo** el target del
   host (detectado en shell/ps1); `--targets all` produce toda la matriz.
   Cada compilación es `go build -C backend/separado` para no pisar caches.
3. **Makefile:**
   ```make
   sidecar:          ## builds the host OS sidecar binary
   	./scripts/build-sidecar.sh
   sidecar-all:
   	./scripts/build-sidecar.sh --targets all
   tauri-dev: sidecar
   	cd frontend && pnpm tauri dev
   tauri-build: sidecar
   	cd frontend && pnpm tauri build
   ```
   (Ajuste fino de pnpm/`tauri` CLI path al implementar; los targets existen
   desde T4 — aquí se termina de conectar con sidecar/`--targets`.)
4. **`pnpm tauri build --no-bundle`** (util en CI rápida) documentado en el
   README del devtooling.

## Criterios de aceptación

- En Linux (host del repo): `make sidecar && make tauri-dev` funciona de un
  comando después de un `git clone` limpio + `pnpm install` + prereqs
  documentados (rustup, webkit deps).
- `make sidecar-all` produce los 6 artefactos (2 darwin, 2 linux, 1 win como
  mínimo; .exe sufijo correcto) sin errores y con tamaños razonables (<30MB c/u
 Approx).
- Los binarios producidos arrancan OK (smoke: lanzar uno con `--desktop` y
  ver handshake) — al menos para el host y windows-cross verificado con
  `wine`/CI (opcional: T11 lo cubre definitivamente).

## Verificación

```bash
make sidecar-all && ls -lh src-tauri/binaries
make tauri-dev
```

## Fuera de alcance

- CI (T11); firma de binarios (T12).
- Caché incremental/rust buildCache tricks (nice-to-have futuro).
