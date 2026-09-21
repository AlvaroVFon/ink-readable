// Package tasks
package tasks

import (
	"errors"
	"testing"
)

func TestNewTask(t *testing.T) {
	task, err := NewTask("project-id", "Write tests", "Cover the happy path")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if task.ID == "" {
		t.Error("expected non-empty ID")
	}
	if task.ProjectID != "project-id" {
		t.Errorf("expected projectID %q, got %q", "project-id", task.ProjectID)
	}
	if task.Title != "Write tests" {
		t.Errorf("expected title %q, got %q", "Write tests", task.Title)
	}
	if task.Description != "Cover the happy path" {
		t.Errorf("expected description %q, got %q", "Cover the happy path", task.Description)
	}
	if task.Status != StatusBacklog {
		t.Errorf("expected default status %q, got %q", StatusBacklog, task.Status)
	}
	if task.Position != 1 {
		t.Errorf("expected default position 1, got %d", task.Position)
	}
	if task.CreatedAt.IsZero() || task.UpdatedAt.IsZero() {
		t.Error("expected timestamps to be set")
	}
	if !task.CreatedAt.Equal(task.UpdatedAt) {
		t.Errorf("expected matching timestamps, got %v and %v", task.CreatedAt, task.UpdatedAt)
	}
}

func TestNewTask_EmptyProjectID(t *testing.T) {
	if _, err := NewTask("", "Write tests", ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestNewTask_EmptyTitle(t *testing.T) {
	if _, err := NewTask("project-id", "", ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestStatus_Valid(t *testing.T) {
	tests := []struct {
		status Status
		want   bool
	}{
		{status: StatusBacklog, want: true},
		{status: StatusTodo, want: true},
		{status: StatusInProgress, want: true},
		{status: StatusDone, want: true},
		{status: Status("unknown"), want: false},
		{status: Status(""), want: false},
	}

	for _, tt := range tests {
		if got := tt.status.Valid(); got != tt.want {
			t.Errorf("Status(%q).Valid() = %v, want %v", tt.status, got, tt.want)
		}
	}
}
