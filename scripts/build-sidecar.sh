#!/usr/bin/env bash
#
# Compiles the Go backend into the target-triple names the Tauri bundler expects
# for `bundle.externalBin`, into frontend/src-tauri/binaries/.
#
#   ./scripts/build-sidecar.sh               # host target only
#   ./scripts/build-sidecar.sh --targets all # every desktop target (cross-compile)
#
# The Go SQLite driver is pure Go, so CGO is disabled and cross-compiling works
# from any host.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$root_dir/frontend/src-tauri/binaries"

# goos/goarch -> Rust target triple
targets=(
  "darwin/arm64:aarch64-apple-darwin"
  "darwin/amd64:x86_64-apple-darwin"
  "linux/amd64:x86_64-unknown-linux-gnu"
  "linux/arm64:aarch64-unknown-linux-gnu"
  "windows/amd64:x86_64-pc-windows-msvc"
)

build_target() {
  local goos="$1" goarch="$2" triple="$3" ext=""
  if [ "$goos" = "windows" ]; then
    ext=".exe"
  fi

  mkdir -p "$out_dir"
  echo "sidecar: $goos/$goarch -> ink-readable-api-$triple$ext"
  CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
    go -C "$root_dir/backend" build -trimpath -ldflags "-s -w" \
    -o "$out_dir/ink-readable-api-$triple$ext" ./cmd
}

goos_goarch_from_triple() {
  local triple="$1"
  case "$triple" in
    *windows*) goos="windows" ;;
    *darwin*) goos="darwin" ;;
    *linux*) goos="linux" ;;
    *) echo "unsupported host triple: $triple" >&2; exit 1 ;;
  esac
  case "$triple" in
    *aarch64*) goarch="arm64" ;;
    *x86_64*) goarch="amd64" ;;
    *) echo "unsupported host arch: $triple" >&2; exit 1 ;;
  esac
}

if [ "${1:-}" = "--targets" ] && [ "${2:-}" = "all" ]; then
  for entry in "${targets[@]}"; do
    pair="${entry%%:*}"   # goos/goarch
    triple="${entry##*:}" # rust target triple
    build_target "${pair%%/*}" "${pair##*/}" "$triple"
  done
  exit 0
fi

# Host-only build: ask rustc for the exact triple so it matches the shell.
if ! command -v rustc >/dev/null 2>&1; then
  echo "rustc not found; install Rust or run with --targets all" >&2
  exit 1
fi

host_triple="$(rustc -vV | sed -n 's/^host: //p')"
goos_goarch_from_triple "$host_triple"
build_target "$goos" "$goarch" "$host_triple"
