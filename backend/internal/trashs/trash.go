// Package trashs
package trashs

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidEmptyArgument = errors.New("invalid empty argument")
	ErrInvalidResourceType  = errors.New("invalid resourceType")
)

type ResourceType string

const (
	VaultResourceType    ResourceType = "vault"
	DocumentResourceType ResourceType = "document"
	FolderResourceType   ResourceType = "folder"
)

func (rt ResourceType) isValid() bool {
	switch rt {
	case VaultResourceType, DocumentResourceType, FolderResourceType:
		return true
	default:
		return false
	}
}

type (
	TrashItem struct {
		ID           string
		VaultID      string
		ResourceType ResourceType
		ResourceID   string
		Path         string
		ParentID     *string
		DeletedAt    time.Time
	}
	Trash struct {
		VaultID string
	}
)

func NewTrash(vaultID string) (*Trash, error) {
	if vaultID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "vaultID")
	}
	return &Trash{VaultID: vaultID}, nil
}

func NewTrashItem(vaultID, path, resourceID string, parendID *string, resourceType ResourceType) (*TrashItem, error) {
	if vaultID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "vaultID")
	}
	if path == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "path")
	}
	if resourceID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "resourceID")
	}
	if parendID != nil && *parendID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "parendID")
	}
	if resourceType == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "resourceType")
	}
	if !resourceType.isValid() {
		return nil, fmt.Errorf("%w: %q", ErrInvalidResourceType, resourceType)
	}

	id := uuid.New().String()

	return &TrashItem{
		ID:           id,
		VaultID:      vaultID,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Path:         path,
		ParentID:     parendID,
		DeletedAt:    time.Now(),
	}, nil
}
