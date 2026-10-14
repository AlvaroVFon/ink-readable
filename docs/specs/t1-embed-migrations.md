# T1 — Migraciones embebidas en el binario

| | |
| :--- | :--- |
| **Fase** | 0 — Backend Go desktop-ready |
| **Base** | `desktop-migration` |
| **Rama** | `feat/t1-embed-migrations` |
| **Depende de** | — |

## Objetivo

El binario del backend aplica sus propias migraciones SQLite al arrancar (o bajo
petición), sin depender del contenedor sidecar `migrate` de Docker Compose ni de
la CLI de golang-migrate invocada vía `go run` (Makefile).

Esto es prerrequisito para el modo desktop (T2): el sidecar no puede ejecutar
otro contenedor ni asumir que el host tiene `migrate` instalado.

## Contexto (censo actual)

- Migraciones: 11 pares up/down en `backend/migrations/` (`000001` … `000011`,
  sin `000009`), SQL puro sobre tablas `vaults`, `documents`, `document_links`,
  `projects`, `tasks`, `editor_config`.
- La app no migra: `backend/internal/database/database.go` solo hace
  `sql.Open("sqlite", cfg.URI)` con `github.com/glebarez/go-sqlite`.
- Las migraciones corren fuera del binario: Makefile (`migrate-up` vía
  `go run .../cmd/migrate@v4.19.1`), y el stage `migrate` de
  `backend/Dockerfile` usado por docker-compose (dev y prod).
- `golang-migrate/migrate/v4` v4.19.1 ya está en el go.sum del repo (la invoca
  `go run` en el Makefile), pero no se parece directo en `backend/go.mod`.

## Alcance

- `backend/migrations/embed.go` (nuevo, paquete `migrations`)
- `backend/internal/database/migrate.go` (nuevo)
- `backend/internal/database/migrate_test.go` (nuevo)
- `backend/go.mod` / `go.sum` — **sin dependencias nuevas** (el runner es propio)
- ✅ No se toca `cmd/main.go` en esta tarea (eso es T2/T3)
- ✅ No se eliminan los contenedores `migrate` ni los targets de Make con CLI
  externa (deprecación T13); a partir de aquí, las rutas del binario pueden
  empezar a usar esta capacidad.

## Nota de implementación (T1) — desviación del plan

El plan original usaba la librería `golang-migrate/migrate/v4` (drivers
`source/iofs` + `database/sqlite`). **Es inviable en este repo:** el driver
`migrate/database/sqlite` importa en blanco `modernc.org/sqlite`, que registra
el driver `"sqlite"` — el mismo nombre que ya registra `glebarez/go-sqlite`. El
resultado es un `panic: sql: Register called twice for driver sqlite` (probado).

Decisión: implementar un **runner de migraciones propio y mínimo** (~180 LOC,
sin dependencias nuevas) que replica la semántica de golang-migrate:
misma tabla de control `schema_migrations (version uint64, dirty bool)`,
`dirty=true` antes de ejecutar cada migración y `false` después, ejecución por
transacción. Se descartaron las alternativas (goose → tabla de control distinta,
rompe interoperabilidad; driver `sqlite3` → cgo, rompe cross-compile).

## Comportamiento (implementado)

1. **Embedded FS:** `backend/migrations/embed.go` (paquete `migrations`)
   declara `//go:embed *.sql` y exporta `migrations.FS`. Consume los archivos
   reales (up y down) sin moverlos, así el CLI/Docker y `sqlc` siguen igual.
2. **API pública:** `database.Migrate(db Database, migrationsFS fs.FS) error`
   (`backend/internal/database/migrate.go`), genérica sobre cualquier `fs.FS`.
3. **Semántica:** crea `schema_migrations (version uint64, dirty bool)` si no
   existe; lee la versión; si `dirty` → error que envuelve `ErrDirtyDatabase`
   sin aplicar nada; en caso contrario aplica en orden ascendente cada migración
   con versión > actual, marcando `dirty=true` → ejecutando en transacción →
   `dirty=false`.
4. **Down-migrations:** presentes en el FS, ignoradas (solo se consumen
   `*.up.sql`).
5. **Interoperabilidad:** misma tabla de control y misma secuencia numérica que
   golang-migrate → el sidecar `migrate` de Docker Compose puede seguir
   operando sobre la misma DB.

## Criterios de aceptación

- `database.Migrate(db, migrationsFS)` crea todas las tablas + `schema_migrations`
  con versión final `11` y `dirty=false` sobre una DB vacía (`t.TempDir()`).
- Segunda invocación consecutiva: `nil` (idempotente), sin cambios.
- Si la DB está en versión intermedia (crear con aplicando solo 1–3 migraciones
  vía helper del test), la siguiente llamada aplica *solo* las restantes.
- Si `dirty=true` simulado (insert manual en `schema_migrations`), `Migrate`
  devuelve error y NO aplica nada.
- `schema_migrations` (formato de golang-migrate) es la tabla de control; **no**
  crear una tabla de control propia.
- `make test` pasa; el resto de tests existentes sin cambios.
- La imagen sidecar `migrate` de Docker Compose sigue funcionando (no se toca).

## Verificación

```bash
make test
# smoke manual (sin contenedor): DB temporal + binario de migración embebida
go -C backend test ./internal/database/ -run TestMigrate -v
```

## Fuera de alcance

- Llamar `Migrate` desde `cmd/main.go` (T2).
- Flags CLI de migración (`--migrate-only`, etc.) (T2, si hace falta).
- Deprecar targets de Make con CLI externa (T13).
