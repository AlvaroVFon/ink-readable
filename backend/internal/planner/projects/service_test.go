// Package projects
package projects

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepository struct {
	create   func(context.Context, Project) error
	list     func(context.Context) ([]Project, error)
	findByID func(context.Context, string) (*Project, error)
	rename   func(context.Context, string, string) error
	delete   func(context.Context, string) error
}

func (f *fakeRepository) Create(ctx context.Context, project Project) error {
	return f.create(ctx, project)
}

func (f *fakeRepository) List(ctx context.Context) ([]Project, error) {
	return f.list(ctx)
}

func (f *fakeRepository) FindByID(ctx context.Context, id string) (*Project, error) {
	return f.findByID(ctx, id)
}

func (f *fakeRepository) Rename(ctx context.Context, id, name string) error {
	return f.rename(ctx, id, name)
}

func (f *fakeRepository) Delete(ctx context.Context, id string) error {
	return f.delete(ctx, id)
}

func TestProjectsService_Create_Delegates(t *testing.T) {
	want := Project{ID: "project-id", Name: "Reading"}
	var got Project

	service := NewProjectsService(&fakeRepository{
		create: func(_ context.Context, project Project) error {
			got = project
			return nil
		},
	})

	if err := service.Create(context.Background(), want); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("expected project %+v, got %+v", want, got)
	}
}

func TestProjectsService_List_ReturnsRepositoryResult(t *testing.T) {
	want := []Project{{ID: "project-id", Name: "Reading", CreatedAt: time.Now().UTC()}}

	service := NewProjectsService(&fakeRepository{
		list: func(context.Context) ([]Project, error) {
			return want, nil
		},
	})

	got, err := service.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != want[0].ID {
		t.Errorf("expected projects %+v, got %+v", want, got)
	}
}

func TestProjectsService_FindByID_ReturnsRepositoryResult(t *testing.T) {
	want := &Project{ID: "project-id", Name: "Reading"}
	var gotID string

	service := NewProjectsService(&fakeRepository{
		findByID: func(_ context.Context, id string) (*Project, error) {
			gotID = id
			return want, nil
		},
	})

	got, err := service.FindByID(context.Background(), "project-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("expected project %+v, got %+v", want, got)
	}
	if gotID != "project-id" {
		t.Errorf("expected id %q, got %q", "project-id", gotID)
	}
}

func TestProjectsService_Rename_Delegates(t *testing.T) {
	var gotID, gotName string

	service := NewProjectsService(&fakeRepository{
		rename: func(_ context.Context, id, name string) error {
			gotID, gotName = id, name
			return nil
		},
	})

	if err := service.Rename(context.Background(), "project-id", "New name"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "project-id" || gotName != "New name" {
		t.Errorf("expected (project-id, New name), got (%q, %q)", gotID, gotName)
	}
}

func TestProjectsService_Delete_Delegates(t *testing.T) {
	var gotID string

	service := NewProjectsService(&fakeRepository{
		delete: func(_ context.Context, id string) error {
			gotID = id
			return nil
		},
	})

	if err := service.Delete(context.Background(), "project-id"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotID != "project-id" {
		t.Errorf("expected id %q, got %q", "project-id", gotID)
	}
}

func TestProjectsService_PropagatesRepositoryErrors(t *testing.T) {
	wantErr := errors.New("boom")
	service := NewProjectsService(&fakeRepository{
		create:   func(context.Context, Project) error { return wantErr },
		list:     func(context.Context) ([]Project, error) { return nil, wantErr },
		findByID: func(context.Context, string) (*Project, error) { return nil, wantErr },
		rename:   func(context.Context, string, string) error { return wantErr },
		delete:   func(context.Context, string) error { return wantErr },
	})
	ctx := context.Background()

	if err := service.Create(ctx, Project{}); !errors.Is(err, wantErr) {
		t.Errorf("Create: expected %v, got %v", wantErr, err)
	}
	if _, err := service.List(ctx); !errors.Is(err, wantErr) {
		t.Errorf("List: expected %v, got %v", wantErr, err)
	}
	if _, err := service.FindByID(ctx, "project-id"); !errors.Is(err, wantErr) {
		t.Errorf("FindByID: expected %v, got %v", wantErr, err)
	}
	if err := service.Rename(ctx, "project-id", "New name"); !errors.Is(err, wantErr) {
		t.Errorf("Rename: expected %v, got %v", wantErr, err)
	}
	if err := service.Delete(ctx, "project-id"); !errors.Is(err, wantErr) {
		t.Errorf("Delete: expected %v, got %v", wantErr, err)
	}
}
