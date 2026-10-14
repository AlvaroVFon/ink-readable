//go:build !windows

package main

import (
	"database/sql"
	"net/http"
	"path/filepath"
	"syscall"
	"testing"
	"time"

	_ "github.com/glebarez/go-sqlite"
)

// TestDesktopModeGracefulShutdown checks that SIGTERM drains the server, closes
// the database and exits with code 0, leaving a healthy SQLite file behind.
func TestDesktopModeGracefulShutdown(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping desktop end-to-end test in -short mode")
	}

	dataDir := filepath.Join(t.TempDir(), "data")
	baseURL, cmd := startDesktop(t, dataDir)

	assertStatus(t, baseURL+"/health", http.StatusOK)

	if err := cmd.Process.Signal(syscall.SIGTERM); err != nil {
		t.Fatalf("send SIGTERM: %v", err)
	}

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("expected a clean exit (code 0), got: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for a graceful shutdown")
	}

	db, err := sql.Open("sqlite", filepath.Join(dataDir, "ink-readable.db"))
	if err != nil {
		t.Fatalf("reopen database: %v", err)
	}
	defer func() { _ = db.Close() }()

	var integrity string
	if err := db.QueryRow("PRAGMA integrity_check").Scan(&integrity); err != nil {
		t.Fatalf("integrity check: %v", err)
	}
	if integrity != "ok" {
		t.Errorf("expected a healthy database after shutdown, got %q", integrity)
	}
}
