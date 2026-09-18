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

		if err := q.UpdateTrashItemPaths(ctx, sqlc.UpdateTrashItemPathsParams{
			NewPath: newPath,
			OldPath: oldPath,
			VaultID: id,
		}); err != nil {
			return fmt.Errorf("update trash item paths: %w", err)
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

// Delete perform a logic deletion
func (r *VaultsRepository) Delete(ctx context.Context, id string) error {
	updatedAt := time.Now().String()

	return r.Store.DeleteVault(ctx, sqlc.DeleteVaultParams{
		ID:        id,
		UpdatedAt: updatedAt,
	})
}
