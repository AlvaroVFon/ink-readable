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

## Decisión pendiente del owner (elegir una en el review del PR)

**Opción A (recomendada hoy): HashRouter siempre.**
- Un solo comportamiento en web y desktop; `#/planner/123` nunca toca el
  asset resolver ni el fallback del nginx.
- URLs visibles cambian (hash) — irrelevante para una app de notas sin SEO.
- El cambio es un diff pequeñísimo en `main.tsx`.

**Opción B: `BrowserRouter` en web + `HashRouter`/memory router en desktop.**
- Mantiene URLs limpias en web (si publicaras la SPAe algún día).
- Dos modos de router que mantener → el PR debe cubrir tests de ambos
  arranques, así que solo vale la pena si la paridad de URLs importa.

Vale solo grabar la decisión en el PR; el resto del spec es la base de
cualquiera de las dos:

1. Router elegido configurado con un único `App` routes tree intuido
   (`App.tsx` no cambia: solo el tipo de router en `main.tsx`).
2. NotFound (`*`) intacto; deep links tipo `#/notes/<docId>` funcionan al
   abrir la app (test manual).
3. Hotkeys existentes que usan `useNavigate` no cambian.
4. `App.tsx` exporta el `Routes` tree sin instancianiento del router (refactor
   pequeño si hace falta para testear con `MemoryRouter` en vitest).

## Criterios de aceptación

- Build desktop (via `make tauri-build --no-bundle` o dev): abrir la app →
  `/` OK; navegar a notes/planner → OK; **recarga forzada (⌘R)** estando en
  `#/planner/<id>` → OK (vuelve a renderizar essa vista).
- Build web: rutas funcionan como hoy (regresión cero en `pnpm test`).
- (Opción B) El modo de router queda determinado por `isTauri` y existe un
  test unitario para cada modo (happy-dom montando el `App`).

## Verificación

```bash
cd frontend && pnpm test && pnpm typecheck
make tauri-dev    # recarga manual en /planner/<id>
```

## Fuera de alcance

- Manejo de links externos (`http(s)://`) para abrir en navegador del SO —
  eso vendría con T8/T9 si se necesita (editor: preview no tiene links
  externos clickable hoy; pendiente decidir).
