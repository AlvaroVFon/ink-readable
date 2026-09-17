package trashs

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type TrashRepository struct {
	Store sqlc.Queries
}

func (ti *TrashItem) ToCreateTrashItemParams() *sqlc.CreateTrashItemParams {
	var parentID sql.NullString

	if ti.ParentID != nil {
		parentID = sql.NullString{
			String: *ti.ParentID,
			Valid:  true,
		}
	}

	return &sqlc.CreateTrashItemParams{
		ID:           ti.ID,
		VaultID:      ti.VaultID,
		ResourceType: string(ti.ResourceType),
		Path:         ti.Path,
		ParentID:     parentID,
		ResourceID:   ti.ResourceID,
		DeletedAt:    ti.DeletedAt.Format(time.RFC3339Nano),
	}
}

func NewTrashRepository(queries sqlc.Queries) *TrashRepository {
	return &TrashRepository{
		Store: queries,
	}
}

func (r *TrashRepository) Create(ctx context.Context, item TrashItem) error {
	trashItemsParams := item.ToCreateTrashItemParams()
	return r.Store.CreateTrashItem(ctx, *trashItemsParams)
}

func (r *TrashRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	return r.Store.DeleteTrashItem(ctx, id)
}
