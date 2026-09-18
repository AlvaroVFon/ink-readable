# Ink Readable Backend

Backend en Go para gestionar vaults y documentos Markdown. Usa SQLite como persistencia y el servicio Vault externo para la configuración.

## Arquitectura

- `cmd/`: punto de entrada del servidor.
- `internal/config/`: carga configuración y secretos desde Vault.
- `internal/database/`: conexión SQLite y transacciones.
- `internal/vaults/`: dominio, repository y service de vaults.
- `internal/documents/`: dominio, repository y service de documentos.
- `internal/sqlc/`: queries SQL y código generado por sqlc.
- `migrations/`: migraciones versionadas de SQLite.

El borrado de documentos es lógico (`documents.deleted`). El borrado permanente elimina también los `document_links` relacionados. El borrado de un vault elimina sus documentos y enlaces dentro de una transacción.

## Configuración

Copia `.env.example` a `.env` y configura el acceso al servicio Vault:

```bash
cp backend/.env.example backend/.env
```

La aplicación espera encontrar en Vault las claves de aplicación y base de datos, incluyendo `app.baseURL`, `app.port` y `db.uri`.

## Desarrollo

Desde la raíz del repositorio:

```bash
make up-dev
```

El backend escucha en `http://localhost:8082`. El endpoint disponible actualmente para comprobar el proceso es:

```text
GET /health
```

Para ejecutar las pruebas sin Docker:

```bash
make test
```

## Base de datos

Comandos habituales:

```bash
make migrate-up
make migrate-version
make db-reset
make sqlc-generate
make sqlc-vet
```

Las migraciones usan el archivo configurado por `DB_PATH`, cuyo valor predeterminado es `backend/data/ink-readable.db`.

## Build

```bash
make build
```
