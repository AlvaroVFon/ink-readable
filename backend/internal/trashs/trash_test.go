// Package trashs
package trashs

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewTrash(t *testing.T) {
	trash, err := NewTrash("vault-id")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if trash == nil {
		t.Fatal("expected non-nil trash")
	}
	if trash.VaultID != "vault-id" {
		t.Errorf("expected VaultID %q, got %q", "vault-id", trash.VaultID)
	}
}

func TestNewTrash_EmptyVaultID(t *testing.T) {
	trash, err := NewTrash("")

	if !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}
	if trash != nil {
		t.Errorf("expected nil trash, got %+v", trash)
	}
}

func TestNewTrashItem(t *testing.T) {
	before := time.Now()
	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", nil, DocumentResourceType)
	after := time.Now()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if item == nil {
		t.Fatal("expected non-nil trash item")
	}

	if _, err := uuid.Parse(item.ID); err != nil {
		t.Errorf("expected a valid uuid, got %q: %v", item.ID, err)
	}
	if item.VaultID != "vault-id" {
		t.Errorf("expected VaultID %q, got %q", "vault-id", item.VaultID)
	}
	if item.ResourceType != DocumentResourceType {
		t.Errorf("expected ResourceType %q, got %q", DocumentResourceType, item.ResourceType)
	}
	if item.ResourceID != "resource-id" {
		t.Errorf("expected ResourceID %q, got %q", "resource-id", item.ResourceID)
	}
	if item.Path != "/notes/doc.md" {
		t.Errorf("expected Path %q, got %q", "/notes/doc.md", item.Path)
	}
	if item.ParentID != nil {
		t.Errorf("expected nil ParentID, got %v", *item.ParentID)
	}
	if item.DeletedAt.Before(before) || item.DeletedAt.After(after) {
		t.Errorf("expected DeletedAt between %v and %v, got %v", before, after, item.DeletedAt)
	}
}

func TestNewTrashItem_WithParent(t *testing.T) {
	parentID := "parent-id"

	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", &parentID, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if item.ParentID == nil || *item.ParentID != parentID {
		t.Errorf("expected ParentID %q, got %v", parentID, item.ParentID)
	}
}

func TestNewTrashItem_UniqueIDs(t *testing.T) {
	first, err := NewTrashItem("vault-id", "/first", "resource-a", nil, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := NewTrashItem("vault-id", "/second", "resource-b", nil, DocumentResourceType)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if first.ID == second.ID {
		t.Errorf("expected unique ids, got %q twice", first.ID)
	}
}

func TestNewTrashItem_EmptyArguments(t *testing.T) {
	empty := ""
	resourceType := DocumentResourceType

	tests := []struct {
		name         string
		vaultID      string
		path         string
		resourceID   string
		parentID     *string
		resourceType ResourceType
	}{
		{name: "empty vaultID", vaultID: "", path: "/notes/doc.md", resourceID: "resource-id", resourceType: resourceType},
		{name: "empty path", vaultID: "vault-id", path: "", resourceID: "resource-id", resourceType: resourceType},
		{name: "empty resourceID", vaultID: "vault-id", path: "/notes/doc.md", resourceID: "", resourceType: resourceType},
		{name: "empty parentID", vaultID: "vault-id", path: "/notes/doc.md", resourceID: "resource-id", parentID: &empty, resourceType: resourceType},
		{name: "empty resourceType", vaultID: "vault-id", path: "/notes/doc.md", resourceID: "resource-id", resourceType: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item, err := NewTrashItem(tt.vaultID, tt.path, tt.resourceID, tt.parentID, tt.resourceType)

			if !errors.Is(err, ErrInvalidEmptyArgument) {
				t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
			}
			if item != nil {
				t.Errorf("expected nil trash item, got %+v", item)
			}
		})
	}
}

func TestNewTrashItem_InvalidResourceType(t *testing.T) {
	item, err := NewTrashItem("vault-id", "/notes/doc.md", "resource-id", nil, ResourceType("invalid"))

	if !errors.Is(err, ErrInvalidResourceType) {
		t.Fatalf("expected ErrInvalidResourceType, got %v", err)
	}
	if item != nil {
		t.Errorf("expected nil trash item, got %+v", item)
	}
}

func TestTrashItem_ToCreateTrashItemParams(t *testing.T) {
	deletedAt := time.Date(2026, time.January, 2, 3, 4, 5, 6, time.UTC)
	parentID := "parent-id"

	tests := []struct {
		name     string
		parentID *string
	}{
		{name: "without parent", parentID: nil},
		{name: "with parent", parentID: &parentID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := TrashItem{
				ID:           "trash-id",
				VaultID:      "vault-id",
				ResourceType: DocumentResourceType,
				ResourceID:   "resource-id",
				Path:         "/notes/doc.md",
				ParentID:     tt.parentID,
				DeletedAt:    deletedAt,
			}

			params := item.ToCreateTrashItemParams()

			if params.ID != item.ID {
				t.Errorf("expected ID %q, got %q", item.ID, params.ID)
			}
			if params.VaultID != item.VaultID {
				t.Errorf("expected VaultID %q, got %q", item.VaultID, params.VaultID)
			}
			if params.ResourceType != string(item.ResourceType) {
				t.Errorf("expected ResourceType %q, got %q", item.ResourceType, params.ResourceType)
			}
			if params.ResourceID != item.ResourceID {
				t.Errorf("expected ResourceID %q, got %q", item.ResourceID, params.ResourceID)
			}
			if params.Path != item.Path {
				t.Errorf("expected Path %q, got %q", item.Path, params.Path)
			}
			if want := deletedAt.Format(time.RFC3339Nano); params.DeletedAt != want {
				t.Errorf("expected DeletedAt %q, got %q", want, params.DeletedAt)
			}

			if tt.parentID == nil {
				if params.ParentID.Valid {
					t.Errorf("expected invalid ParentID, got %+v", params.ParentID)
				}
			} else {
				if !params.ParentID.Valid || params.ParentID.String != *tt.parentID {
					t.Errorf("expected ParentID %q, got %+v", *tt.parentID, params.ParentID)
				}
			}
		})
	}
}
