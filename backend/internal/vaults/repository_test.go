// Package vaults
package vaults

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/glebarez/go-sqlite"

	sqlc "ink-readable/internal/sqlc/generated"
)

func newTestRepository(t *testing.T) (*VaultsRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE vaults (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		deleted    INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE documents (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		vault_id TEXT NOT NULL,
		path TEXT NOT NULL,
		content TEXT NOT NULL,
		deleted INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create documents table: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE trash_items (
		id TEXT PRIMARY KEY,
		vault_id TEXT NOT NULL,
		resource_id TEXT NOT NULL,
		resource_type TEXT NOT NULL,
		path TEXT NOT NULL,
		parent_id TEXT,
		deleted_at TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create trash_items table: %v", err)
	}

	return NewVaultRepository(*sqlc.New(db), db), db
}

func getVault(t *testing.T, db *sql.DB, id string) (name string, deleted int64, createdAt, updatedAt string) {
	t.Helper()

	err := db.QueryRowContext(
		context.Background(),
		"SELECT name, deleted, created_at, updated_at FROM vaults WHERE id = ?", id,
	).Scan(&name, &deleted, &createdAt, &updatedAt)
	if err != nil {
		t.Fatalf("select vault: %v", err)
	}

	return name, deleted, createdAt, updatedAt
}

func TestVaultsRepository_Create(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Reading")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	name, deleted, createdAt, updatedAt := getVault(t, db, vault.ID)
	if name != vault.Name {
		t.Errorf("expected name %q, got %q", vault.Name, name)
	}
	if deleted != 0 {
		t.Errorf("expected deleted 0, got %d", deleted)
	}
	if want := vault.CreatedAt.Format(time.RFC3339Nano); createdAt != want {
		t.Errorf("expected created_at %q, got %q", want, createdAt)
	}
	if want := vault.UpdatedAt.Format(time.RFC3339Nano); updatedAt != want {
		t.Errorf("expected updated_at %q, got %q", want, updatedAt)
	}
}

func TestVaultsRepository_Create_DeletedVault(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Reading")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	vault.Deleted = true

	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, deleted, _, _ := getVault(t, db, vault.ID); deleted != 1 {
		t.Errorf("expected deleted 1, got %d", deleted)
	}
}

func TestVaultsRepository_Rename(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Old name")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.Rename(ctx, vault.ID, "New name"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	name, _, _, updatedAt := getVault(t, db, vault.ID)
	if name != "New name" {
		t.Errorf("expected name %q, got %q", "New name", name)
	}
	if updatedAt == "" {
		t.Error("expected updated_at to be set")
	}
}

func TestVaultsRepository_Rename_EmptyName(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Reading")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.Rename(ctx, vault.ID, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if name, _, _, _ := getVault(t, db, vault.ID); name != "Reading" {
		t.Errorf("expected name to remain %q, got %q", "Reading", name)
	}
}

func TestVaultsRepository_Rename_UpdatesChildren(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("notes")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	_, err = db.Exec(`INSERT INTO documents
		(id, name, vault_id, path, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"document-id", "note", vault.ID, "/notes/note.md", "content", "now", "now")
	if err != nil {
		t.Fatalf("insert document: %v", err)
	}
	_, err = db.Exec(`INSERT INTO trash_items
		(id, vault_id, resource_id, resource_type, path, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		"trash-id", vault.ID, "document-id", "document", "/notes/deleted.md", "now")
	if err != nil {
		t.Fatalf("insert trash item: %v", err)
	}

	if err := repo.Rename(ctx, vault.ID, "archive"); err != nil {
		t.Fatalf("unexpected rename error: %v", err)
	}

	var vaultName, documentPath, trashPath string
	if err := db.QueryRow("SELECT name FROM vaults WHERE id = ?", vault.ID).Scan(&vaultName); err != nil {
		t.Fatalf("read vault: %v", err)
	}
	if err := db.QueryRow("SELECT path FROM documents WHERE id = ?", "document-id").Scan(&documentPath); err != nil {
		t.Fatalf("read document: %v", err)
	}
	if err := db.QueryRow("SELECT path FROM trash_items WHERE id = ?", "trash-id").Scan(&trashPath); err != nil {
		t.Fatalf("read trash item: %v", err)
	}

	if vaultName != "archive" {
		t.Errorf("expected vault name %q, got %q", "archive", vaultName)
	}
	if documentPath != "/archive/note.md" {
		t.Errorf("expected document path %q, got %q", "/archive/note.md", documentPath)
	}
	if trashPath != "/archive/deleted.md" {
		t.Errorf("expected trash path %q, got %q", "/archive/deleted.md", trashPath)
	}
}

func TestVaultsRepository_Rename_RollsBackOnVaultUpdateError(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("notes")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO documents
		(id, name, vault_id, path, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"document-id", "note", vault.ID, "/notes/note.md", "content", "now", "now"); err != nil {
		t.Fatalf("insert document: %v", err)
	}
	if _, err := db.Exec(`CREATE TRIGGER reject_vault_rename
		BEFORE UPDATE OF name ON vaults
		BEGIN SELECT RAISE(ABORT, 'rename rejected'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if err := repo.Rename(ctx, vault.ID, "archive"); err == nil {
		t.Fatal("expected rename error")
	}

	var vaultName, documentPath string
	if err := db.QueryRow("SELECT name FROM vaults WHERE id = ?", vault.ID).Scan(&vaultName); err != nil {
		t.Fatalf("read vault: %v", err)
	}
	if err := db.QueryRow("SELECT path FROM documents WHERE id = ?", "document-id").Scan(&documentPath); err != nil {
		t.Fatalf("read document: %v", err)
	}
	if vaultName != "notes" || documentPath != "/notes/note.md" {
		t.Fatalf("expected rollback, got vault %q and document path %q", vaultName, documentPath)
	}
}

func TestVaultsRepository_Delete(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Reading")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.Delete(ctx, vault.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, deleted, _, updatedAt := getVault(t, db, vault.ID)
	if deleted != 1 {
		t.Errorf("expected deleted 1, got %d", deleted)
	}
	if updatedAt == "" {
		t.Error("expected updated_at to be set")
	}
}
