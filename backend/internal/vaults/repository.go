package vaults

import (
	"context"
	"fmt"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type VaultsRepository struct {
	Store sqlc.Queries
}

func NewVaultRepository(store sqlc.Queries) *VaultsRepository {
	return &VaultsRepository{
		Store: store,
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

func (r *VaultsRepository) UpdateName(ctx context.Context, id, name string) error {
	if name == "" {
		return fmt.Errorf("%w: %q", ErrInvalidEmptyArgument, "name")
	}

	updatedAt := time.Now().String()

	return r.Store.UpdateVaultName(ctx, sqlc.UpdateVaultNameParams{
		ID:        id,
		Name:      name,
		UpdatedAt: updatedAt,
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
