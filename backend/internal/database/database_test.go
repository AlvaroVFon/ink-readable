// Package database
package database

import (
	"database/sql"
	"path/filepath"
	"testing"

	"ink-readable/internal/config"
)

func TestNewDatabase(t *testing.T) {
	cfg := config.DatabaseConfig{URI: filepath.Join(t.TempDir(), "ink.db")}

	db, err := NewDatabase(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if db == nil {
		t.Fatal("expected non-nil database")
	}

	sqlDB := (*sql.DB)(db)
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := sqlDB.Ping(); err != nil {
		t.Fatalf("ping: %v", err)
	}
}

func TestNewDatabase_UsableConnection(t *testing.T) {
	cfg := config.DatabaseConfig{URI: filepath.Join(t.TempDir(), "ink.db")}

	db, err := NewDatabase(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sqlDB := (*sql.DB)(db)
	t.Cleanup(func() { _ = sqlDB.Close() })

	if _, err := sqlDB.Exec("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT)"); err != nil {
		t.Fatalf("create table: %v", err)
	}
	if _, err := sqlDB.Exec("INSERT INTO books (title) VALUES (?)", "Moby Dick"); err != nil {
		t.Fatalf("insert: %v", err)
	}

	var title string
	if err := sqlDB.QueryRow("SELECT title FROM books WHERE id = 1").Scan(&title); err != nil {
		t.Fatalf("select: %v", err)
	}
	if title != "Moby Dick" {
		t.Errorf("expected title %q, got %q", "Moby Dick", title)
	}
}

func TestNewDatabase_DirectoryURI(t *testing.T) {
	db, err := NewDatabase(config.DatabaseConfig{URI: t.TempDir()})
	if err != nil {
		return
	}

	sqlDB := (*sql.DB)(db)
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := sqlDB.Ping(); err == nil {
		t.Fatal("expected error when the URI points to a directory instead of a database file")
	}
}
