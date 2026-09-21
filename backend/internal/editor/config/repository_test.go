// Package editorconfig
package editorconfig

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	_ "github.com/glebarez/go-sqlite"

	sqlc "ink-readable/internal/sqlc/generated"
)

func newTestRepository(t *testing.T) (*EditorConfigRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE editor_config (
		id         TEXT PRIMARY KEY,
		dark_theme INTEGER NOT NULL DEFAULT 1,
		vim_motion INTEGER NOT NULL DEFAULT 1,
		updated_at TEXT
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return NewEditorConfigRepository(*sqlc.New(db)), db
}

func insertDefaultConfig(t *testing.T, db *sql.DB, darkTheme, vimMotion int) {
	t.Helper()

	if _, err := db.Exec(
		`INSERT INTO editor_config (id, dark_theme, vim_motion, updated_at) VALUES (?, ?, ?, ?)`,
		DefaultID, darkTheme, vimMotion, nil,
	); err != nil {
		t.Fatalf("insert editor config: %v", err)
	}
}

func readConfig(t *testing.T, db *sql.DB) (darkTheme, vimMotion int64, updatedAt sql.NullString) {
	t.Helper()

	err := db.QueryRow(
		"SELECT dark_theme, vim_motion, updated_at FROM editor_config WHERE id = ?", DefaultID,
	).Scan(&darkTheme, &vimMotion, &updatedAt)
	if err != nil {
		t.Fatalf("select editor config: %v", err)
	}

	return darkTheme, vimMotion, updatedAt
}

func TestEditorConfigRepository_Get(t *testing.T) {
	repo, db := newTestRepository(t)
	insertDefaultConfig(t, db, 1, 0)

	config, err := repo.Get(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if config.ID != DefaultID {
		t.Errorf("expected id %q, got %q", DefaultID, config.ID)
	}
	if !config.DarkTheme {
		t.Errorf("expected dark_theme true, got false")
	}
	if config.VimMotion {
		t.Errorf("expected vim_motion false, got true")
	}
}

func TestEditorConfigRepository_Get_NotFound(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.Get(context.Background()); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestEditorConfigRepository_Get_QueryError(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	repo := NewEditorConfigRepository(*sqlc.New(db))

	if _, err := repo.Get(context.Background()); err == nil {
		t.Fatal("expected query error, got nil")
	}
}

func TestEditorConfigRepository_UpdateDarkTheme(t *testing.T) {
	repo, db := newTestRepository(t)
	insertDefaultConfig(t, db, 1, 1)

	if err := repo.UpdateDarkTheme(context.Background(), false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	darkTheme, vimMotion, updatedAt := readConfig(t, db)
	if darkTheme != 0 {
		t.Errorf("expected dark_theme 0, got %d", darkTheme)
	}
	if vimMotion != 1 {
		t.Errorf("expected vim_motion to remain 1, got %d", vimMotion)
	}
	if !updatedAt.Valid || updatedAt.String == "" {
		t.Errorf("expected updated_at to be set, got %+v", updatedAt)
	}
}

func TestEditorConfigRepository_UpdateVimMotion(t *testing.T) {
	repo, db := newTestRepository(t)
	insertDefaultConfig(t, db, 1, 1)

	if err := repo.UpdateVimMotion(context.Background(), false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	darkTheme, vimMotion, updatedAt := readConfig(t, db)
	if vimMotion != 0 {
		t.Errorf("expected vim_motion 0, got %d", vimMotion)
	}
	if darkTheme != 1 {
		t.Errorf("expected dark_theme to remain 1, got %d", darkTheme)
	}
	if !updatedAt.Valid || updatedAt.String == "" {
		t.Errorf("expected updated_at to be set, got %+v", updatedAt)
	}
}

func TestEditorConfigRepository_UpdateDarkTheme_NoRows(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateDarkTheme(context.Background(), false); err != nil {
		t.Fatalf("expected update on missing row to be a no-op, got %v", err)
	}
}

func TestEditorConfigRepository_UpdateVimMotion_NoRows(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateVimMotion(context.Background(), false); err != nil {
		t.Fatalf("expected update on missing row to be a no-op, got %v", err)
	}
}
