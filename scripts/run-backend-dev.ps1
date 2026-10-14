# Builds and runs the Go backend in desktop mode without the Tauri shell, so the
# frontend can be developed against the real API.
#
# It listens on the same port the Vite dev proxy targets by default (8082), so
# `pnpm dev` + this script replace the Docker dev stack:
#
#   .\scripts\run-backend-dev.ps1          # one terminal
#   cd frontend; pnpm dev                  # another terminal
#
# Env overrides: INKB_DEV_PORT (default 8082), INKB_DEV_DATA_DIR (default .dev-data).
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$dataDir = if ($env:INKB_DEV_DATA_DIR) { $env:INKB_DEV_DATA_DIR } else { Join-Path $rootDir ".dev-data" }
$port = if ($env:INKB_DEV_PORT) { $env:INKB_DEV_PORT } else { "8082" }
$binary = Join-Path $env:TEMP "ink-readable-api.exe"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
go -C (Join-Path $rootDir "backend") build -o $binary ./cmd

& $binary --desktop --port $port --data-dir $dataDir
