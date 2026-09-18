// Package documents
package documents

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewDocument(t *testing.T) {
	before := time.Now()
	document, err := NewDocument("My note", "vault-id", "/notes/doc.md", "hello world")
	after := time.Now()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if document == nil {
		t.Fatal("expected non-nil document")
	}

	if _, err := uuid.Parse(document.ID); err != nil {
		t.Errorf("expected a valid uuid, got %q: %v", document.ID, err)
	}
	if document.Name != "My note" {
		t.Errorf("expected Name %q, got %q", "My note", document.Name)
	}
	if document.VauldID != "vault-id" {
		t.Errorf("expected VauldID %q, got %q", "vault-id", document.VauldID)
	}
	if document.Path != "/notes/doc.md" {
		t.Errorf("expected Path %q, got %q", "/notes/doc.md", document.Path)
	}
	if document.Content != "hello world" {
		t.Errorf("expected Content %q, got %q", "hello world", document.Content)
	}
	if document.Deleted {
		t.Error("expected Deleted to be false")
	}
	if document.CreatedAt.Before(before) || document.CreatedAt.After(after) {
		t.Errorf("expected CreatedAt between %v and %v, got %v", before, after, document.CreatedAt)
	}
	if document.UpdatedAt.Before(before) || document.UpdatedAt.After(after) {
		t.Errorf("expected UpdatedAt between %v and %v, got %v", before, after, document.UpdatedAt)
	}
}

func TestNewDocument_UniqueIDs(t *testing.T) {
	first, err := NewDocument("first", "vault-id", "/first", "content")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := NewDocument("second", "vault-id", "/second", "content")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if first.ID == second.ID {
		t.Errorf("expected unique ids, got %q twice", first.ID)
	}
}

func TestNewDocument_EmptyArguments(t *testing.T) {
	tests := []struct {
		name    string
		docName string
		vaultID string
		path    string
		content string
	}{
		{name: "empty name", docName: "", vaultID: "vault-id", path: "/notes/doc.md", content: "hello"},
		{name: "empty vaultID", docName: "My note", vaultID: "", path: "/notes/doc.md", content: "hello"},
		{name: "empty path", docName: "My note", vaultID: "vault-id", path: "", content: "hello"},
		{name: "empty content", docName: "My note", vaultID: "vault-id", path: "/notes/doc.md", content: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			document, err := NewDocument(tt.docName, tt.vaultID, tt.path, tt.content)

			if !errors.Is(err, ErrInvalidEmptyArgument) {
				t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
			}
			if document != nil {
				t.Errorf("expected nil document, got %+v", document)
			}
		})
	}
}

func TestDocument_ToCreateDocumentParams(t *testing.T) {
	createdAt := time.Date(2026, time.January, 2, 3, 4, 5, 6, time.UTC)
	updatedAt := time.Date(2026, time.February, 3, 4, 5, 6, 7, time.UTC)

	document := Document{
		ID:        "document-id",
		Name:      "My note",
		VauldID:   "vault-id",
		Path:      "/notes/doc.md",
		Content:   "hello world",
		Deleted:   false,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}

	params := document.toCreateDocumentParams()

	if params.ID != document.ID {
		t.Errorf("expected ID %q, got %q", document.ID, params.ID)
	}
	if params.Name != document.Name {
		t.Errorf("expected Name %q, got %q", document.Name, params.Name)
	}
	if params.VaultID != document.VauldID {
		t.Errorf("expected VaultID %q, got %q", document.VauldID, params.VaultID)
	}
	if params.Path != document.Path {
		t.Errorf("expected Path %q, got %q", document.Path, params.Path)
	}
	if params.Content != document.Content {
		t.Errorf("expected Content %q, got %q", document.Content, params.Content)
	}
	if want := createdAt.Format(time.RFC3339Nano); params.CreatedAt != want {
		t.Errorf("expected CreatedAt %q, got %q", want, params.CreatedAt)
	}
	if want := updatedAt.Format(time.RFC3339Nano); params.UpdatedAt != want {
		t.Errorf("expected UpdatedAt %q, got %q", want, params.UpdatedAt)
	}
}
