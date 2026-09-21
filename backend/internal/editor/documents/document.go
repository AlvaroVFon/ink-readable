// Package documents
package documents

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var ErrInvalidEmptyArgument = errors.New("invalid empty argument")

const DefaultName = "Untitled"

type Document struct {
	ID        string
	Name      string
	VauldID   string
	Path      string
	Content   string
	Deleted   bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewDocument(name, vaultID, path, content string) (*Document, error) {
	if name == "" {
		name = DefaultName
	}
	if vaultID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "vaultID")
	}
	if path == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "path")
	}

	id := uuid.New().String()

	return &Document{
		ID:        id,
		Name:      name,
		VauldID:   vaultID,
		Path:      path,
		Content:   content,
		Deleted:   false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}
