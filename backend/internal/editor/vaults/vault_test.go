// Package vaults
package vaults

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewVault(t *testing.T) {
	before := time.Now()
	vault, err := NewVault("Reading")
	after := time.Now()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if vault == nil {
		t.Fatal("expected non-nil vault")
	}

	if _, err := uuid.Parse(vault.ID); err != nil {
		t.Errorf("expected a valid uuid, got %q: %v", vault.ID, err)
	}
	if vault.Name != "Reading" {
		t.Errorf("expected name %q, got %q", "Reading", vault.Name)
	}
	if vault.Deleted {
		t.Error("expected Deleted to be false")
	}
	if vault.CreatedAt.Before(before) || vault.CreatedAt.After(after) {
		t.Errorf("expected CreatedAt between %v and %v, got %v", before, after, vault.CreatedAt)
	}
	if vault.UpdatedAt.Before(before) || vault.UpdatedAt.After(after) {
		t.Errorf("expected UpdatedAt between %v and %v, got %v", before, after, vault.UpdatedAt)
	}
}

func TestNewVault_UniqueIDs(t *testing.T) {
	first, err := NewVault("first")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := NewVault("second")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if first.ID == second.ID {
		t.Errorf("expected unique ids, got %q twice", first.ID)
	}
}

func TestNewVault_EmptyName(t *testing.T) {
	vault, err := NewVault("")

	if !errors.Is(err, ErrInvalidEmptyArgument) {
		t.Fatalf("expected ErrInvalidEmptyArgument, got %v", err)
	}
	if vault != nil {
		t.Errorf("expected nil vault, got %+v", vault)
	}
}

func TestVault_ToCreateVaultParams(t *testing.T) {
	createdAt := time.Date(2026, time.January, 2, 3, 4, 5, 6, time.UTC)
	updatedAt := time.Date(2026, time.February, 3, 4, 5, 6, 7, time.UTC)

	tests := []struct {
		name        string
		deleted     bool
		wantDeleted int64
	}{
		{name: "active vault", deleted: false, wantDeleted: 0},
		{name: "deleted vault", deleted: true, wantDeleted: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vault := Vault{
				ID:        "vault-id",
				Name:      "Reading",
				Deleted:   tt.deleted,
				CreatedAt: createdAt,
				UpdatedAt: updatedAt,
			}

			params := vault.ToCreateVaultParams()

			if params.ID != vault.ID {
				t.Errorf("expected ID %q, got %q", vault.ID, params.ID)
			}
			if params.Name != vault.Name {
				t.Errorf("expected Name %q, got %q", vault.Name, params.Name)
			}
			if params.Deleted != tt.wantDeleted {
				t.Errorf("expected Deleted %d, got %d", tt.wantDeleted, params.Deleted)
			}
			if want := createdAt.Format(time.RFC3339Nano); params.CreatedAt != want {
				t.Errorf("expected CreatedAt %q, got %q", want, params.CreatedAt)
			}
			if want := updatedAt.Format(time.RFC3339Nano); params.UpdatedAt != want {
				t.Errorf("expected UpdatedAt %q, got %q", want, params.UpdatedAt)
			}
		})
	}
}
