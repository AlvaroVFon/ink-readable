package vaults

import (
	"context"
)

type (
	repository interface {
		Create(ctx context.Context, vault Vault) error
		FindActive(ctx context.Context) ([]Vault, error)
		FindDeleted(ctx context.Context) ([]Vault, error)
		FindByID(ctx context.Context, id string) (*Vault, error)
		Rename(ctx context.Context, id, name string) error
		Delete(ctx context.Context, id string) error
	}
)

type VaultsService struct {
	vaultsRepository repository
}

func NewVaultsService(repo repository) *VaultsService {
	return &VaultsService{
		vaultsRepository: repo,
	}
}

func (s *VaultsService) Create(ctx context.Context, vault Vault) error {
	return s.vaultsRepository.Create(ctx, vault)
}

func (s *VaultsService) FindActive(ctx context.Context) ([]Vault, error) {
	return s.vaultsRepository.FindActive(ctx)
}

func (s *VaultsService) FindDeleted(ctx context.Context) ([]Vault, error) {
	return s.vaultsRepository.FindDeleted(ctx)
}

func (s *VaultsService) FindByID(ctx context.Context, id string) (*Vault, error) {
	return s.vaultsRepository.FindByID(ctx, id)
}

func (s *VaultsService) Rename(ctx context.Context, id, name string) error {
	return s.vaultsRepository.Rename(ctx, id, name)
}

func (s *VaultsService) Delete(ctx context.Context, id string) error {
	return s.vaultsRepository.Delete(ctx, id)
}
