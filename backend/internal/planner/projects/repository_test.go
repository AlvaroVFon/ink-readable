// Package projects
package projects

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/glebarez/go-sqlite"

	sqlc "ink-readable/internal/sqlc/generated"
)

func newTestRepository(t *testing.T) (*ProjectsRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE projects (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		deleted_at TEXT
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return NewProjectsRepository(*sqlc.New(db)), db
}

func getProject(t *testing.T, db *sql.DB, id string) (name, createdAt, updatedAt string, deletedAt sql.NullString) {
	t.Helper()

	err := db.QueryRowContext(
		context.Background(),
		"SELECT name, created_at, updated_at, deleted_at FROM projects WHERE id = ?", id,
	).Scan(&name, &createdAt, &updatedAt, &deletedAt)
	if err != nil {
		t.Fatalf("select project: %v", err)
	}

	return name, createdAt, updatedAt, deletedAt
}

func countProjects(t *testing.T, db *sql.DB) int {
	t.Helper()

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM projects").Scan(&count); err != nil {
		t.Fatalf("count projects: %v", err)
	}

	return count
}

func TestProjectsRepository_Create(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC()
	project := Project{
		ID:        "project-id",
		Name:      "Reading",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	name, createdAt, updatedAt, deletedAt := getProject(t, db, project.ID)
	if name != project.Name {
		t.Errorf("expected name %q, got %q", project.Name, name)
	}
	if want := project.CreatedAt.Format(time.RFC3339Nano); createdAt != want {
		t.Errorf("expected created_at %q, got %q", want, createdAt)
	}
	if want := project.UpdatedAt.Format(time.RFC3339Nano); updatedAt != want {
		t.Errorf("expected updated_at %q, got %q", want, updatedAt)
	}
	if deletedAt.Valid {
		t.Errorf("expected deleted_at to be NULL, got %q", deletedAt.String)
	}
}

func TestProjectsRepository_Create_DuplicateName(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC()
	if err := repo.Create(ctx, Project{ID: "project-a", Name: "Reading", CreatedAt: now, UpdatedAt: now}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := repo.Create(ctx, Project{ID: "project-b", Name: "Reading", CreatedAt: now, UpdatedAt: now}); err == nil {
		t.Fatal("expected unique constraint error, got nil")
	}

	if count := countProjects(t, db); count != 1 {
		t.Errorf("expected single project to remain, got %d", count)
	}
}

func TestProjectsRepository_List(t *testing.T) {
	repo, _ := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	first := Project{ID: "project-a", Name: "Alpha", CreatedAt: createdAt, UpdatedAt: createdAt}
	second := Project{ID: "project-b", Name: "Beta", CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, first); err != nil {
		t.Fatalf("create project %q: %v", first.ID, err)
	}
	if err := repo.Create(ctx, second); err != nil {
		t.Fatalf("create project %q: %v", second.ID, err)
	}

	projects, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}

	byID := make(map[string]Project, len(projects))
	for _, project := range projects {
		byID[project.ID] = project
	}

	if got := byID[first.ID]; got.Name != first.Name || !got.CreatedAt.Equal(createdAt) || !got.UpdatedAt.Equal(createdAt) {
		t.Errorf("unexpected first project: %+v", got)
	}
	if got := byID[second.ID]; got.Name != second.Name || !got.CreatedAt.Equal(createdAt) || !got.UpdatedAt.Equal(createdAt) {
		t.Errorf("unexpected second project: %+v", got)
	}
}

func TestProjectsRepository_List_Empty(t *testing.T) {
	repo, _ := newTestRepository(t)

	projects, err := repo.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if projects == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(projects) != 0 {
		t.Errorf("expected no projects, got %d", len(projects))
	}
}

func TestProjectsRepository_List_ExcludesDeleted(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	if err := repo.Create(ctx, Project{ID: "active-id", Name: "Active", CreatedAt: createdAt, UpdatedAt: createdAt}); err != nil {
		t.Fatalf("create active project: %v", err)
	}

	deletedAt := time.Now().UTC().Add(-time.Minute)
	if _, err := db.Exec(`INSERT INTO projects (id, name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?)`,
		"deleted-id", "Deleted", createdAt.Format(time.RFC3339Nano), createdAt.Format(time.RFC3339Nano), deletedAt.Format(time.RFC3339Nano)); err != nil {
		t.Fatalf("insert deleted project: %v", err)
	}

	projects, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(projects) != 1 {
		t.Fatalf("expected 1 active project, got %d", len(projects))
	}
	if projects[0].ID != "active-id" {
		t.Errorf("expected project %q, got %q", "active-id", projects[0].ID)
	}
}

func TestProjectsRepository_List_InvalidTimestamp(t *testing.T) {
	tests := []struct {
		name      string
		createdAt string
		updatedAt string
	}{
		{name: "invalid created_at", createdAt: "not-a-time", updatedAt: time.Now().UTC().Format(time.RFC3339Nano)},
		{name: "invalid updated_at", createdAt: time.Now().UTC().Format(time.RFC3339Nano), updatedAt: "not-a-time"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, db := newTestRepository(t)

			if _, err := db.Exec(`INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
				"project-id", "Reading", tt.createdAt, tt.updatedAt); err != nil {
				t.Fatalf("insert project: %v", err)
			}

			if _, err := repo.List(context.Background()); err == nil {
				t.Fatal("expected parse error, got nil")
			}
		})
	}
}

func TestProjectsRepository_List_QueryError(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	repo := NewProjectsRepository(*sqlc.New(db))

	if _, err := repo.List(context.Background()); err == nil {
		t.Fatal("expected query error, got nil")
	}
}

func TestProjectsRepository_Rename(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	project := Project{ID: "project-id", Name: "Old name", CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("unexpected error creating project: %v", err)
	}

	if err := repo.Rename(ctx, project.ID, "New name"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	name, gotCreatedAt, updatedAt, _ := getProject(t, db, project.ID)
	if name != "New name" {
		t.Errorf("expected name %q, got %q", "New name", name)
	}
	if want := createdAt.Format(time.RFC3339Nano); gotCreatedAt != want {
		t.Errorf("expected created_at to remain %q, got %q", want, gotCreatedAt)
	}
	if updatedAt == createdAt.Format(time.RFC3339Nano) {
		t.Error("expected updated_at to be refreshed")
	}
	if _, err := time.Parse(time.RFC3339Nano, updatedAt); err != nil {
		t.Errorf("expected updated_at to be RFC3339Nano, got %q: %v", updatedAt, err)
	}
}

func TestProjectsRepository_Rename_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.Rename(context.Background(), "", "New name"); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestProjectsRepository_Rename_EmptyName(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC()
	project := Project{ID: "project-id", Name: "Reading", CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("unexpected error creating project: %v", err)
	}

	if err := repo.Rename(ctx, project.ID, ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}

	if name, _, _, _ := getProject(t, db, project.ID); name != "Reading" {
		t.Errorf("expected name to remain %q, got %q", "Reading", name)
	}
}

func TestProjectsRepository_Delete(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	project := Project{ID: "project-id", Name: "Reading", CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("unexpected error creating project: %v", err)
	}

	if err := repo.Delete(ctx, project.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if count := countProjects(t, db); count != 1 {
		t.Fatalf("expected project to remain persisted, got %d rows", count)
	}

	_, _, updatedAt, deletedAt := getProject(t, db, project.ID)
	if updatedAt == createdAt.Format(time.RFC3339Nano) {
		t.Error("expected updated_at to be refreshed")
	}
	if _, err := time.Parse(time.RFC3339Nano, updatedAt); err != nil {
		t.Errorf("expected updated_at to be RFC3339Nano, got %q: %v", updatedAt, err)
	}
	if !deletedAt.Valid {
		t.Error("expected deleted_at to be set")
	}
	if _, err := time.Parse(time.RFC3339Nano, deletedAt.String); err != nil {
		t.Errorf("expected deleted_at to be RFC3339Nano, got %q: %v", deletedAt.String, err)
	}
}

func TestProjectsRepository_Delete_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.Delete(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestProjectsRepository_FindByID(t *testing.T) {
	repo, _ := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	project := Project{ID: "project-id", Name: "Reading", CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("unexpected error creating project: %v", err)
	}

	found, err := repo.FindByID(ctx, project.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if found.ID != project.ID {
		t.Errorf("expected id %q, got %q", project.ID, found.ID)
	}
	if found.Name != project.Name {
		t.Errorf("expected name %q, got %q", project.Name, found.Name)
	}
	if !found.CreatedAt.Equal(project.CreatedAt) {
		t.Errorf("expected created_at %v, got %v", project.CreatedAt, found.CreatedAt)
	}
	if !found.UpdatedAt.Equal(project.UpdatedAt) {
		t.Errorf("expected updated_at %v, got %v", project.UpdatedAt, found.UpdatedAt)
	}
}

func TestProjectsRepository_FindByID_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.FindByID(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestProjectsRepository_FindByID_NotFound(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.FindByID(context.Background(), "missing"); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}
