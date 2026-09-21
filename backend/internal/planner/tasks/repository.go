package tasks

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type TasksRepository struct {
	Store sqlc.Queries
}

func NewTasksRepository(queries sqlc.Queries) *TasksRepository {
	return &TasksRepository{
		Store: queries,
	}
}

func (t *Task) toCreateTaskParams() sqlc.CreateTaskParams {
	return sqlc.CreateTaskParams{
		ID:          t.ID,
		ProjectID:   t.ProjectID,
		Title:       t.Title,
		Description: toNullString(t.Description),
		Status:      string(t.Status),
		Position:    t.Position,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

func toNullString(value string) sql.NullString {
	return sql.NullString{String: value, Valid: value != ""}
}

func (r *TasksRepository) Create(ctx context.Context, task Task) error {
	params := task.toCreateTaskParams()
	return r.Store.CreateTask(ctx, params)
}

func (r *TasksRepository) List(ctx context.Context, projectID string) ([]Task, error) {
	if projectID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "projectID")
	}

	rows, err := r.Store.ListTasks(ctx, projectID)
	if err != nil {
		return nil, err
	}

	tasks := make([]Task, 0, len(rows))
	for _, row := range rows {
		tasks = append(tasks, toTask(row))
	}

	return tasks, nil
}

func (r *TasksRepository) FindByID(ctx context.Context, id string) (*Task, error) {
	if id == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}

	row, err := r.Store.GetTask(ctx, id)
	if err != nil {
		return nil, err
	}

	task := toTask(row)
	return &task, nil
}

func toTask(row sqlc.Task) Task {
	return Task{
		ID:          row.ID,
		ProjectID:   row.ProjectID,
		Title:       row.Title,
		Description: row.Description.String,
		Status:      Status(row.Status),
		Position:    row.Position,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}

func (r *TasksRepository) UpdateTitle(ctx context.Context, id, title string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}
	if title == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "title")
	}

	return r.Store.UpdateTaskTitle(ctx, sqlc.UpdateTaskTitleParams{
		ID:        id,
		Title:     title,
		UpdatedAt: time.Now().UTC(),
	})
}

func (r *TasksRepository) UpdateDescription(ctx context.Context, id, description string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}

	return r.Store.UpdateTaskDescription(ctx, sqlc.UpdateTaskDescriptionParams{
		ID:          id,
		Description: toNullString(description),
		UpdatedAt:   time.Now().UTC(),
	})
}

func (r *TasksRepository) UpdateStatus(ctx context.Context, id string, status Status) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}
	if !status.Valid() {
		return fmt.Errorf("%w: %q", ErrInvalidStatusError, status)
	}

	return r.Store.UpdateTaskStatus(ctx, sqlc.UpdateTaskStatusParams{
		ID:        id,
		Status:    string(status),
		UpdatedAt: time.Now().UTC(),
	})
}

func (r *TasksRepository) UpdatePosition(ctx context.Context, id string, position int64) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}
	if position <= 0 {
		return fmt.Errorf("%w: %d", ErrInvalidPositionError, position)
	}

	return r.Store.UpdateTaskPosition(ctx, sqlc.UpdateTaskPositionParams{
		ID:        id,
		Position:  position,
		UpdatedAt: time.Now().UTC(),
	})
}

func (r *TasksRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}

	return r.Store.DeleteTask(ctx, id)
}
