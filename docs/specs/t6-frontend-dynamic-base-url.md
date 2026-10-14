# T6 — Base URL dinámica de la API en el frontend

| | |
| :--- | :--- |
| **Fase** | 1 — Esqueleto Tauri runnable |
| **Base** | `feat/t5-sidecar-lifecycle` |
| **Rama** | `feat/t6-frontend-dynamic-base-url` |
| **Depende de** | T5 (comando `get_api_url`) |

## Objetivo

El mismo bundle de React funciona en dos entornos:
- **Web (actual):** `API_BASE_URL` relativa `/api/v1` (proxies de Vite/nginx).
- **Desktop (nuevo):** `API_BASE_URL` absoluta `http://127.0.0.1:<port>/api/v1`,
  resuelta en runtime vía IPC (`get_api_url`) **antes** del primer render.

## Contexto (censo actual)

- `frontend/src/lib/http/axios.ts`:
  `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'` (build-time);
  el cliente es un singleton `export const http = createHttpClient()`.
- `ApiClient` (`src/lib/api/api-client.ts`) toma `httpClient: AxiosInstance`
  por parámetro con default `http` — buen punto de inyección; los hooks de
  `src/lib/api/*` usan `apiClient` singleton.
- `frontend/src/main.tsx`: render síncrono, sin fetch previo.
- Los tests de `axios.test.ts` prueban interceptores y timeouts; no dependen
  del valor de `API_BASE_URL` más allá de que exista.

## Alcance

- `frontend/src/main.tsx`
- `frontend/src/lib/http/axios.ts` (+ `axios.test.ts`)
- `frontend/package.json` (yes `@tauri-apps/api` — ya añadida en T4)

## Comportamiento

1. **Detección de entorno:** `const isTauri = '__TAURI_INTERNALS__' in window`
   (forma canónica en Tauri v2). Helper en `src/lib/tauri.ts` (nuevo) para
   testabilidad (+unit test con mock del objeto global).
2. **Módulo http:**
   - `createHttpClient(config?)` sigue igual (factory ya existe).
   - En lugar de exponer `http` como singleton de baseURL fija, el módulo crea
     el singleton **sobre demanda** con la baseURL efectiva, y exporta
     `setApiBaseUrl(url: string)` idempotente que: destruye la instancia previa
     (o muta `defaults.baseURL` de la viva) y re-exporta `getHttp()`.
   - Los consumidores existentes (`apiClient` default `http`) migran a un lazy
     getter internamente: `http()`-style o el `ApiClient` pide el cliente por
     closure — implementación libre mientras los tests existentes pasen
     **sin** cambios grand, y las herramientas exportadas sigan siendo las
     mismas export surface (sin breaking para hooks).
   - Default web: sin `setApiBaseUrl` explícita, la baseURL es la actual
     (`/api/v1` con override env) — **cero cambios en comportamiento web**.
3. **Bootstrap async en `main.tsx`:**
   ```ts
   if (isTauri) {
     const { invoke } = await import('@tauri-apps/api/core')
     const apiUrl = await invoke<string>('get_api_url')
     setApiBaseUrl(`${apiUrl}/api/v1`)
   }
   // render igual que hoy (ThemeProvider > ... > App)
   ```
   - Errores del invoke (backend no ready/timeout T5): render de una pantalla
     `BootError` mínima (componente en un solo archivo) con botón “Reintentar”
     que re-invoca; si falla de nuevo, muestra el mensaje de T5.
4. **Timeout/resiliencia:** `API_TIMEOUT_MS` (10s) sigue igual — razonable para
   SQLite local.

## Criterios de aceptación

- `pnpm test` (vitest): tests existentes de axios/http pasan sin cambios de
  comportamiento web; nuevos tests:
  - `setApiBaseUrl('http://127.0.0.1:1/api/v1')` → el cliente usa esa baseURL.
  - default (sin set) → `/api/v1`.
  - helper `isTauri` con `__TAURI_INTERNALS__` simulado.
- `pnpm typecheck` y `pnpm build` pasan. El import de `@tauri-apps/api/core`
  es dinámico y vive en un chunk aparte que solo se carga cuando `isTauri()` es
  cierto; el dev server en navegador nunca lo ejecuta. **Nota (revisada):** el
  build de producción ES el bundle que carga Tauri, así que no tiene sentido
  exigir "cero código tauri en dist"; la comprobación real es que la ruta web
  (dev server + proxy Vite) sigue funcionando sin tocar Tauri, y que la ruta
  desktop carga el chunk de `@tauri-apps/api` (visible en los logs de Vite como
  `dependency optimized: @tauri-apps/api/core`).
- Smoke de integración en `make tauri-dev` (verificado): el sidecar arranca y
  **desaparecen los `http proxy error` de Vite** (el webview usa la URL absoluta
  `http://127.0.0.1:<port>` directamente). El CRUD completo por UI (crear vault,
  documento, proyecto, tarea) queda como smoke manual.
- Web sigue funcionando con `make up-dev` (regresión cero).

## Verificación

```bash
cd frontend && pnpm test && pnpm typecheck && pnpm build
make tauri-dev
```

## Fuera de alcance

- Router/deep links (T7).
- Pantalla de boot “backend starting” con progreso (la mínima de error/retry
  cubre; un estado de carga bonito puede venir después si hace falta).
- Cualquier behaviour de `/config`-secrets en desktop (T5 backend responde {},
  no cambia nada).

## Nota de implementación (T6)

- `lib/http/axios.ts`: en vez de un lazy getter se muta el singleton
  (`setApiBaseUrl` → `http.defaults.baseURL`); es suficiente porque todos los
  hooks usan el mismo `http` y axios lee `defaults` en cada request. Cambio
  mínimo, cero impacto en la superficie exportada.
- `lib/tauri.ts`: `isTauri()` (detecta `__TAURI_INTERNALS__`) y
  `resolveApiBaseUrl()` (default relativo en web; `invoke('get_api_url')` +
  `/api/v1` en desktop, con import dinámico).
- `boot.tsx`: componente `Boot` que resuelve la URL antes de montar el árbol
  (providers + router + `App`) y muestra pantalla de carga/error con “Retry”.
  En web arranca directamente en `ready` (sin parpadeo).
- `main.tsx` ahora solo monta `<Boot />`.
- Tests: `lib/tauri.test.ts` (mock de `@tauri-apps/api/core`, `isTauri`,
  resolución web y desktop) y caso de `setApiBaseUrl` en `axios.test.ts`.
- **oculto:** `oxlint` exige que el `useEffect` no invoque setters sincrónicos,
  de ahí el patrón `then/catch` con flag `cancelled` en el effect (el retry sí
  puede usar una función async desde el handler).
