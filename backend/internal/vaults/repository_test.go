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

	return NewVaultRepository(*sqlc.New(db)), db
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

func TestVaultsRepository_UpdateName(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Old name")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.UpdateName(ctx, vault.ID, "New name"); err != nil {
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

func TestVaultsRepository_UpdateName_EmptyName(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	vault, err := NewVault("Reading")
	if err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}
	if err := repo.Create(ctx, *vault); err != nil {
		t.Fatalf("unexpected error creating vault: %v", err)
	}

	if err := repo.UpdateName(ctx, vault.ID, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if name, _, _, _ := getVault(t, db, vault.ID); name != "Reading" {
		t.Errorf("expected name to remain %q, got %q", "Reading", name)
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
