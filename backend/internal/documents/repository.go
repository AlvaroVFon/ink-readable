package documents

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ink-readable/internal/database"
	sqlc "ink-readable/internal/sqlc/generated"
)

type DocumentsRepository struct {
	Store sqlc.Queries
	DB    *sql.DB
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

func NewDocumentsRepository(queries sqlc.Queries, db *sql.DB) *DocumentsRepository {
	return &DocumentsRepository{
		Store: queries,
		DB:    db,
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

func (r *DocumentsRepository) FindByID(ctx context.Context, id string) (*Document, error) {
	if id == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}

	row, err := r.Store.GetDocument(ctx, id)
	if err != nil {
		return nil, err
	}
	return toDocument(row)
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

func (r *DocumentsRepository) RenamePath(ctx context.Context, vaultID, oldPath, newPath string) error {
	if vaultID == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "vaultID")
	}
	if oldPath == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "oldPath")
	}
	if newPath == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "newPath")
	}

	return r.Store.UpdateDocumentPaths(ctx, sqlc.UpdateDocumentPathsParams{
		NewPath:   newPath,
		OldPath:   oldPath,
		UpdatedAt: time.Now().Format(time.RFC3339Nano),
		VaultID:   vaultID,
	})
}

func (r *DocumentsRepository) Move(ctx context.Context, id, path string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if path == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "path")
	}

	return r.Store.MoveDocument(ctx, sqlc.MoveDocumentParams{
		ID:        id,
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
		document, err := toDocument(row)
		if err != nil {
			return nil, err
		}
		documents = append(documents, *document)
	}

	return documents, nil
}

func toDocument(row sqlc.Document) (*Document, error) {
	createdAt, err := time.Parse(time.RFC3339Nano, row.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse document created_at: %w", err)
	}
	updatedAt, err := time.Parse(time.RFC3339Nano, row.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse document updated_at: %w", err)
	}
	return &Document{
		ID:        row.ID,
		Name:      row.Name,
		VauldID:   row.VaultID,
		Path:      row.Path,
		Content:   row.Content,
		Deleted:   row.Deleted != 0,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}

func (r *DocumentsRepository) UpdateDocumentContent(ctx context.Context, id, content string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
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

func (r *DocumentsRepository) DeletePermanently(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if r.DB == nil {
		return fmt.Errorf("database is required for permanent document deletion")
	}

	return database.WithTransaction(ctx, r.DB, func(q *sqlc.Queries) error {
		if err := q.DeleteDocumentLinksByDocument(ctx, sqlc.DeleteDocumentLinksByDocumentParams{
			DocumentAID: id,
			DocumentBID: id,
		}); err != nil {
			return fmt.Errorf("delete document links: %w", err)
		}
		if err := q.DeleteDocumentPermanently(ctx, id); err != nil {
			return fmt.Errorf("delete document: %w", err)
		}
		return nil
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
