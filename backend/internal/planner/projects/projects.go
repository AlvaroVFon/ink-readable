// Package projects
package projects

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var ErrInvalidEmptyArgumentError = errors.New("invalid empty argument")

type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt time.Time `json:"deleted_at"`
}

func NewProject(name string) (*Project, error) {
	if name == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "name")
	}

	id := uuid.New().String()

	return &Project{
		ID:   id,
		Name: name,
	}, nil
}
