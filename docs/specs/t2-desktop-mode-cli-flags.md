# T2 — Modo desktop por flags CLI

| | |
| :--- | :--- |
| **Fase** | 0 — Backend Go desktop-ready |
| **Base** | `feat/t1-embed-migrations` |
| **Rama** | `feat/t2-desktop-mode` |
| **Depende de** | T1 |

## Objetivo

Que el backend arranque **sin Vault, sin `.env` y sin entorno preconfigurado**
cuando se le invoca con flags de modo desktop:

```bash
ink-readable-api --desktop --port 0 --data-dir /abs/path/to/data
```

Ese es exactamente el contrato que Tauri (T5) usará para lanzar el sidecar.

## Contexto (censo actual)

- `backend/cmd/main.go`: carga `.env` con `godotenv.Load()`; si `ENV=development`
  lee todo de variables de entorno (`LoadEnvConfig`); si no, pide los secrets a
  un servicio Vault externo (`LoadConfig` con `VaultClient`). **Ambos caminos
  fallan si no hay config**: el binario es inarrancable sin una de las dos.
- Puerto y bind: `APP_BASE_URL` (p. ej. `0.0.0.0`) + `APP_PORT` (`8082`).
- DB: `DATABASE_URI` (ruta del archivo sqlite en el nodo).
- No hay migraciones ejecutadas por el binario (T1 lo resuelve).
- `GET /api/v1/config` devuelve `{}` en dev (`FrontConfig` vacío); en modo Vault
  incluso deja de poblarse. `useSecrets` del frontend no lo usa (solo su test),
  así que en desktop se puede responder `{}` sin romper nada.
- `main.go` imprime la config completa con `fmt.Println(*cfg)`, incluido
  `db.password` — en desktop no hay secrets, pero se elimina ese print igualmente.

## Alcance

- `backend/cmd/main.go`
- `backend/internal/config/desktop.go` (nuevo) + `desktop_test.go`
- (Opcional, si T1 eligió putear los migrations en `cmd`) wiring de `Migrate`.

## Comportamiento

1. **Parseo de flags (libstd `flag`):**
   - `--desktop` (bool, default `false`): activa el modo desktop.
   - `--port` (int, default `0`): puerto de escucha; `0` = efímero.
   - `--data-dir` (string, obligatorio si `--desktop`): directorio absoluto
     donde vive el archivo SQLite.
   - `flag.Parse()` **antes** de `godotenv.Load()`; si `--desktop`, se ignora
     por completo `.env` / Vault / `ENV`.
2. **Resolución de config en modo desktop:**
   - `DATABASE_URI := filepath.Join(dataDir, "ink-readable.db")`
   - `APP_BASE_URL := "127.0.0.1"` — el sidecar solo debe accesible proceso-local.
   - `APP_PORT := flag port` (string para el/los formatos existentes).
   - Migraciones: se aplican al arrancar con `database.Migrate` (T1). Si
     fallan → `log.Fatal` (el shell padre interpretará el exit != 0).
3. **Handshake por stdout:** tras `net.Listen` (bind efectivo, antes de servir),
   el binario imprime **una única línea canónica**:
   ```text
   __INK_API_READY__ http://127.0.0.1:<port>
   ```
   - Puerto real resuelto (con `--port 0` el SO asigna uno) — se lee del
     `net.Listener.Addr()`; nunca se adivina.
   - Flush inmediato (stdout sin buffer al usar `fmt.Fprintf(os.Stdout)` seguido
     de nada: fmt no bufferiza; garantizar newline).
   - El `log.Printf("API listening on http://%s")` actual puede quedarse (con
     puerto real), pero la línea canónica es la autoridad para el shell (T5).
4. **`GET /api/v1/config` en desktop:** devolver `{}` (200) — mismo contrato
   Zod del frontend (`secretsSchema = z.record(string, string)`). Implementación
   mínima: en desktop, `ConfigService` se construye con `FrontConfig` vacío.
5. **Modo legacy intacto:** sin `--desktop`, el `main.go` actual se comporta
   exactamente igual (godotenv + ENV/Vault, migrate sidecar opcional, sin
   handshake line). El handshake y los flags solo existen en `--desktop`.
6. **Señales del bind address:** eliminar `fmt.Println(*cfg)` (fuga de
   secrets en modo Vault; en desktop no hay, pero se limpia igual).

## Criterios de aceptación

- Test e2e en Go (`backend/cmd/main_test.go`): compila el binario, lo lanza con
  `--desktop --port 0 --data-dir <tmpdir>`, parsea stdout
  (`__INK_API_READY__ http://127.0.0.1:<port>`), `GET /health` 200 y
  `GET /api/v1/vaults` 200 (las migraciones embebidas corren al arrancar).
- `--desktop` sin `--data-dir` → error de CLI (exit != 0, mensaje menciona
  `--data-dir`).
- `--port 8083` explícito respeta el puerto (unit test en
  `internal/config/desktop_test.go`).
- Sin flags y con `.env` de desarrollo: comportamiento idéntico al actual
  (regresión cubierta por tests existentes de config).
- Ningún log imprime secrets (regresión: `fmt.Println(*cfg)` eliminado).

## Verificación

```bash
make test
# e2e manual
go -C backend build -o /tmp/ink-api ./cmd
/tmp/ink-api --desktop --port 0 --data-dir /tmp/ink-data &
# → stdout: __INK_API_READY__ http://127.0.0.1:<port>
curl http://127.0.0.1:<port>/health
```

## Fuera de alcance

- Graceful shutdown y exit 0 en SIGTERM (T3).
- Terminar el proceso desde el shell (T5).
- Auth local en la API: en desktop el proceso escucha solo en `127.0.0.1`
  (accesible únicamente desde la máquina del usuario), así que la autenticación
  local se pospone — ver el roadmap en T12.

## Nota de implementación (T2)

- `runDesktop` (en `cmd/main.go`) resuelve config con
  `config.LoadDesktopConfig`, crea el data dir (`os.MkdirAll`), abre SQLite,
  aplica `database.Migrate(db, migrations.FS)`, hace `net.Listen` y **entonces**
  imprime la línea `__INK_API_READY__ http://<listener.Addr()>`. El servidor
  sirve con `http.Serve`; el shutdown limpio llega en T3.
- `runLegacy` conserva el camino original (godotenv + ENV/Vault) y `newHandler`
  factoriza el wiring común de servicios; se eliminó el volcado `fmt.Println(*cfg)`.
- `/config` en desktop devuelve `{}` (mismo contrato que el frontend espera).
