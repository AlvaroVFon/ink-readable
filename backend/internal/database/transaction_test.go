// Package database
package database

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	sqlc "ink-readable/internal/sqlc/generated"
)

const createTestTables = `
CREATE TABLE vaults (
	id         TEXT PRIMARY KEY,
	name       TEXT NOT NULL,
	deleted    INTEGER NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE TABLE trash_items (
	id            TEXT PRIMARY KEY,
	vault_id      TEXT NOT NULL,
	resource_id   TEXT NOT NULL,
	resource_type TEXT NOT NULL,
	path          TEXT NOT NULL,
	parent_id     TEXT,
	deleted_at    TEXT NOT NULL
);`

func newTransactionTestDB(t *testing.T) *sql.DB {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(createTestTables); err != nil {
		t.Fatalf("create tables: %v", err)
	}

	return db
}

func createVaultParams(id string) sqlc.CreateVaultParams {
	return sqlc.CreateVaultParams{
		ID:        id,
		Name:      "notes",
		Deleted:   0,
		CreatedAt: "2026-01-01T00:00:00Z",
		UpdatedAt: "2026-01-01T00:00:00Z",
	}
}

func createTrashItemParams(id, vaultID string) sqlc.CreateTrashItemParams {
	return sqlc.CreateTrashItemParams{
		ID:           id,
		VaultID:      vaultID,
		ResourceID:   "resource-id",
		ResourceType: "vault",
		Path:         "/notes",
		DeletedAt:    "2026-01-01T00:00:00Z",
	}
}

func countRows(t *testing.T, db *sql.DB, table string) int {
	t.Helper()

	var count int
	if err := db.QueryRowContext(context.Background(), "SELECT COUNT(*) FROM "+table).Scan(&count); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}

	return count
}

func TestWithTransaction_CommitsOnSuccess(t *testing.T) {
	db := newTransactionTestDB(t)
	ctx := context.Background()

	err := WithTransaction(ctx, db, func(q *sqlc.Queries) error {
		if err := q.CreateVault(ctx, createVaultParams("vault-id")); err != nil {
			return err
		}
		return q.CreateTrashItem(ctx, createTrashItemParams("trash-id", "vault-id"))
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if count := countRows(t, db, "vaults"); count != 1 {
		t.Errorf("expected 1 vault, got %d", count)
	}
	if count := countRows(t, db, "trash_items"); count != 1 {
		t.Errorf("expected 1 trash item, got %d", count)
	}
}

func TestWithTransaction_RollsBackOnCallbackError(t *testing.T) {
	db := newTransactionTestDB(t)
	ctx := context.Background()

	sentinel := errors.New("boom")

	err := WithTransaction(ctx, db, func(q *sqlc.Queries) error {
		if err := q.CreateVault(ctx, createVaultParams("vault-id")); err != nil {
			return err
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected sentinel error, got %v", err)
	}

	if count := countRows(t, db, "vaults"); count != 0 {
		t.Errorf("expected rollback to leave 0 vaults, got %d", count)
	}
}

func TestWithTransaction_RollsBackOnQueryError(t *testing.T) {
	db := newTransactionTestDB(t)
	ctx := context.Background()

	err := WithTransaction(ctx, db, func(q *sqlc.Queries) error {
		if err := q.CreateVault(ctx, createVaultParams("vault-id")); err != nil {
			return err
		}
		return q.CreateVault(ctx, createVaultParams("vault-id"))
	})
	if err == nil {
		t.Fatal("expected primary key violation, got nil")
	}

	if count := countRows(t, db, "vaults"); count != 0 {
		t.Errorf("expected rollback to leave 0 vaults, got %d", count)
	}
}

func TestWithTransaction_BeginError(t *testing.T) {
	db := newTransactionTestDB(t)
	_ = db.Close()

	called := false
	err := WithTransaction(context.Background(), db, func(q *sqlc.Queries) error {
		called = true
		return nil
	})
	if err == nil {
		t.Fatal("expected error on closed database, got nil")
	}
	if called {
		t.Error("expected callback not to run when begin fails")
	}
}
