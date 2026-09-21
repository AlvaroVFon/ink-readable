// Package tasks
package tasks

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

func newTestRepository(t *testing.T) (*TasksRepository, *sql.DB) {
	t.Helper()

	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE tasks (
		id          TEXT PRIMARY KEY,
		project_id  TEXT NOT NULL,
		title       TEXT NOT NULL,
		description TEXT,
		status      TEXT NOT NULL,
		position    INTEGER NOT NULL CHECK (position > 0),
		created_at  DATETIME NOT NULL,
		updated_at  DATETIME NOT NULL
	)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return NewTasksRepository(*sqlc.New(db)), db
}

func getTask(t *testing.T, db *sql.DB, id string) (title string, description sql.NullString, status string, position int64, createdAt, updatedAt time.Time) {
	t.Helper()

	err := db.QueryRowContext(
		context.Background(),
		"SELECT title, description, status, position, created_at, updated_at FROM tasks WHERE id = ?", id,
	).Scan(&title, &description, &status, &position, &createdAt, &updatedAt)
	if err != nil {
		t.Fatalf("select task: %v", err)
	}

	return title, description, status, position, createdAt, updatedAt
}

func countTasks(t *testing.T, db *sql.DB) int {
	t.Helper()

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM tasks").Scan(&count); err != nil {
		t.Fatalf("count tasks: %v", err)
	}

	return count
}

