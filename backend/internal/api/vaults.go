package api

import (
	"ink-readable/internal/editor/vaults"
	"ink-readable/internal/httpx"
	"net/http"
)

type vaultResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Deleted   bool   `json:"deleted"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type createVaultRequest struct {
	Name string `json:"name"`
}

type renameVaultRequest struct {
	Name string `json:"name"`
}

func (h *Handler) listVaults(w http.ResponseWriter, r *http.Request) {
	items, err := h.vaults.FindActive(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapVaults(items))
}

func (h *Handler) listDeletedVaults(w http.ResponseWriter, r *http.Request) {
	items, err := h.vaults.FindDeleted(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapVaults(items))
}

func (h *Handler) createVault(w http.ResponseWriter, r *http.Request) {
	var request createVaultRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	vault, err := vaults.NewVault(request.Name)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if err := h.vaults.Create(r.Context(), *vault); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapVault(*vault))
}

func (h *Handler) getVault(w http.ResponseWriter, r *http.Request) {
	vault, err := h.vaults.FindByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapVault(*vault))
}

func (h *Handler) renameVault(w http.ResponseWriter, r *http.Request) {
	var request renameVaultRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.vaults.Rename(r.Context(), r.PathValue("id"), request.Name); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteVault(w http.ResponseWriter, r *http.Request) {
	if err := h.vaults.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapVaults(items []vaults.Vault) []vaultResponse {
	result := make([]vaultResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapVault(item))
	}
	return result
}

func mapVault(item vaults.Vault) vaultResponse {
	return vaultResponse{
		ID:        item.ID,
		Name:      item.Name,
		Deleted:   item.Deleted,
		CreatedAt: item.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		UpdatedAt: item.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
	}
}
