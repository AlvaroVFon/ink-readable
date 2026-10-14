#!/usr/bin/env bash
#
# Builds and runs the Go backend in desktop mode without the Tauri shell, so the
# frontend can be developed against the real API.
#
# It listens on the same port the Vite dev proxy targets by default (8082), so
# `pnpm dev` + this script replace the Docker dev stack:
#
#   ./scripts/run-backend-dev.sh          # one terminal
#   cd frontend && pnpm dev               # another terminal
#
# Env overrides: INKB_DEV_PORT (default 8082), INKB_DEV_DATA_DIR (default .dev-data).
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
data_dir="${INKB_DEV_DATA_DIR:-"$root_dir/.dev-data"}"
port="${INKB_DEV_PORT:-8082}"
binary="$(mktemp -d)/ink-readable-api"

mkdir -p "$data_dir"
go -C "$root_dir/backend" build -o "$binary" ./cmd

exec "$binary" --desktop --port "$port" --data-dir "$data_dir"
