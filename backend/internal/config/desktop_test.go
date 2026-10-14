package config

import (
	"errors"
	"path/filepath"
	"testing"
)

func TestLoadDesktopConfig(t *testing.T) {
	dataDir := t.TempDir()

	cfg, err := LoadDesktopConfig(DesktopOptions{DataDir: dataDir, Port: 0})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.AppConfig.BaseURL != DesktopHost {
		t.Errorf("expected base URL %q, got %q", DesktopHost, cfg.AppConfig.BaseURL)
	}
	if cfg.AppConfig.Port != "0" {
		t.Errorf("expected port %q, got %q", "0", cfg.AppConfig.Port)
	}

	wantURI := filepath.Join(dataDir, DesktopDatabaseFile)
	if cfg.DatabaseConfig.URI != wantURI {
		t.Errorf("expected database URI %q, got %q", wantURI, cfg.DatabaseConfig.URI)
	}
	if cfg.FrontConfig != (FrontConfig{}) {
		t.Errorf("expected empty front config, got %+v", cfg.FrontConfig)
	}
}

func TestLoadDesktopConfig_ExplicitPort(t *testing.T) {
	cfg, err := LoadDesktopConfig(DesktopOptions{DataDir: t.TempDir(), Port: 8083})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.AppConfig.Port != "8083" {
		t.Errorf("expected port %q, got %q", "8083", cfg.AppConfig.Port)
	}
}

func TestLoadDesktopConfig_MissingDataDir(t *testing.T) {
	_, err := LoadDesktopConfig(DesktopOptions{})
	if !errors.Is(err, ErrMissingDataDir) {
		t.Fatalf("expected ErrMissingDataDir, got %v", err)
	}
}

func TestLoadDesktopConfig_InvalidPort(t *testing.T) {
	if _, err := LoadDesktopConfig(DesktopOptions{DataDir: t.TempDir(), Port: -1}); err == nil {
		t.Fatal("expected an error for a negative port")
	}
	if _, err := LoadDesktopConfig(DesktopOptions{DataDir: t.TempDir(), Port: 70000}); err == nil {
		t.Fatal("expected an error for a port above 65535")
	}
}
