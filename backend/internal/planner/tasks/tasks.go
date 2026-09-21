// Package tasks
package tasks

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidEmptyArgumentError = errors.New("invalid empty argument")
	ErrInvalidStatusError        = errors.New("invalid task status")
	ErrInvalidPositionError      = errors.New("invalid task position")
)

type Status string

const (
	StatusBacklog    Status = "backlog"
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
)

func (s Status) Valid() bool {
	switch s {
	case StatusBacklog, StatusTodo, StatusInProgress, StatusDone:
		return true
	default:
		return false
	}
}

type Task struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      Status    `json:"status"`
	Position    int64     `json:"position"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func NewTask(projectID, title, description string) (*Task, error) {
	if projectID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "projectID")
	}
	if title == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "title")
	}

	now := time.Now().UTC()

	return &Task{
		ID:          uuid.New().String(),
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      StatusBacklog,
		Position:    1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}
