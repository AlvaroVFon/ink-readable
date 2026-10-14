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

## Decisión pendiente del owner (marcar en el PR)

**Opción A (recomendada):** eliminar producción web por completo
(`docker-compose.yml` + Dockerfiles de frontend/nginx) y **conservar**
`docker-compose.dev.yml` como entorno dev de Go (la alternativa sin Docker ya
existe vía `make run` + `scripts/run-backend-dev` de T5 — si el equipo prefiere
cero Docker, opción B).

**Opción B:** mantener ambos compose (prod/dev) como secondary deployment
“por si acaso” durante N meses con warning de deprecación en README.

En cualquiera de las dos, `docker-compose.dev.yml` es lo más probable que se
mantenga (fuga de flujo dev Go actual); confirmar en review.

## Comportamiento (opción A)

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
