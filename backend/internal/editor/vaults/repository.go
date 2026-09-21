package vaults

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ink-readable/internal/database"
	sqlc "ink-readable/internal/sqlc/generated"
)

type VaultsRepository struct {
	Store sqlc.Queries
	DB    *sql.DB
}

func NewVaultRepository(store sqlc.Queries, db *sql.DB) *VaultsRepository {
	return &VaultsRepository{
		Store: store,
		DB:    db,
	}
}

func (r *Vault) ToCreateVaultParams() sqlc.CreateVaultParams {
	deleted := 0
	if r.Deleted {
		deleted = 1
	}

	return sqlc.CreateVaultParams{
		ID:        r.ID,
		Name:      r.Name,
		Deleted:   int64(deleted),
		CreatedAt: r.CreatedAt.Format(time.RFC3339Nano),
		UpdatedAt: r.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func (r *VaultsRepository) Create(ctx context.Context, vault Vault) error {
	createVaultParams := vault.ToCreateVaultParams()
	return r.Store.CreateVault(ctx, createVaultParams)
}

func (r *VaultsRepository) FindActive(ctx context.Context) ([]Vault, error) {
	return r.findByDeleted(ctx, false)
}

func (r *VaultsRepository) FindDeleted(ctx context.Context) ([]Vault, error) {
	return r.findByDeleted(ctx, true)
}

func (r *VaultsRepository) findByDeleted(ctx context.Context, deleted bool) ([]Vault, error) {
	deletedValue := int64(0)
	if deleted {
		deletedValue = 1
	}

	rows, err := r.Store.ListVaultsByDeleted(ctx, deletedValue)
	if err != nil {
		return nil, err
	}

	vaults := make([]Vault, 0, len(rows))
	for _, row := range rows {
		vault, err := toVault(row)
		if err != nil {
			return nil, err
		}
		vaults = append(vaults, *vault)
	}
	return vaults, nil
}

func (r *VaultsRepository) FindByID(ctx context.Context, id string) (*Vault, error) {
	if id == "" {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}

	row, err := r.Store.GetVault(ctx, id)
	if err != nil {
		return nil, err
	}
	return toVault(row)
}

func toVault(row sqlc.Vault) (*Vault, error) {
	createdAt, err := time.Parse(time.RFC3339Nano, row.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse vault created_at: %w", err)
	}
	updatedAt, err := time.Parse(time.RFC3339Nano, row.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("parse vault updated_at: %w", err)
	}
	return &Vault{
		ID:        row.ID,
		Name:      row.Name,
		Deleted:   row.Deleted != 0,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}

func (r *VaultsRepository) Rename(ctx context.Context, id, name string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if name == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "name")
	}
	if r.DB == nil {
		return fmt.Errorf("database is required for vault rename")
	}

	updatedAt := time.Now().Format(time.RFC3339Nano)

	return database.WithTransaction(ctx, r.DB, func(q *sqlc.Queries) error {
		oldName, err := q.GetVaultName(ctx, id)
		if err != nil {
			return fmt.Errorf("get vault name: %w", err)
		}

		oldPath := "/" + oldName
		newPath := "/" + name

		if err := q.UpdateDocumentPaths(ctx, sqlc.UpdateDocumentPathsParams{
			NewPath:   newPath,
			OldPath:   oldPath,
			UpdatedAt: updatedAt,
			VaultID:   id,
		}); err != nil {
			return fmt.Errorf("update document paths: %w", err)
		}

		if err := q.UpdateVaultName(ctx, sqlc.UpdateVaultNameParams{
			ID:        id,
			Name:      name,
			UpdatedAt: updatedAt,
		}); err != nil {
			return fmt.Errorf("update vault name: %w", err)
		}

		return nil
	})
}

func (r *VaultsRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "id")
	}
	if r.DB == nil {
		return fmt.Errorf("database is required for vault deletion")
	}

	return database.WithTransaction(ctx, r.DB, func(q *sqlc.Queries) error {
		if err := q.DeleteDocumentLinksByVault(ctx, sqlc.DeleteDocumentLinksByVaultParams{
			VaultID:   id,
			VaultID_2: id,
		}); err != nil {
			return fmt.Errorf("delete document links: %w", err)
		}
		if err := q.DeleteDocumentsByVault(ctx, id); err != nil {
			return fmt.Errorf("delete documents: %w", err)
		}
		if err := q.DeleteVaultPermanently(ctx, id); err != nil {
			return fmt.Errorf("delete vault: %w", err)
		}
		return nil
	})
}
