// Package vaults
package vaults

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var ErrInvalidEmptyArgument = errors.New("invalid empty argument")

type Vault struct {
	ID        string
	Name      string
	Deleted   bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewVault(name string) (*Vault, error) {
	if name == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "name")
	}

	id := uuid.New().String()

	return &Vault{
		ID:        id,
		Name:      name,
		Deleted:   false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}
