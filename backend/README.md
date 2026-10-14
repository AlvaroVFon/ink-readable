# Ink Readable Backend

API en Go para gestionar vaults, documentos Markdown y el planner. Usa SQLite
como persistencia. En la app de escritorio corre como **sidecar** del shell
Tauri; también puede ejecutarse como servidor web para desarrollo.

## Arquitectura

- `cmd/`: punto de entrada. Interpreta los flags de modo escritorio (`runDesktop`)
  o el modo web (`runLegacy`).
- `internal/config/`: carga configuración (Vault o `.env`) y resolución del modo
  escritorio (`LoadDesktopConfig`).
- `internal/database/`: conexión SQLite, transacciones y runner de migraciones.
- `internal/vaults/`, `internal/documents/`, `internal/planner/…`: dominio,
  repository y service.
- `internal/editor/config/`: preferencias del editor.
- `internal/sqlc/`: queries SQL y código generado por sqlc.
- `migrations/`: migraciones versionadas de SQLite, **embebidas** en el binario
  (`migrations/embed.go`).

El borrado de documentos es lógico (`documents.deleted`). El borrado permanente
elimina también los `document_links` relacionados. El borrado de un vault
elimina sus documentos y enlaces dentro de una transacción.

## Modo escritorio

La app de escritorio lanza el binario así:

```bash
ink-readable-api --desktop --port 0 --data-dir /ruta/absoluta/data
```

- No lee `.env` ni Vault.
- Escucha en `127.0.0.1` (loopback), con puerto efímero (`--port 0`).
- Guarda la base de datos en `<data-dir>/ink-readable.db`.
- Aplica las **migraciones embebidas** al arrancar.
- Imprime en stdout la línea `__INK_API_READY__ http://127.0.0.1:<puerto>` cuando
  está listo, y cierra limpio con SIGINT/SIGTERM.

Para desarrollo del frontend sin el shell:

```bash
./scripts/run-backend-dev.sh      # escucha en :8082 (default del proxy de Vite)
```

## Modo web (desarrollo)

Lee la configuración desde Vault o, con `ENV=development`, desde `backend/.env`:

```bash
cp backend/.env.example backend/.env
make up-dev          # backend + migraciones + Vite en Docker
```

El backend escucha en `http://localhost:8082`. Endpoint de salud: `GET /health`.

## Migraciones

El binario aplica las migraciones embebidas al arrancar en modo escritorio,
manteniendo la tabla `schema_migrations` compatible con el CLI de golang-migrate.
Los comandos con el CLI externo siguen disponibles:

```bash
make migrate-up
make migrate-version
make db-reset
make sqlc-generate
make sqlc-vet
```

`DB_PATH` (por defecto `backend/data/ink-readable.db`) lo usan esos comandos.

## Build y tests

```bash
make build     # binario del API
make test      # go test ./...
make run       # ejecuta en modo web (requiere backend/.env)
```
