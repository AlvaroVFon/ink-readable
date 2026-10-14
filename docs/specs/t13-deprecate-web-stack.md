# T13 — Deprecar el stack web de producción

| | |
| :--- | :--- |
| **Fase** | 4 — Cierre |
| **Base** | `feat/t11-release-ci` |
| **Rama** | `feat/t13-deprecate-web-stack` |
| **Depende de** | T11 (release desktop en verde; escritorio demostrado) |

## Objetivo

Escritorio pasa a ser el modo principal y se retira el despliegue web de
producción (Docker Compose prod + nginx), decidiendo explícitamente qué queda
para desarrollo.

## Contexto (censo actual)

- `docker-compose.yml` (prod: migrate sidecar + backend + nginx frontend);
  `docker-compose.dev.yml` (dev: backend Go + Vite, no toca Vault tras el
  cambio uncommitted actual del owner).
- `frontend/Dockerfile` + `frontend/nginx.conf` (SPA + reverse proxy /api/ y
  /health); `backend/Dockerfile` (stage migrate + stage app).
- Makefile targets: `up`, `up-prod`, `up-dev`, `down`, `down-dev`.
- Desde T2, el backend arranca sin Docker (`--desktop --port 0 --data-dir`;
  también el modo dev legacy sigue operativo con `.env` + `make run`).

## Decisión (confirmada por el owner)

**Opción A:** eliminar producción web por completo (`docker-compose.yml` +
Dockerfiles de frontend/nginx) y **conservar** `docker-compose.dev.yml` como
entorno dev de Go.

## Comportamiento

1. **Eliminar:**
   - `docker-compose.yml` (prod)
   - `frontend/Dockerfile`, `frontend/nginx.conf`
   - `backend/Dockerfile` si el dev compose no lo usa (verificar; si lo usa,
     conservarlo y anotarlo)
   - Makefile: `up`, `up-prod`, `down` (prod targets)
2. **Conservar y retocar:**
   - `docker-compose.dev.yml` (dev Go, si se opta por Docker en dev): revisar
     que no dependa del stage `migrate` tras T1/T2 (el binario migra solo en
     desktop; para dev compose puede seguir con el stage migrate o pasar a
     `make run` con `--desktop` flags — elegir el mínimo cambio documentado).
   - `make up-dev / down-dev` (si Option A conserva dev compose).
   - `backend/Dockerfile` stage `migrate` puede obsolecense tras T1: si el dev
     compose pasa a usar `--desktop` del binario, ese stage se elimina.
3. **README (T14 hace el rewrite completo; aquí solo el flag warning):** banner
   top del README “desktop is the primary distribution, web deployment
   retired”.

## Criterios de aceptación

- Repo sin Dockerfiles/targets eliminados; `grep -r docker-compose.yml .` solo
  devuelve doc refs históricas o nada.
- Dev flow sigue operativo según decisión del PR (documentado paso a paso en
  diff description).
- `make test` + checks frontend en verde. CR de CI desktop release (T11)
  no afectado (los Dockerfiles eliminados no son inputs del build Tauri).

## Verificación

```bash
make test
make tauri-dev
```

## Nota de implementación (T13)

- **Eliminado:** `docker-compose.yml` (prod), `frontend/Dockerfile`,
  `frontend/nginx.conf`, `frontend/.dockerignore`; targets `up`, `up-prod`,
  `down` del Makefile.
- **Conservado:** `docker-compose.dev.yml` y `make up-dev`/`down-dev` (dev de
  Go/frontend). Se sigue usando `backend/Dockerfile` (stage `migrate` del
  servicio `migrate` del compose dev) → **se conserva** (el binario solo
  auto-migra en modo `--desktop`, y el backend del contenedor corre en
  `ENV=development`).
- `docker-compose.dev.yml`: se elimina la var `VAULT_URL` (no se usa en
  `ENV=development`; era un ajuste local del owner que se reincluye aquí).
- Comentario de `frontend/src/lib/http/axios.ts` actualizado (ya no menciona
  nginx; apunta al bootstrap del sidecar).
- **Verificado:** `make test` (Go) verde; frontend `lint`/`typecheck`/`format`/`test`
  (286) verde; YAML del compose dev válido.