func TestTasksRepository_Create(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC()
	task := Task{
		ID:          "task-id",
		ProjectID:   "project-id",
		Title:       "Write tests",
		Description: "Cover the repository",
		Status:      StatusTodo,
		Position:    3,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	title, description, status, position, createdAt, updatedAt := getTask(t, db, task.ID)
	if title != task.Title {
		t.Errorf("expected title %q, got %q", task.Title, title)
	}
	if !description.Valid || description.String != task.Description {
		t.Errorf("expected description %q, got %+v", task.Description, description)
	}
	if status != string(task.Status) {
		t.Errorf("expected status %q, got %q", task.Status, status)
	}
	if position != task.Position {
		t.Errorf("expected position %d, got %d", task.Position, position)
	}
	if !createdAt.Equal(task.CreatedAt) {
		t.Errorf("expected created_at %v, got %v", task.CreatedAt, createdAt)
	}
	if !updatedAt.Equal(task.UpdatedAt) {
		t.Errorf("expected updated_at %v, got %v", task.UpdatedAt, updatedAt)
	}
}

func TestTasksRepository_Create_EmptyDescription(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC()
	task := Task{
		ID:        "task-id",
		ProjectID: "project-id",
		Title:     "Write tests",
		Status:    StatusBacklog,
		Position:  1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, description, _, _, _, _ := getTask(t, db, task.ID)
	if description.Valid {
		t.Errorf("expected description to be NULL, got %q", description.String)
	}
}

func TestTasksRepository_List(t *testing.T) {
	repo, _ := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	first := Task{ID: "task-a", ProjectID: "project-id", Title: "First", Status: StatusTodo, Position: 2, CreatedAt: createdAt, UpdatedAt: createdAt}
	second := Task{ID: "task-b", ProjectID: "project-id", Title: "Second", Status: StatusDone, Position: 1, CreatedAt: createdAt, UpdatedAt: createdAt}
	other := Task{ID: "task-c", ProjectID: "other-project", Title: "Other", Status: StatusBacklog, Position: 3, CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, first); err != nil {
		t.Fatalf("create task %q: %v", first.ID, err)
	}
	if err := repo.Create(ctx, second); err != nil {
		t.Fatalf("create task %q: %v", second.ID, err)
	}
	if err := repo.Create(ctx, other); err != nil {
		t.Fatalf("create task %q: %v", other.ID, err)
	}

	tasks, err := repo.List(ctx, "project-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(tasks))
	}
	if tasks[0].ID != second.ID || tasks[1].ID != first.ID {
		t.Errorf("expected tasks ordered by position, got %q then %q", tasks[0].ID, tasks[1].ID)
	}
	for _, task := range tasks {
		if task.ProjectID != "project-id" {
			t.Errorf("expected only tasks from project-id, got %q", task.ProjectID)
		}
	}
}

func TestTasksRepository_List_Empty(t *testing.T) {
	repo, _ := newTestRepository(t)

	tasks, err := repo.List(context.Background(), "project-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tasks == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(tasks) != 0 {
		t.Errorf("expected no tasks, got %d", len(tasks))
	}
}

func TestTasksRepository_List_EmptyProjectID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.List(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_List_NullDescription(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	if _, err := db.Exec(`INSERT INTO tasks (id, project_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		"task-id", "project-id", "Write tests", nil, "backlog", 1, time.Now().UTC(), time.Now().UTC()); err != nil {
		t.Fatalf("insert task: %v", err)
	}

	tasks, err := repo.List(ctx, "project-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(tasks))
	}
	if tasks[0].Description != "" {
		t.Errorf("expected empty description, got %q", tasks[0].Description)
	}
}

func TestTasksRepository_List_QueryError(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	repo := NewTasksRepository(*sqlc.New(db))

	if _, err := repo.List(context.Background(), "project-id"); err == nil {
		t.Fatal("expected query error, got nil")
	}
}

func TestTasksRepository_UpdateTitle(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Old title", Status: StatusTodo, Position: 1, CreatedAt: createdAt, UpdatedAt: createdAt}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.UpdateTitle(ctx, task.ID, "New title"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	title, _, _, _, _, updatedAt := getTask(t, db, task.ID)
	if title != "New title" {
		t.Errorf("expected title %q, got %q", "New title", title)
	}
	if !updatedAt.After(createdAt) {
		t.Errorf("expected updated_at to be refreshed, got %v", updatedAt)
	}
}

func TestTasksRepository_UpdateTitle_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateTitle(context.Background(), "", "New title"); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_UpdateTitle_EmptyTitle(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateTitle(context.Background(), "task-id", ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_UpdateDescription(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests", Status: StatusTodo, Position: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.UpdateDescription(ctx, task.ID, "New description"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, description, _, _, _, _ := getTask(t, db, task.ID)
	if !description.Valid || description.String != "New description" {
		t.Errorf("expected description %q, got %+v", "New description", description)
	}
}

func TestTasksRepository_UpdateDescription_ClearsDescription(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests", Description: "Initial", Status: StatusTodo, Position: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.UpdateDescription(ctx, task.ID, ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, description, _, _, _, _ := getTask(t, db, task.ID)
	if description.Valid {
		t.Errorf("expected description to be NULL, got %q", description.String)
	}
}

func TestTasksRepository_UpdateDescription_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateDescription(context.Background(), "", "New description"); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_UpdateStatus(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests", Status: StatusBacklog, Position: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.UpdateStatus(ctx, task.ID, StatusInProgress); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, status, _, _, updatedAt := getTask(t, db, task.ID)
	if status != string(StatusInProgress) {
		t.Errorf("expected status %q, got %q", StatusInProgress, status)
	}
	if !updatedAt.After(now) {
		t.Errorf("expected updated_at to be refreshed, got %v", updatedAt)
	}
}

func TestTasksRepository_UpdateStatus_Invalid(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateStatus(context.Background(), "task-id", Status("unknown")); !errors.Is(err, ErrInvalidStatusError) {
		t.Fatalf("expected ErrInvalidStatusError, got %v", err)
	}
}

func TestTasksRepository_UpdateStatus_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdateStatus(context.Background(), "", StatusDone); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_UpdatePosition(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests", Status: StatusTodo, Position: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.UpdatePosition(ctx, task.ID, 5); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, _, position, _, updatedAt := getTask(t, db, task.ID)
	if position != 5 {
		t.Errorf("expected position 5, got %d", position)
	}
	if !updatedAt.After(now) {
		t.Errorf("expected updated_at to be refreshed, got %v", updatedAt)
	}
}

func TestTasksRepository_UpdatePosition_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.UpdatePosition(context.Background(), "", 5); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_UpdatePosition_InvalidPosition(t *testing.T) {
	repo, _ := newTestRepository(t)

	for _, position := range []int64{0, -1} {
		if err := repo.UpdatePosition(context.Background(), "task-id", position); !errors.Is(err, ErrInvalidPositionError) {
			t.Fatalf("expected ErrInvalidPositionError for position %d, got %v", position, err)
		}
	}
}

func TestTasksRepository_Delete(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	now := time.Now().UTC().Add(-time.Hour)
	task := Task{ID: "task-id", ProjectID: "project-id", Title: "Write tests", Status: StatusTodo, Position: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	if err := repo.Delete(ctx, task.ID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if count := countTasks(t, db); count != 0 {
		t.Fatalf("expected task to be removed, got %d rows", count)
	}
}

func TestTasksRepository_Delete_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if err := repo.Delete(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_FindByID(t *testing.T) {
	repo, _ := newTestRepository(t)
	ctx := context.Background()

	createdAt := time.Now().UTC().Add(-time.Hour)
	task := Task{
		ID:          "task-id",
		ProjectID:   "project-id",
		Title:       "Write tests",
		Description: "Cover the repository",
		Status:      StatusTodo,
		Position:    2,
		CreatedAt:   createdAt,
		UpdatedAt:   createdAt,
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("unexpected error creating task: %v", err)
	}

	found, err := repo.FindByID(ctx, task.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if found.ID != task.ID {
		t.Errorf("expected id %q, got %q", task.ID, found.ID)
	}
	if found.ProjectID != task.ProjectID {
		t.Errorf("expected project_id %q, got %q", task.ProjectID, found.ProjectID)
	}
	if found.Title != task.Title {
		t.Errorf("expected title %q, got %q", task.Title, found.Title)
	}
	if found.Description != task.Description {
		t.Errorf("expected description %q, got %q", task.Description, found.Description)
	}
	if found.Status != task.Status {
		t.Errorf("expected status %q, got %q", task.Status, found.Status)
	}
	if found.Position != task.Position {
		t.Errorf("expected position %d, got %d", task.Position, found.Position)
	}
	if !found.CreatedAt.Equal(task.CreatedAt) {
		t.Errorf("expected created_at %v, got %v", task.CreatedAt, found.CreatedAt)
	}
	if !found.UpdatedAt.Equal(task.UpdatedAt) {
		t.Errorf("expected updated_at %v, got %v", task.UpdatedAt, found.UpdatedAt)
	}
}

func TestTasksRepository_FindByID_NullDescription(t *testing.T) {
	repo, db := newTestRepository(t)
	ctx := context.Background()

	if _, err := db.Exec(`INSERT INTO tasks (id, project_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		"task-id", "project-id", "Write tests", nil, "backlog", 1, time.Now().UTC(), time.Now().UTC()); err != nil {
		t.Fatalf("insert task: %v", err)
	}

	found, err := repo.FindByID(ctx, "task-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if found.Description != "" {
		t.Errorf("expected empty description, got %q", found.Description)
	}
}

func TestTasksRepository_FindByID_EmptyID(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.FindByID(context.Background(), ""); !errors.Is(err, ErrInvalidEmptyArgumentError) {
		t.Fatalf("expected ErrInvalidEmptyArgumentError, got %v", err)
	}
}

func TestTasksRepository_FindByID_NotFound(t *testing.T) {
	repo, _ := newTestRepository(t)

	if _, err := repo.FindByID(context.Background(), "missing"); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}
