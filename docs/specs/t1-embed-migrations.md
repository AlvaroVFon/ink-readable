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

- `backend/internal/database/migrate.go` (nuevo)
- `backend/internal/database/migrate_test.go` (nuevo)
- `backend/go.mod` / `go.sum`
- ✅ No se toca `cmd/main.go` en esta tarea (eso es T2/T3)
- ✅ No se eliminan los contenedores `migrate` ni los targets de Make con CLI
  externa (deprecación T13); a partir de aquí, las rutas del binario pueden
  empezar a usar esta capacidad.

## Comportamiento

1. **Embebido:** `//go:embed migrations/*.sql` en un paquete de
   `backend/internal` (p. ej. `internal/database`) con Acceder a un
   `embed.FS` que contiene *todos* los archivos `.sql` con sus nombres
   originales (`000001_create_vaults_table.up.sql`, ...). golang-migrate tiene
   source driver `iofs` que consume exactamente ese FS.
   - ⚠️ `embed` exige que los archivos estén bajo el directorio del paquete
     Go. Como `migrations/` está en `backend/` (fuera de `internal/`), el
     patrón debe referenciar la ruta relativa correcta (`embed` no permite
     `..`). Si es inviable desde `internal/...`, opción válida: crear un
     paquete puente `backend/internal/database/migrations/` (espejo de
     `backend/migrations/`, solo archivos SQL) o mover el paquete de migración
     a `backend/migrations/doc.go` con `//go:embed`. Decidir en implementación
     y documentar en el PR.
2. **API pública nueva:**
   ```go
   package database
   // Migrate aplica todas las migraciones up pendientes sobre db
   // usando los archivos SQL embebidos. Es idempotente.
   func Migrate(db Database, migrationsFS fs.FS) error
   ```
   - Usa `migrate.NewWithInstance` con source `iofs` y la `*sql.DB` ya abierta
     vía `database/sqlite3` + `WithInstance` (evita segundo pool).
   - `DirtyDatabase` (versión con dirty=true) → error explícito con mensaje
     claro (y sugerencia de `migrate force <version>` para recuperar).
3. **Down-migrations:** los pares `.down.sql` también viajan embebidos; se
   registran en el schema pero no se ejecutan automáticamente.
4. **Modo "fake":** los archivos `.sql` viven en un sub_directorio cuyo nombre
   golang-migrate espera con formato `NNN_%s.up.sql`. Si el nombre real
   difiere del esperado por iofs/migrate, separar por extensión igual que hace
   el CLI (`.` separador estándar de golang-migrate para `.up.sql`/`.down.sql`).
5. **Compatibilidad:** el sidecar `migrate` de Docker Compose ejecuta el mismo
   SQL sobre la misma DB; los dos caminos (embebido y CLI) deben dar el mismo
   estado final. Como comparten `schema_migrations` de golang-migrate (misma
   herramienta, mismas numeraciones), los dos caminos son interoperables.

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
