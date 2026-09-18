package documents

import (
	"context"
	"fmt"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type DocumentsRepository struct {
	Store sqlc.Queries
}

func (d *Document) toCreateDocumentParams() *sqlc.CreateDocumentParams {
	return &sqlc.CreateDocumentParams{
		ID:        d.ID,
		Name:      d.Name,
		Path:      d.Path,
		VaultID:   d.VauldID,
		Content:   d.Content,
		CreatedAt: d.CreatedAt.Format(time.RFC3339Nano),
		UpdatedAt: d.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func NewDocumentsRepository(queries sqlc.Queries) *DocumentsRepository {
	return &DocumentsRepository{
		Store: queries,
	}
}

func (r *DocumentsRepository) Create(ctx context.Context, document Document) error {
	createDocumentParams := document.toCreateDocumentParams()
	return r.Store.CreateDocument(ctx, *createDocumentParams)
}

func (r *DocumentsRepository) UpdateDocumentContent(ctx context.Context, id, content string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if content == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "content")
	}

	updatedAt := time.Now()
	return r.Store.UpdateDocumentContent(ctx, sqlc.UpdateDocumentContentParams{
		ID:        id,
		Content:   content,
		UpdatedAt: updatedAt.Format(time.RFC3339Nano),
	})
}

func (r *DocumentsRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}

	updatedAt := time.Now()

	return r.Store.DeleteDocument(ctx, sqlc.DeleteDocumentParams{
		ID:        id,
		UpdatedAt: updatedAt.Format(time.RFC3339Nano),
	})
}

func (r *DocumentsRepository) Restore(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}

	updatedAt := time.Now()

	return r.Store.RestoreDocument(ctx, sqlc.RestoreDocumentParams{
		ID:        id,
		UpdatedAt: updatedAt.Format(time.RFC3339Nano),
	})
}
