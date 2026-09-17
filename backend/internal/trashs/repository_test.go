// Package trashs
package trashs

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

func newTestRepository(t *testing.T) (*TrashRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE trash_items (
		id            TEXT PRIMARY KEY,
		vault_id      TEXT NOT NULL,
		resource_id   TEXT NOT NULL,
		resource_type TEXT NOT NULL,
		path          TEXT NOT NULL,
		parent_id     TEXT,
		deleted_at    TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return NewTrashRepository(*sqlc.New(db)), db
}

func getTrashItem(t *testing.T, db *sql.DB, id string) (vaultID, resourceID, resourceType, path string, parentID sql.NullString, deletedAt string) {
	t.Helper()

	err := db.QueryRowContext(
		context.Background(),
		"SELECT vault_id, resource_id, resource_type, path, parent_id, deleted_at FROM trash_items WHERE id = ?", id,
	).Scan(&vaultID, &resourceID, &resourceType, &path, &parentID, &deletedAt)
	if err != nil {
		t.Fatalf("select trash item: %v", err)
	}

	return vaultID, resourceID, resourceType, path, parentID, deletedAt
}

func countTrashItems(t *testing.T, db *sql.DB) int {
	t.Helper()

	var count int
	if err := db.QueryRowContext(context.Background(), "SELECT COUNT(*) FROM trash_items").Scan(&count); err != nil {
		t.Fatalf("count trash items: %v", err)
	}

	return count
}

func TestTrashRepository_Create(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", nil, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}

	if err := repo.Create(ctx, *item); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	vaultID, resourceID, resourceType, path, parentID, deletedAt := getTrashItem(t, db, item.ID)
	if vaultID != item.VaultID {
		t.Errorf("expected vault_id %q, got %q", item.VaultID, vaultID)
	}
	if resourceID != item.ResourceID {
		t.Errorf("expected resource_id %q, got %q", item.ResourceID, resourceID)
	}
	if resourceType != string(item.ResourceType) {
		t.Errorf("expected resource_type %q, got %q", item.ResourceType, resourceType)
	}
	if path != item.Path {
		t.Errorf("expected path %q, got %q", item.Path, path)
	}
	if parentID.Valid {
		t.Errorf("expected NULL parent_id, got %q", parentID.String)
	}
	if want := item.DeletedAt.Format(time.RFC3339Nano); deletedAt != want {
		t.Errorf("expected deleted_at %q, got %q", want, deletedAt)
	}
}

func TestTrashRepository_Create_WithParent(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	parentID := "parent-id"
	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", &parentID, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}

	if err := repo.Create(ctx, *item); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, _, _, gotParentID, _ := getTrashItem(t, db, item.ID)
	if !gotParentID.Valid || gotParentID.String != parentID {
		t.Errorf("expected parent_id %q, got %+v", parentID, gotParentID)
	}
}

func TestTrashRepository_Delete(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", nil, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}
	if err := repo.Create(ctx, *item); err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}

	if err := repo.Delete(ctx, item.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if count := countTrashItems(t, db); count != 0 {
		t.Errorf("expected 0 trash items, got %d", count)
	}
}

func TestTrashRepository_Delete_EmptyID(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", nil, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}
	if err := repo.Create(ctx, *item); err != nil {
		t.Fatalf("unexpected error creating trash item: %v", err)
	}

	if err := repo.Delete(ctx, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if count := countTrashItems(t, db); count != 1 {
		t.Errorf("expected 1 trash item, got %d", count)
	}
}
