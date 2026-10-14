# T7 — Router de escritorio (deep links y recarga en el webview)

| | |
| :--- | :--- |
| **Fase** | 2 — Experiencia desktop y empaquetado local |
| **Base** | `feat/t6-frontend-dynamic-base-url` |
| **Rama** | `feat/t7-router-desktop` |
| **Depende de** | T6 |

## Objetivo

Garantizar que la navegación, recarga forzada (⌘R/F5) y cualquier URL inicial
del webview no produzcan 404 ni pantallas rotas en el bundle de desktop.

## Contexto (censo actual)

- `frontend/src/main.tsx` monta `BrowserRouter` (react-router v8, paquete
  `react-router` unificado).
- Rutas (`frontend/src/App.tsx`): `/` y `/notes/:documentId` (notes),
  `/planner` y `/planner/:projectId`, `*` → NotFound.
- En web, nginx hace `try_files ... /index.html` (SPA fallback). En el webview
  Tauri no hay servidor: los assets se sirven por custom protocol
  (`tauri://localhost/...` en macOS/Linux, `http://tauri.localhost/...` en
  Windows) y una recarga estando en `/planner/123` pediría ese path al asset
  resolver, que no hace fallback garantizado.

## Decisión (confirmada por el owner)

**Opción A: HashRouter siempre** (web y desktop). Un único comportamiento,
`#/planner/123` nunca toca el asset resolver ni el fallback del nginx, y el
diff es mínimo en `main.tsx`. Las URLs con hash son irrelevantes para una app
de notas sin SEO.

1. `boot.tsx` monta `HashRouter` en lugar de `BrowserRouter` (el router vive
   en el componente `Boot` desde T6; `main.tsx` ya no lo declara). El árbol de
   rutas de `App.tsx` no cambia.
2. NotFound (`*`) intacto; deep links tipo `#/notes/<docId>` funcionan al
   abrir la app (test manual).
3. Hotkeys existentes que usan `useNavigate` no cambian.
4. Test unitario con `MemoryRouter` (happy-dom) del árbol `App` para cubrir
   las rutas principales (`/`, `/notes/:documentId`, `/planner`,
   `/planner/:projectId`, NotFound).

## Criterios de aceptación

- Build desktop (via `make tauri-build --no-bundle` o dev): abrir la app →
  `/` OK; navegar a notes/planner → OK; **recarga forzada (⌘R)** estando en
  `#/planner/<id>` → OK (vuelve a renderizar esa vista).
- Build web: rutas funcionan como hoy (regresión cero en `pnpm test`).

## Verificación

```bash
cd frontend && pnpm test && pnpm typecheck
make tauri-dev    # recarga manual en /planner/<id>
```

## Fuera de alcance

- Manejo de links externos (`http(s)://`) para abrir en navegador del SO —
  eso vendría con T8/T9 si se necesita (editor: preview no tiene links
  externos clickable hoy; pendiente decidir).

## Nota de implementación (T7)

- Único cambio de código: `HashRouter` en `boot.tsx` (T6 movió el router ahí).
- Tests: `boot.test.tsx` monta el `Boot` real en modo web y comprueba el root y
  la navegación por hash (`#/planner`); `App.test.tsx` se amplía con
  `/notes/:documentId` y `/planner/:projectId`. La ruta de nota con id no
  mantiene el heading "Notes" (la cabecera cambia), así que se comprueba que
  **no** cae en NotFound.
- Verificado: `pnpm test` (284), `lint`, `typecheck`, `format:check`, `build`.
  Recarga en `#/planner/<id>` dentro del webview queda como smoke manual.
