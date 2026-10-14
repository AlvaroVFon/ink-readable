# Builds the Go backend sidecar for the current Windows host into
# frontend/src-tauri/binaries/ with the target-triple name the Tauri bundler
# expects. macOS/Linux devs use build-sidecar.sh instead.
#
#   .\scripts\build-sidecar.ps1
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $rootDir "frontend/src-tauri/binaries"

$triple = (& rustc -vV | Select-String '^host: ').ToString().Replace('host: ', '').Trim()

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$env:CGO_ENABLED = "0"
$env:GOOS = "windows"
$env:GOARCH = "amd64"

$outFile = Join-Path $outDir "ink-readable-api-$triple.exe"
Write-Host "sidecar: windows/amd64 -> ink-readable-api-$triple.exe"
go -C (Join-Path $rootDir "backend") build -trimpath -o $outFile ./cmd
