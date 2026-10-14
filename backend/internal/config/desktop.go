package config

import (
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
)

// DesktopHost is the loopback address the desktop sidecar binds to. The process
// is reachable only locally, from the Tauri webview.
const DesktopHost = "127.0.0.1"

// DesktopDatabaseFile is the SQLite file created inside the desktop data dir.
const DesktopDatabaseFile = "ink-readable.db"

// ErrMissingDataDir is returned when desktop mode is requested without a data
// directory to store the database in.
var ErrMissingDataDir = errors.New("missing data dir")

// DesktopOptions are the resolved desktop runtime options, parsed from the CLI
// flags (see cmd/main.go).
type DesktopOptions struct {
	DataDir string
	Port    int
}

// LoadDesktopConfig builds the runtime config for desktop (sidecar) mode
// without reading .env or Vault: loopback bind, a SQLite file inside dataDir,
// and no front-end secrets. A port of 0 asks the OS for a free port.
func LoadDesktopConfig(opts DesktopOptions) (*Config, error) {
	if opts.DataDir == "" {
		return nil, fmt.Errorf("%w: --data-dir is required with --desktop", ErrMissingDataDir)
	}
	if opts.Port < 0 || opts.Port > 65535 {
		return nil, fmt.Errorf("invalid port %d: must be within 0-65535", opts.Port)
	}

	return &Config{
		AppConfig: AppConfig{
			BaseURL: DesktopHost,
			Port:    strconv.Itoa(opts.Port),
		},
		DatabaseConfig: DatabaseConfig{
			URI: filepath.Join(opts.DataDir, DesktopDatabaseFile),
		},
		FrontConfig: FrontConfig{},
	}, nil
}
