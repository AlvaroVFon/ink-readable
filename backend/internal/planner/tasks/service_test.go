// Package tasks
package tasks

import (
	"context"
	"errors"
	"testing"
)

type fakeRepository struct {
	create            func(context.Context, Task) error
	list              func(context.Context, string) ([]Task, error)
	findByID          func(context.Context, string) (*Task, error)
	updateTitle       func(context.Context, string, string) error
	updateDescription func(context.Context, string, string) error
	updateStatus      func(context.Context, string, Status) error
	updatePosition    func(context.Context, string, int64) error
	delete            func(context.Context, string) error
}

func (f *fakeRepository) Create(ctx context.Context, task Task) error {
	return f.create(ctx, task)
}

func (f *fakeRepository) List(ctx context.Context, projectID string) ([]Task, error) {
	return f.list(ctx, projectID)
}

func (f *fakeRepository) FindByID(ctx context.Context, id string) (*Task, error) {
	return f.findByID(ctx, id)
}

func (f *fakeRepository) UpdateTitle(ctx context.Context, id, title string) error {
	return f.updateTitle(ctx, id, title)
}

func (f *fakeRepository) UpdateDescription(ctx context.Context, id, description string) error {
	return f.updateDescription(ctx, id, description)
}

func (f *fakeRepository) UpdateStatus(ctx context.Context, id string, status Status) error {
	return f.updateStatus(ctx, id, status)
}

func (f *fakeRepository) UpdatePosition(ctx context.Context, id string, position int64) error {
	return f.updatePosition(ctx, id, position)
}

func (f *fakeRepository) Delete(ctx context.Context, id string) error {
	return f.delete(ctx, id)
}

func TestTasksService_Create_Delegates(t *testing.T) {
	want := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests"}
	var got Task

	service := NewTasksService(&fakeRepository{
		create: func(_ context.Context, task Task) error {
			got = task
			return nil
		},
	})

	if err := service.Create(context.Background(), want); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("expected task %+v, got %+v", want, got)
	}
}

func TestTasksService_List_Delegates(t *testing.T) {
	want := []Task{{ID: "task-id", ProjectID: "project-id", Title: "Write tests"}}
	var gotProjectID string

	service := NewTasksService(&fakeRepository{
		list: func(_ context.Context, projectID string) ([]Task, error) {
			gotProjectID = projectID
			return want, nil
		},
	})

	got, err := service.List(context.Background(), "project-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotProjectID != "project-id" {
		t.Errorf("expected projectID %q, got %q", "project-id", gotProjectID)
	}
	if len(got) != 1 || got[0].ID != want[0].ID {
		t.Errorf("expected tasks %+v, got %+v", want, got)
	}
}

func TestTasksService_FindByID_ReturnsRepositoryResult(t *testing.T) {
	want := &Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests"}
	var gotID string

	service := NewTasksService(&fakeRepository{
		findByID: func(_ context.Context, id string) (*Task, error) {
			gotID = id
			return want, nil
		},
	})

	got, err := service.FindByID(context.Background(), "task-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("expected task %+v, got %+v", want, got)
	}
	if gotID != "task-id" {
		t.Errorf("expected id %q, got %q", "task-id", gotID)
	}
}

func TestTasksService_UpdateTitle_Delegates(t *testing.T) {
	var gotID, gotTitle string

	service := NewTasksService(&fakeRepository{
		updateTitle: func(_ context.Context, id, title string) error {
			gotID, gotTitle = id, title
			return nil
		},
	})

	if err := service.UpdateTitle(context.Background(), "task-id", "New title"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "task-id" || gotTitle != "New title" {
		t.Errorf("expected (task-id, New title), got (%q, %q)", gotID, gotTitle)
	}
}

func TestTasksService_UpdateDescription_Delegates(t *testing.T) {
	var gotID, gotDescription string

	service := NewTasksService(&fakeRepository{
		updateDescription: func(_ context.Context, id, description string) error {
			gotID, gotDescription = id, description
			return nil
		},
	})

	if err := service.UpdateDescription(context.Background(), "task-id", "New description"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "task-id" || gotDescription != "New description" {
		t.Errorf("expected (task-id, New description), got (%q, %q)", gotID, gotDescription)
	}
}

func TestTasksService_UpdateStatus_Delegates(t *testing.T) {
	var gotID string
	var gotStatus Status

	service := NewTasksService(&fakeRepository{
		updateStatus: func(_ context.Context, id string, status Status) error {
			gotID, gotStatus = id, status
			return nil
		},
	})

	if err := service.UpdateStatus(context.Background(), "task-id", StatusDone); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "task-id" || gotStatus != StatusDone {
		t.Errorf("expected (task-id, %q), got (%q, %q)", StatusDone, gotID, gotStatus)
	}
}

func TestTasksService_UpdatePosition_Delegates(t *testing.T) {
	var gotID string
	var gotPosition int64

	service := NewTasksService(&fakeRepository{
		updatePosition: func(_ context.Context, id string, position int64) error {
			gotID, gotPosition = id, position
			return nil
		},
	})

	if err := service.UpdatePosition(context.Background(), "task-id", 5); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "task-id" || gotPosition != 5 {
		t.Errorf("expected (task-id, 5), got (%q, %d)", gotID, gotPosition)
	}
}

func TestTasksService_Delete_Delegates(t *testing.T) {
	var gotID string

	service := NewTasksService(&fakeRepository{
		delete: func(_ context.Context, id string) error {
			gotID = id
			return nil
		},
	})

	if err := service.Delete(context.Background(), "task-id"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "task-id" {
		t.Errorf("expected id %q, got %q", "task-id", gotID)
	}
}

func TestTasksService_PropagatesRepositoryErrors(t *testing.T) {
	wantErr := errors.New("boom")
	service := NewTasksService(&fakeRepository{
		create:            func(context.Context, Task) error { return wantErr },
		list:              func(context.Context, string) ([]Task, error) { return nil, wantErr },
		findByID:          func(context.Context, string) (*Task, error) { return nil, wantErr },
		updateTitle:       func(context.Context, string, string) error { return wantErr },
		updateDescription: func(context.Context, string, string) error { return wantErr },
		updateStatus:      func(context.Context, string, Status) error { return wantErr },
		updatePosition:    func(context.Context, string, int64) error { return wantErr },
		delete:            func(context.Context, string) error { return wantErr },
	})
	ctx := context.Background()

	if err := service.Create(ctx, Task{}); !errors.Is(err, wantErr) {
		t.Errorf("Create: expected %v, got %v", wantErr, err)
	}
	if _, err := service.List(ctx, "project-id"); !errors.Is(err, wantErr) {
		t.Errorf("List: expected %v, got %v", wantErr, err)
	}
	if _, err := service.FindByID(ctx, "task-id"); !errors.Is(err, wantErr) {
		t.Errorf("FindByID: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdateTitle(ctx, "task-id", "title"); !errors.Is(err, wantErr) {
		t.Errorf("UpdateTitle: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdateDescription(ctx, "task-id", "description"); !errors.Is(err, wantErr) {
		t.Errorf("UpdateDescription: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdateStatus(ctx, "task-id", StatusDone); !errors.Is(err, wantErr) {
		t.Errorf("UpdateStatus: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdatePosition(ctx, "task-id", 5); !errors.Is(err, wantErr) {
		t.Errorf("UpdatePosition: expected %v, got %v", wantErr, err)
	}
	if err := service.Delete(ctx, "task-id"); !errors.Is(err, wantErr) {
		t.Errorf("Delete: expected %v, got %v", wantErr, err)
	}
}
