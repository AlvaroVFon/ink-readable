package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"

	"ink-readable/internal/documents"
	"ink-readable/internal/httpx"
	"ink-readable/internal/vaults"
)

type (
	vaultService interface {
		Create(context.Context, vaults.Vault) error
		FindActive(context.Context) ([]vaults.Vault, error)
		FindDeleted(context.Context) ([]vaults.Vault, error)
		FindByID(context.Context, string) (*vaults.Vault, error)
		Rename(context.Context, string, string) error
		Delete(context.Context, string) error
	}
	documentService interface {
		Create(context.Context, documents.Document) error
		FindActive(context.Context, string) ([]documents.Document, error)
		FindDeleted(context.Context, string) ([]documents.Document, error)
		FindByID(context.Context, string) (*documents.Document, error)
		Rename(context.Context, string, string, string) error
		Move(context.Context, string, string) error
		UpdateContent(context.Context, string, string) error
		Delete(context.Context, string) error
		DeletePermanently(context.Context, string) error
		Restore(context.Context, string) error
	}
)

type Handler struct {
	vaults    vaultService
	documents documentService
}

func NewHandler(vaultsService vaultService, documentsService documentService) http.Handler {
	handler := &Handler{vaults: vaultsService, documents: documentsService}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/vaults", handler.listVaults)
	mux.HandleFunc("GET /api/v1/vaults/deleted", handler.listDeletedVaults)
	mux.HandleFunc("POST /api/v1/vaults", handler.createVault)
	mux.HandleFunc("GET /api/v1/vaults/{id}", handler.getVault)
	mux.HandleFunc("PATCH /api/v1/vaults/{id}", handler.renameVault)
	mux.HandleFunc("DELETE /api/v1/vaults/{id}", handler.deleteVault)

	mux.HandleFunc("GET /api/v1/vaults/{vaultID}/documents", handler.listDocuments)
	mux.HandleFunc("GET /api/v1/vaults/{vaultID}/documents/deleted", handler.listDeletedDocuments)
	mux.HandleFunc("POST /api/v1/vaults/{vaultID}/documents", handler.createDocument)

	mux.HandleFunc("GET /api/v1/documents/{id}", handler.getDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/rename", handler.renameDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/move", handler.moveDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/content", handler.updateDocumentContent)
	mux.HandleFunc("DELETE /api/v1/documents/{id}", handler.deleteDocument)
	mux.HandleFunc("POST /api/v1/documents/{id}/restore", handler.restoreDocument)
	mux.HandleFunc("DELETE /api/v1/documents/{id}/permanent", handler.deleteDocumentPermanently)

	return httpx.CORS(mux)
}

func writeServiceError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	if errors.Is(err, sql.ErrNoRows) {
		status = http.StatusNotFound
	}
	if errors.Is(err, vaults.ErrInvalidEmptyArgument) || errors.Is(err, documents.ErrInvalidEmptyArgument) {
		status = http.StatusBadRequest
	}
	httpx.Error(w, status, err)
}
