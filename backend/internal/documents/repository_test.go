// Package documents
package documents

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

func newTestRepository(t *testing.T) (*DocumentsRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE documents (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		vault_id   TEXT NOT NULL,
		path       TEXT NOT NULL,
		content    TEXT NOT NULL DEFAULT '',
		deleted    INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return NewDocumentsRepository(*sqlc.New(db)), db
}

func getDocument(t *testing.T, db *sql.DB, id string) (name, vaultID, path, content string, deleted int64, createdAt, updatedAt string) {
	t.Helper()

	err := db.QueryRowContext(
		context.Background(),
		"SELECT name, vault_id, path, content, deleted, created_at, updated_at FROM documents WHERE id = ?", id,
	).Scan(&name, &vaultID, &path, &content, &deleted, &createdAt, &updatedAt)
	if err != nil {
		t.Fatalf("select document: %v", err)
	}

	return name, vaultID, path, content, deleted, createdAt, updatedAt
}

func countDocuments(t *testing.T, db *sql.DB) int {
	t.Helper()

	var count int
	if err := db.QueryRowContext(context.Background(), "SELECT COUNT(*) FROM documents").Scan(&count); err != nil {
		t.Fatalf("count documents: %v", err)
	}

	return count
}

func TestDocumentsRepository_Create(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	name, vaultID, path, content, deleted, createdAt, updatedAt := getDocument(t, db, document.ID)
	if name != document.Name {
		t.Errorf("expected name %q, got %q", document.Name, name)
	}
	if vaultID != document.VauldID {
		t.Errorf("expected vault_id %q, got %q", document.VauldID, vaultID)
	}
	if path != document.Path {
		t.Errorf("expected path %q, got %q", document.Path, path)
	}
	if content != document.Content {
		t.Errorf("expected content %q, got %q", document.Content, content)
	}
	if deleted != 0 {
		t.Errorf("expected deleted 0, got %d", deleted)
	}
	if want := document.CreatedAt.Format(time.RFC3339Nano); createdAt != want {
		t.Errorf("expected created_at %q, got %q", want, createdAt)
	}
	if want := document.UpdatedAt.Format(time.RFC3339Nano); updatedAt != want {
		t.Errorf("expected updated_at %q, got %q", want, updatedAt)
	}
}

func TestDocumentsRepository_FindActiveAndDeleted(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	active, err := NewDocument("Active", "vault-id", "/active.md", "active content")
	if err != nil {
		t.Fatalf("unexpected error creating active document: %v", err)
	}
	deleted, err := NewDocument("Deleted", "vault-id", "/deleted.md", "deleted content")
	if err != nil {
		t.Fatalf("unexpected error creating deleted document: %v", err)
	}
	otherVault, err := NewDocument("Other", "other-vault", "/other.md", "other content")
	if err != nil {
		t.Fatalf("unexpected error creating other document: %v", err)
	}

	for _, document := range []*Document{active, deleted, otherVault} {
		if err := repo.Create(ctx, *document); err != nil {
			t.Fatalf("unexpected error creating document: %v", err)
		}
	}
	if err := repo.Delete(ctx, deleted.ID); err != nil {
		t.Fatalf("unexpected error deleting document: %v", err)
	}

	activeDocuments, err := repo.FindActive(ctx, "vault-id")
	if err != nil {
		t.Fatalf("find active documents: %v", err)
	}
	deletedDocuments, err := repo.FindDeleted(ctx, "vault-id")
	if err != nil {
		t.Fatalf("find deleted documents: %v", err)
	}

	if len(activeDocuments) != 1 || activeDocuments[0].ID != active.ID {
		t.Errorf("expected only active document %q, got %+v", active.ID, activeDocuments)
	}
	if len(deletedDocuments) != 1 || deletedDocuments[0].ID != deleted.ID || !deletedDocuments[0].Deleted {
		t.Errorf("expected only deleted document %q, got %+v", deleted.ID, deletedDocuments)
	}

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM documents").Scan(&count); err != nil {
		t.Fatalf("count documents: %v", err)
	}
	if count != 3 {
		t.Errorf("expected all documents to remain persisted, got %d", count)
	}
}

func TestDocumentsRepository_FindActive_EmptyVaultID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.FindActive(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}
}

func TestDocumentsRepository_UpdateDocumentContent(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "old content")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.UpdateDocumentContent(ctx, document.ID, "new content"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, _, content, _, _, updatedAt := getDocument(t, db, document.ID)
	if content != "new content" {
		t.Errorf("expected content %q, got %q", "new content", content)
	}
	if updatedAt == "" {
		t.Error("expected updated_at to be set")
	}
}

func TestDocumentsRepository_UpdateDocumentContent_EmptyID(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "old content")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.UpdateDocumentContent(ctx, "", "new content"); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if _, _, _, content, _, _, _ := getDocument(t, db, document.ID); content != "old content" {
		t.Errorf("expected content to remain %q, got %q", "old content", content)
	}
}

func TestDocumentsRepository_UpdateDocumentContent_EmptyContent(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "old content")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.UpdateDocumentContent(ctx, document.ID, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if _, _, _, content, _, _, _ := getDocument(t, db, document.ID); content != "old content" {
		t.Errorf("expected content to remain %q, got %q", "old content", content)
	}
}

func TestDocumentsRepository_Delete(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.Delete(ctx, document.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, _, _, deleted, _, updatedAt := getDocument(t, db, document.ID)
	if deleted != 1 {
		t.Errorf("expected deleted 1, got %d", deleted)
	}
	if updatedAt == "" {
		t.Error("expected updated_at to be set")
	}
}

func TestDocumentsRepository_Delete_EmptyID(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}

	if err := repo.Delete(ctx, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if count := countDocuments(t, db); count != 1 {
		t.Errorf("expected 1 document, got %d", count)
	}
}

func TestDocumentsRepository_Restore(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Delete(ctx, document.ID); err != nil {
		t.Fatalf("unexpected error deleting document: %v", err)
	}

	if err := repo.Restore(ctx, document.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, _, _, deleted, _, updatedAt := getDocument(t, db, document.ID)
	if deleted != 0 {
		t.Errorf("expected deleted 0, got %d", deleted)
	}
	if updatedAt == "" {
		t.Error("expected updated_at to be set")
	}
}

func TestDocumentsRepository_Restore_EmptyID(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	if err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Create(ctx, *document); err != nil {
		t.Fatalf("unexpected error creating document: %v", err)
	}
	if err := repo.Delete(ctx, document.ID); err != nil {
		t.Fatalf("unexpected error deleting document: %v", err)
	}

	if err := repo.Restore(ctx, ""); !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}

	if _, _, _, _, deleted, _, _ := getDocument(t, db, document.ID); deleted != 1 {
		t.Errorf("expected document to remain deleted, got deleted %d", deleted)
	}
}
