# T12 — Roadmap: updater, firma y notarización (NO implementar)

| | |
| :--- | :--- |
| **Fase** | Fase futura (decidido: separada de v1) |
| **Base** | `desktop-migration` (solo spec, no rama de implementación) |
| **Rama** | — (n/a) |
| **Depende de** | T11 (ciclo de release estable primero) |

## Objetivo de este documento

Registrar el roadmap y los prerequisitos de updater + firma para que la fase
futura arranque con contexto. **No es implementable ahora mismo.**

## Lo que cubrirá esa fase (a detallar entonces)

1. **Updater de Tauri 2:** ✅ implementado (ver `docs/desktop.md#updates`;
   check solo al arrancar + toast con "Update now").
   - `tauri_plugin_updater` (Builder en Rust), target `darwin-universal` si se
     decide binario univerarch macOS.
   - Endpoints de actualización: static JSON en GitHub Releases (patrón
     estándar de `tauri-action`) — no requiere servidor propio.
   - UX frontend: banner/version-check con `check()`, descarga con progress y
     `install() + restart()`.
   - Requiere claves de firma: `tauri signer generate` +
     `TAURI_SIGNING_PRIVATE_KEY`/password como secrets de CI → es UNIX la
     primera cosa que fuerza requisitos de seguridad del repo.
2. **macOS: Developer ID Application + notarization:**
   - Apple Developer Program (costo anual), certificado en Keychain del
     runner de CI (import con secret base64), `codesign` + `notarytool`
     (o lo maneja tauri-action con los env vars Apple).
   - Sin notarización: Gatekeeper de macOS bloquea con clic-derecho “Open”.
     Con updater firma: exigen11 candidatura fuerte del workflow.
3. **Windows: Authenticode:**
   - Cert. de firma (OV/EV) — EV evita SmartScreen acumulándose reputación,
     OV requiere reputación con instalaciones; decisión de presupuesto del
     owner.
   - `signtool` dentro de tauri-action (env vars) o post-bundle firmado a mano.
4. **Linux:** sin firma mandatoria (AppImage/deb pueden publicarse tal cual).
5. **Backend Go sidecar:** sin firma adicional propia en macOS (la .app entera
   se firma — el sidecar debe incluirse en el bundle firma scope: verificar
   que tauri-action firma/bundles los externalBin correctamente, es parte del
   detalle de la fase).

## Prerequisitos no técnicos (owner)

- Apple Developer ID + acceso App Store Connect (notarytool App password).
- Certificado Windows (tipo a decidir).
- Decidir cadencia de updates y estrategia de versionado
  (`desktop-v` tags → releases y publiquality del draft).

## Por qué no ahora

Los specs se escribieron para no bloquear la v1 distribuida: el release draft
funciona sin firma (con warnings del OS documentados en T14), y el updater
exige configurar secrets de firma antes de operar.
