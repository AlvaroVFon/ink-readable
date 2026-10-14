# T3 — Graceful shutdown del backend

| | |
| :--- | :--- |
| **Fase** | 0 — Backend Go desktop-ready |
| **Base** | `feat/t2-desktop-mode` |
| **Rama** | `feat/t3-graceful-shutdown` |
| **Depende de** | T2 |

## Objetivo

El backend cierra limpio (listener, conexiones en vuelo y DB) cuando recibe
SIGINT/SIGTERM, y no corrompe la base SQLite. Importante para desktop donde el
shell (T5) mata el sidecar al cerrar la ventana.

## Contexto (censo actual)

- `cmd/main.go` termina con `log.Fatal(http.ListenAndServe(...))`: sin shutdown,
  sin cierre de DB, sin manejo de señales. En Linux/macOS un SIGTERM mata el
  proceso inmediatamente; en Windows `child.kill()` de Tauri usa
  `taskkill/kill()`, que es duro (TerminateProcess) — de ahí la relevancia de
  hacer el cierre rápido y correcto, y de implementar el mismo flujo en las
  tres plataformas (Go maneja las señales en darwin/linux; en windows Go
  soporta os.Interrupt al menos con Ctrl-Break, y `child.kill` de Tauri usa
  terminar por handle).

## Alcance

- `backend/cmd/main.go`
- (opcional) `backend/internal/httpx/` para helpers de server con timeout.

## Comportamiento

1. `http.Server{Addr, Handler}` en lugar de `http.ListenAndServe`.
2. Señales: `signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`
   (en Windows, `syscall.SIGTERM` no existe igual/valid compile-time — usar
   build-tag-free: `os.Interrupt` siempre, y en un `//go:build !windows`
   añadir `syscall.SIGTERM`; compilar en las 3 plataformas en CI lo garantiza).
3. Al recibir señal (o kill del shell → señal equivalente):
   1. `server.Shutdown(ctx 5s)` — drena conexiones activas.
   2. `db.Close()` (cerrar SQLite; WAL checkpoint automático de sqlite).
   3. exit 0 (o 1 si hubo error de drain).
4. Handshake stdout: si el server nunca llegó a escuchar (error de bind), el
   proceso debe salir != 0 *antes* de imprimir `__INK_API_READY__` (esto ya lo
   garantiza T2); con este cambio además el exit debe ser rápido (< 1s).

## Criterios de aceptación

- Test Go que lanza el binario (modo desktop e2e como en T2), envía SIGTERM
  (unix) / CloseHandle-roundtrip simulado (windows via CI) y verifica:
  exit code 0, sin logs de pánico, y que la DB no queda en estado dirty
  (reabrir y `PRAGMA integrity_check` OK;ROUGH approximation aceptable:
  reabrir la DB y contar tablas).
- Timeout de 5s: si hay una conexión activa que no termina, el server aborta
  y sale igualmente (no se cuelga).
- Compila y pasa `make test` en linux; los specs de CI (T11) añaden matrices
  darwin/windows para el resto.

## Verificación

```bash
make test
# e2e manual (unix)
/tmp/ink-api --desktop --port 0 --data-dir /tmp/ink-data &
kill -TERM %1   # exit limpio en < 5s
```

## Fuera de alcance

- Protocolo de salud/readiness para el shell (T5 usa la línea de stdout; no
  se añade endpoint extra).
- Persistencia de “última sesión” u otro estado del shell (T5/T8).

## Nota de implementación (T3)

- `runDesktop` usa `http.Server{Handler}` + `signal.NotifyContext` con
  `interruptSignals()`, que vive en `cmd/signal_unix.go` (`os.Interrupt`,
  `syscall.SIGTERM`) y `cmd/signal_windows.go` (`os.Interrupt`) según build tag.
- Al recibir la señal: `stop()` restaura el comportamiento por defecto (una
  segunda señal fuerza la salida), `server.Shutdown` con `shutdownTimeout`
  (5s) drena y luego `db.Close()`. El proceso termina con exit 0.
- El test `cmd/shutdown_unix_test.go` envía SIGTERM, exige exit 0 y reabre la
  DB comprobando `PRAGMA integrity_check = ok`.
- El camino legacy (`runLegacy`) sigue con `http.ListenAndServe` (fuera del
  objetivo de la migración a escritorio).
