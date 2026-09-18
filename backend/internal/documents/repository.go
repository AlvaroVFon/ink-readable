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

func (r *DocumentsRepository) FindActive(ctx context.Context, vaultID string) ([]Document, error) {
	return r.findByDeleted(ctx, vaultID, false)
}

func (r *DocumentsRepository) FindDeleted(ctx context.Context, vaultID string) ([]Document, error) {
	return r.findByDeleted(ctx, vaultID, true)
}

func (r *DocumentsRepository) Rename(ctx context.Context, id, name, path string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if name == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "name")
	}
	if path == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "path")
	}

	return r.Store.RenameDocument(ctx, sqlc.RenameDocumentParams{
		ID:        id,
		Name:      name,
		Path:      path,
		UpdatedAt: time.Now().Format(time.RFC3339Nano),
	})
}

func (r *DocumentsRepository) findByDeleted(ctx context.Context, vaultID string, deleted bool) ([]Document, error) {
	if vaultID == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "vaultID")
	}

	deletedValue := int64(0)
	if deleted {
		deletedValue = 1
	}

	rows, err := r.Store.ListDocumentsByDeleted(ctx, sqlc.ListDocumentsByDeletedParams{
		VaultID: vaultID,
		Deleted: deletedValue,
	})
	if err != nil {
		return nil, err
	}

	documents := make([]Document, 0, len(rows))
	for _, row := range rows {
		createdAt, err := time.Parse(time.RFC3339Nano, row.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("parse document created_at: %w", err)
		}
		updatedAt, err := time.Parse(time.RFC3339Nano, row.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("parse document updated_at: %w", err)
		}

		documents = append(documents, Document{
			ID:        row.ID,
			Name:      row.Name,
			VauldID:   row.VaultID,
			Path:      row.Path,
			Content:   row.Content,
			Deleted:   row.Deleted != 0,
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		})
	}

	return documents, nil
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
