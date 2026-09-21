package projects

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type ProjectsRepository struct {
	Store sqlc.Queries
}

func (p *Project) toCreateProjectParams() sqlc.CreateProjectParams {
	return sqlc.CreateProjectParams{
		ID:        p.ID,
		Name:      p.Name,
		CreatedAt: p.CreatedAt.Format(time.RFC3339Nano),
		UpdatedAt: p.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func NewProjectsRepository(queries sqlc.Queries) *ProjectsRepository {
	return &ProjectsRepository{
		Store: queries,
	}
}

func (r *ProjectsRepository) Create(ctx context.Context, project Project) error {
	params := project.toCreateProjectParams()
	return r.Store.CreateProject(ctx, params)
}

func (r *ProjectsRepository) List(ctx context.Context) ([]Project, error) {
	rows, err := r.Store.ListActiveProjects(ctx)
	if err != nil {
		return nil, err
	}

	projects := make([]Project, 0, len(rows))
	for _, row := range rows {
		project, err := toProject(row)
		if err != nil {
			return nil, err
		}
		projects = append(projects, *project)
	}

	return projects, nil
}

func (r *ProjectsRepository) FindByID(ctx context.Context, id string) (*Project, error) {
	if id == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}

	row, err := r.Store.GetProject(ctx, id)
	if err != nil {
		return nil, err
	}

	return toProject(row)
}

func toProject(row sqlc.Project) (*Project, error) {
	createdAt, err := time.Parse(time.RFC3339Nano, row.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse project created_at: %w", err)
	}

	updatedAt, err := time.Parse(time.RFC3339Nano, row.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse project updated_at: %w", err)
	}

	var deletedAt time.Time
	if row.DeletedAt.Valid {
		deletedAt, err = time.Parse(time.RFC3339Nano, row.DeletedAt.String)
		if err != nil {
			return nil, fmt.Errorf("parse project deleted_at: %w", err)
		}
	}

	return &Project{
		ID:        row.ID,
		Name:      row.Name,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
		DeletedAt: deletedAt,
	}, nil
}

func (r *ProjectsRepository) Rename(ctx context.Context, id, name string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}
	if name == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "name")
	}

	updatedAt := time.Now().UTC().UTC().Format(time.RFC3339Nano)
	params := sqlc.UpdateProjectNameParams{
		ID:        id,
		Name:      name,
		UpdatedAt: updatedAt,
	}

	return r.Store.UpdateProjectName(ctx, params)
}

func (r *ProjectsRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgumentError, "id")
	}

	now := time.Now().UTC().Format(time.RFC3339Nano)
	params := sqlc.DeleteProjectParams{
		ID:        id,
		UpdatedAt: now,
		DeletedAt: sql.NullString{String: now, Valid: true},
	}

	return r.Store.DeleteProject(ctx, params)
}
